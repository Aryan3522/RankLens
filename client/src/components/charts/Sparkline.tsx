import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/**
 * Tiny axis-less trend line for a short numeric series (e.g. keyword rank
 * history). `invert` flips the Y axis so that "lower is better" metrics like
 * search rank trend upward when improving.
 */
export function Sparkline({
  values,
  color = "#4F8CFF",
  width = 96,
  height = 28,
  invert = false,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  invert?: boolean;
}) {
  if (!values || values.length < 2) {
    return <div style={{ width, height }} className="grid place-items-center text-[10px] text-muted-foreground/50">—</div>;
  }
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} reversed={invert} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
