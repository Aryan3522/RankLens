import { useGetDashboardSummary, useGetScoreTrend, useGetRecentActivity, useGetIssueBreakdown } from "@/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Globe, Key, AlertTriangle, Clock, Star, FileCheck, Activity, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowCard } from "@/components/ui/glow-card";

function StatCard({ label, value, icon: Icon, sub, color = "text-primary" }: {
  label: string; value: string | number | null; icon: React.ElementType; sub?: string; color?: string;
}) {
  return (
    <GlowCard className="p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center ${color} shadow-[0_0_10px_rgba(255,255,255,0.05)]`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tighter">{value ?? "—"}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </GlowCard>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444", // Red
  warning: "#f59e0b", // Amber
  info: "#06b6d4",    // Cyan
};

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: trend, isLoading: trendLoading } = useGetScoreTrend();
  const { data: activity, isLoading: actLoading } = useGetRecentActivity();
  const { data: breakdown, isLoading: breakLoading } = useGetIssueBreakdown();

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-black text-foreground tracking-tight neon-text-cyan">Dashboard</h1>
        <p className="text-muted-foreground text-sm font-medium">SEO performance overview across all projects</p>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Projects" value={summary?.totalProjects ?? null} icon={Globe} color="text-cyan-400" />
            <StatCard label="Total Analyses" value={summary?.totalAnalyses ?? null} icon={Activity} color="text-purple-400" />
            <StatCard label="Tracked Keywords" value={summary?.totalKeywords ?? null} icon={Key} color="text-emerald-400" />
            <StatCard label="Avg SEO Score" value={summary?.avgSeoScore ? `${summary.avgSeoScore}/100` : null} icon={TrendingUp} sub="Across completed analyses" color="text-cyan-400" />
          </>
        )}
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Critical Issues" value={summary?.criticalIssues ?? null} icon={AlertTriangle} color="text-red-500" />
            <StatCard label="Pending Analyses" value={summary?.pendingAnalyses ?? null} icon={Clock} color="text-amber-500" />
            <StatCard label="Recommendations" value={summary?.recommendationsPending ?? null} icon={FileCheck} sub="Pending action" color="text-purple-400" />
            <StatCard label="Top Project" value={summary?.topPerformingProject ?? null} icon={Star} color="text-emerald-400" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Score trend */}
        <GlowCard className="md:col-span-2 lg:col-span-3 p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-foreground text-lg tracking-tight">SEO Score Trend</h2>
            <p className="text-xs text-muted-foreground font-medium">Score progression over completed analyses</p>
          </div>
          {trendLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : trend && trend.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(9, 9, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, backdropFilter: "blur(4px)" }}
                    itemStyle={{ color: "#06b6d4", fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#06b6d4" fill="url(#scoreGrad)" strokeWidth={3} dot={{ r: 4, fill: "#09090b", stroke: "#06b6d4", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#06b6d4", stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 bg-black/20 rounded-lg border border-white/5">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
              <p>No completed analyses yet.</p>
              <Link href="/analyzer" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline">Run your first analysis</Link>
            </div>
          )}
        </GlowCard>

        {/* Issue breakdown */}
        <GlowCard className="lg:col-span-2 p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-foreground text-lg tracking-tight">Issue Breakdown</h2>
            <p className="text-xs text-muted-foreground font-medium">Issues by category and severity</p>
          </div>
          {breakLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : breakdown && breakdown.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.8)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(9, 9, 11, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, backdropFilter: "blur(4px)" }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {breakdown.map((entry, idx) => (
                      <Cell key={idx} fill={SEVERITY_COLORS[entry.severity] ?? "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 bg-black/20 rounded-lg border border-white/5">
              <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
              <p>No issues detected yet</p>
            </div>
          )}
        </GlowCard>
      </div>

      {/* Recent activity */}
      <GlowCard className="p-5 flex flex-col gap-4">
        <h2 className="font-bold text-foreground text-lg tracking-tight">Recent Activity</h2>
        {actLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all min-w-0 w-full">
                <div className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor] ${
                  item.type === "analysis" ? "text-cyan-400 bg-cyan-400" : item.type === "keyword" ? "text-emerald-400 bg-emerald-400" : "text-purple-400 bg-purple-400"
                }`} />
                <p className="text-sm font-medium text-foreground flex-1 truncate break-all">{item.description}</p>
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest shrink-0">{item.type}</Badge>
                <span className="text-xs text-muted-foreground shrink-0 font-mono hidden sm:inline-block">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Activity className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No activity yet. Create a project or run an analysis to get started.</p>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
