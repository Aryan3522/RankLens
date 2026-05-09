import { useGetDashboardSummary, useGetScoreTrend, useGetRecentActivity, useGetIssueBreakdown } from "@/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Globe, Key, AlertTriangle, Clock, Star, FileCheck, Activity } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value, icon: Icon, sub, color = "text-primary" }: {
  label: string; value: string | number | null; icon: React.ElementType; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-accent flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? "—"}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#6366f1",
};

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: trend, isLoading: trendLoading } = useGetScoreTrend();
  const { data: activity, isLoading: actLoading } = useGetRecentActivity();
  const { data: breakdown, isLoading: breakLoading } = useGetIssueBreakdown();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">SEO performance overview across all projects</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Projects" value={summary?.totalProjects ?? null} icon={Globe} />
            <StatCard label="Total Analyses" value={summary?.totalAnalyses ?? null} icon={Activity} />
            <StatCard label="Tracked Keywords" value={summary?.totalKeywords ?? null} icon={Key} />
            <StatCard label="Avg SEO Score" value={summary?.avgSeoScore ? `${summary.avgSeoScore}/100` : null} icon={TrendingUp} sub="Across completed analyses" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Critical Issues" value={summary?.criticalIssues ?? null} icon={AlertTriangle} color="text-destructive" />
            <StatCard label="Pending Analyses" value={summary?.pendingAnalyses ?? null} icon={Clock} />
            <StatCard label="Recommendations" value={summary?.recommendationsPending ?? null} icon={FileCheck} sub="Pending action" />
            <StatCard label="Top Project" value={summary?.topPerformingProject ?? null} icon={Star} color="text-amber-500" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Score trend */}
        <div className="md:col-span-2 lg:col-span-3 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1">SEO Score Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">Score progression over completed analyses</p>
          {trendLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215 25% 55%)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215 25% 55%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(262 83% 58%)" fill="url(#scoreGrad)" strokeWidth={2} dot={{ r: 3, fill: "hsl(262 83% 58%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              No completed analyses yet. <Link href="/analyzer" className="text-primary ml-1 hover:underline">Run your first analysis</Link>
            </div>
          )}
        </div>

        {/* Issue breakdown */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-1">Issue Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-4">Issues by category and severity</p>
          {breakLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : breakdown && breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215 25% 55%)" }} />
                <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 10, fill: "hsl(215 25% 55%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(214 32% 91%)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {breakdown.map((entry, idx) => (
                    <Cell key={idx} fill={SEVERITY_COLORS[entry.severity] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
              No issues detected yet
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
        {actLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="space-y-1">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  item.type === "analysis" ? "bg-primary" : item.type === "keyword" ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <p className="text-sm text-foreground flex-1 truncate">{item.description}</p>
                <Badge variant="outline" className="text-xs capitalize shrink-0">{item.type}</Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">No activity yet. Create a project or run an analysis to get started.</p>
        )}
      </div>
    </div>
  );
}
