import { useGetDashboardSummary, useGetScoreTrend, useGetRecentActivity, useGetIssueBreakdown } from "@/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Globe, Key, AlertTriangle, Clock, Brain, FileCheck, Activity, ShieldCheck, Zap } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerContainer } from "@/lib/motion";

const AXIS = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";
const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(var(--foreground))",
  backdropFilter: "blur(8px)",
} as const;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#4F8CFF",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = "text-primary",
}: {
  label: string;
  value: string | number | null;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div variants={fadeUp(0, 20)}>
      <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10">
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tighter text-foreground">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: trend, isLoading: trendLoading } = useGetScoreTrend();
  const { data: activity, isLoading: actLoading } = useGetRecentActivity();
  const { data: breakdown, isLoading: breakLoading } = useGetIssueBreakdown();

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="neon-text-cyan text-3xl font-black tracking-tight text-foreground">Command Center</h1>
          <p className="text-sm font-medium text-muted-foreground">SEO &amp; AI visibility at a glance</p>
        </div>
        <Link href="/analyzer">
          <Button className="gap-2 font-bold">
            New analysis <Zap className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {sumLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Projects" value={summary?.totalProjects ?? null} icon={Globe} color="text-cyan-400" />
            <StatCard label="Total Analyses" value={summary?.totalAnalyses ?? null} icon={Activity} color="text-purple-400" />
            <StatCard label="Tracked Keywords" value={summary?.totalKeywords ?? null} icon={Key} color="text-emerald-400" />
            <StatCard label="Avg SEO Score" value={summary?.avgSeoScore ? `${summary.avgSeoScore}/100` : null} icon={TrendingUp} sub="Across completed analyses" color="text-cyan-400" />
            <StatCard label="Critical Issues" value={summary?.criticalIssues ?? null} icon={AlertTriangle} color="text-red-500" />
            <StatCard label="Pending Analyses" value={summary?.pendingAnalyses ?? null} icon={Clock} color="text-amber-500" />
            <StatCard label="Recommendations" value={summary?.recommendationsPending ?? null} icon={FileCheck} sub="Pending action" color="text-purple-400" />
            <StatCard label="Avg AI Visibility" value={summary?.avgAiVisibility ? `${summary.avgAiVisibility}/100` : null} icon={Brain} sub="How AI engines see you" color="text-purple-400" />
          </>
        )}
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <motion.div variants={fadeUp()} initial="hidden" whileInView="show" viewport={{ once: true }} className="md:col-span-2 lg:col-span-3">
          <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">SEO Score Trend</h2>
              <p className="text-xs font-medium text-muted-foreground">Score progression over completed analyses</p>
            </div>
            {trendLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : trend && trend.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F8CFF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4F8CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#4F8CFF", fontWeight: "bold" }} />
                    <Area type="monotone" dataKey="score" stroke="#4F8CFF" fill="url(#scoreGrad)" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))", stroke: "#4F8CFF", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#4F8CFF", stroke: "#fff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] text-sm text-muted-foreground">
                <Activity className="h-8 w-8 text-muted-foreground/50" />
                <p>No completed analyses yet.</p>
                <Link href="/analyzer" className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                  Run your first analysis
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp(0.1)} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:col-span-2">
          <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Issue Breakdown</h2>
              <p className="text-xs font-medium text-muted-foreground">Issues by category and severity</p>
            </div>
            {breakLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : breakdown && breakdown.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11, fill: AXIS, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                      {breakdown.map((entry, idx) => (
                        <Cell key={idx} fill={SEVERITY_COLORS[entry.severity] ?? "#7C5CFF"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] text-sm text-muted-foreground">
                <ShieldCheck className="h-8 w-8 text-emerald-500/50" />
                <p>No issues detected yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div variants={fadeUp()} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Recent Activity</h2>
          {actLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex w-full min-w-0 items-center gap-4 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-3 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor] ${
                      item.type === "analysis"
                        ? "bg-cyan-400 text-cyan-400"
                        : item.type === "keyword"
                          ? "bg-emerald-400 text-emerald-400"
                          : "bg-purple-400 text-purple-400"
                    }`}
                  />
                  <p className="flex-1 truncate break-all text-sm font-medium text-foreground">{item.description}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-widest">
                    {item.type}
                  </Badge>
                  <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline-block">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Create a project or run an analysis to get started.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
