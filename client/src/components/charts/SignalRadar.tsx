import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

export type RadarDatum = { label: string; score: number; benchmark?: number };

/**
 * Radar/spider chart over a set of scored signals (e.g. the 12 AI-visibility
 * categories). Replaces reading a long list of per-signal text with one glance.
 * Graphite-themed; optional benchmark overlay.
 */
export function SignalRadar({
  data,
  showBenchmark = false,
  height = 320,
}: {
  data: RadarDatum[];
  showBenchmark?: boolean;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="66%" margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + "…" : v)}
          />
          {showBenchmark && (
            <Radar
              name="Benchmark"
              dataKey="benchmark"
              stroke="#6b7480"
              fill="#6b7480"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
          )}
          <Radar
            name="You"
            dataKey="score"
            stroke="#4F8CFF"
            fill="#4F8CFF"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
