import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from "recharts";

/** Pick a band color for a 0–100 score (success / warning / error). */
export function scoreColor(score: number): string {
  if (score >= 70) return "#29D398";
  if (score >= 40) return "#FFB648";
  return "#FF5E7A";
}

/**
 * A single 0–100 score as a radial gauge with the number centered. Replaces
 * hand-rolled SVG rings; consistent across hero, audit, and analysis pages.
 */
export function ScoreDonut({
  value,
  size = 132,
  label,
  color,
  suffix = "/100",
}: {
  value: number;
  size?: number;
  label?: string;
  color?: string;
  suffix?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const fill = color ?? scoreColor(v);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="74%"
          outerRadius="100%"
          data={[{ value: v, fill }]}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={size / 2} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-2xl font-black" style={{ color: fill }}>{v}</div>
          {suffix && <div className="text-[10px] font-medium text-muted-foreground">{suffix}</div>}
        </div>
      </div>
      {label && (
        <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      )}
    </div>
  );
}
