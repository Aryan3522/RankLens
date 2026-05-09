import { useListRecommendations, useDismissRecommendation, getListRecommendationsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Priority = "all" | "high" | "medium" | "low";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const IMPACT_COLOR = (impact: number) => {
  if (impact >= 80) return "text-emerald-600";
  if (impact >= 60) return "text-amber-600";
  return "text-blue-600";
};

export default function Reports() {
  const [priority, setPriority] = useState<Priority>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const { data: recommendations, isLoading } = useListRecommendations(
    priority !== "all" ? { priority } : {},
    { query: { queryKey: getListRecommendationsQueryKey(priority !== "all" ? { priority } : {}) } }
  );
  const dismiss = useDismissRecommendation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDismiss = (id: string) => {
    dismiss.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
        toast({ title: "Recommendation dismissed" });
      },
    });
  };

  const visible = recommendations?.filter(r => showDismissed ? true : !r.dismissed);
  const dismissedCount = recommendations?.filter(r => r.dismissed).length ?? 0;

  const tabs: { value: Priority; label: string }[] = [
    { value: "all", label: "All" },
    { value: "high", label: "High Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "low", label: "Low Priority" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-0.5">AI-powered, priority-ranked SEO action items across all analyses</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPriority(value)}
              data-testid={`tab-priority-${value}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                priority === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {dismissedCount > 0 && (
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
            data-testid="button-toggle-dismissed"
          >
            {showDismissed ? "Hide" : "Show"} {dismissedCount} dismissed
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : visible && visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((rec) => (
            <div
              key={rec.id}
              className={`bg-card border border-border rounded-xl p-5 transition-all ${rec.dismissed ? "opacity-50" : ""}`}
              data-testid={`card-rec-${rec.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${PRIORITY_COLORS[rec.priority as keyof typeof PRIORITY_COLORS]}`}>
                    {rec.priority}
                  </span>
                  <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                  <span className={`text-xs font-semibold ${IMPACT_COLOR(rec.estimatedImpact)}`}>
                    +{rec.estimatedImpact} impact
                  </span>
                </div>
                {!rec.dismissed && (
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Dismiss"
                    data-testid={`button-dismiss-${rec.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="font-semibold text-foreground text-sm mb-1.5">{rec.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
              {rec.dismissed && (
                <p className="text-xs text-muted-foreground mt-2 italic">Dismissed</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          {priority !== "all" ? (
            <>
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No {priority} priority recommendations</h3>
              <p className="text-sm text-muted-foreground">Try selecting a different priority filter.</p>
            </>
          ) : (
            <>
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">All caught up</h3>
              <p className="text-sm text-muted-foreground">No active recommendations. Run an analysis to generate new ones.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
