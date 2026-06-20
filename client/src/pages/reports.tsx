import { useListRecommendations, useDismissRecommendation, getListRecommendationsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, FileText, X } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MetricChip } from "@/components/charts/MetricChip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";

type Priority = "all" | "high" | "medium" | "low";

const PRIORITY_HEX: Record<string, string> = { high: "#FF5E7A", medium: "#FFB648", low: "#4F8CFF" };
const impactHex = (impact: number) => (impact >= 80 ? "#29D398" : impact >= 60 ? "#FFB648" : "#4F8CFF");

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/15 text-red-500 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  low: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
};

const IMPACT_COLOR = (impact: number) => {
  if (impact >= 80) return "text-emerald-500";
  if (impact >= 60) return "text-amber-500";
  return "text-cyan-500";
};

export default function Reports() {
  const [priority, setPriority] = useState<Priority>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const { data: recommendations, isLoading } = useListRecommendations(
    priority !== "all" ? { priority } : {},
    { query: { queryKey: getListRecommendationsQueryKey(priority !== "all" ? { priority } : {}) } },
  );
  const dismiss = useDismissRecommendation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDismiss = (id: string) => {
    dismiss.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
          toast({ title: "Recommendation dismissed" });
        },
      },
    );
  };

  const visible = recommendations?.filter((r) => (showDismissed ? true : !r.dismissed));
  const dismissedCount = recommendations?.filter((r) => r.dismissed).length ?? 0;

  const active = recommendations?.filter((r) => !r.dismissed) ?? [];
  const byPriority = {
    high: active.filter((r) => r.priority === "high").length,
    medium: active.filter((r) => r.priority === "medium").length,
    low: active.filter((r) => r.priority === "low").length,
  };
  const avgImpact = active.length ? Math.round(active.reduce((s, r) => s + (r.estimatedImpact ?? 0), 0) / active.length) : 0;
  const pieData = [
    { name: "High", value: byPriority.high, fill: PRIORITY_HEX.high },
    { name: "Medium", value: byPriority.medium, fill: PRIORITY_HEX.medium },
    { name: "Low", value: byPriority.low, fill: PRIORITY_HEX.low },
  ].filter((d) => d.value > 0);

  const tabs: { value: Priority; label: string }[] = [
    { value: "all", label: "All" },
    { value: "high", label: "High Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "low", label: "Low Priority" },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="neon-text-cyan text-3xl font-black tracking-tight text-foreground">Recommendations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Priority-ranked action items across all analyses
        </p>
      </motion.div>

      {!isLoading && active.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col items-center gap-5 rounded-xl border border-white/5 bg-white/[0.02] p-5 sm:flex-row">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                    {pieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center leading-none">
                  <div className="text-2xl font-black text-foreground">{active.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">open</div>
                </div>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricChip value={byPriority.high} label="High" accent="text-[#FF5E7A]" />
              <MetricChip value={byPriority.medium} label="Medium" accent="text-[#FFB648]" />
              <MetricChip value={byPriority.low} label="Low" accent="text-primary" />
              <MetricChip value={`+${avgImpact}`} label="Avg impact" accent="text-emerald-500" />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPriority(value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                priority === value
                  ? "skeu-btn-primary"
                  : "skeu-sm text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {dismissedCount > 0 && (
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
          >
            {showDismissed ? "Hide" : "Show"} {dismissedCount} dismissed
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : visible && visible.length > 0 ? (
        <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="show" className="space-y-3">
          {visible.map((rec) => (
            <motion.div key={rec.id} variants={fadeUp(0, 16)}>
              <div className={cn("rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-white/10", rec.dismissed && "opacity-50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-semibold capitalize",
                        PRIORITY_COLORS[rec.priority as keyof typeof PRIORITY_COLORS],
                      )}
                    >
                      {rec.priority}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {rec.category}
                    </Badge>
                    <span className={cn("text-xs font-semibold", IMPACT_COLOR(rec.estimatedImpact))}>
                      +{rec.estimatedImpact} impact
                    </span>
                  </div>
                  {!rec.dismissed && (
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mb-2 text-sm font-semibold text-foreground">{rec.title}</p>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${rec.estimatedImpact}%`, backgroundColor: impactHex(rec.estimatedImpact) }} />
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{rec.description}</p>
                {rec.dismissed && <p className="mt-2 text-xs italic text-muted-foreground">Dismissed</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20 text-center bg-white/[0.01]">
          {priority !== "all" ? (
            <>
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 font-semibold text-foreground">No {priority} priority recommendations</h3>
              <p className="text-sm text-muted-foreground">Try selecting a different priority filter.</p>
            </>
          ) : (
            <>
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <h3 className="mb-1 font-semibold text-foreground">All caught up</h3>
              <p className="text-sm text-muted-foreground">
                No active recommendations. Run an analysis to generate new ones.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
