import { engineColor } from "../palette";

type Engine = { name: string; readiness: number };

const DEFAULT: Engine[] = [
  { name: "ChatGPT", readiness: 82 },
  { name: "Gemini", readiness: 74 },
  { name: "Claude", readiness: 88 },
  { name: "Perplexity", readiness: 69 },
  { name: "Copilot", readiness: 77 },
];

/**
 * Static poster for the AI Visibility Universe — a central content core with
 * engine planets radiating out, each sized by readiness. Pure SVG/CSS so it
 * costs nothing and matches the 3D layout (zero CLS).
 */
export function UniverseFallback({ engines }: { engines?: Engine[] }) {
  const list = engines?.length ? engines : DEFAULT;
  const cx = 200;
  const cy = 200;

  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="aurora-bg absolute inset-0" />
      <svg viewBox="0 0 400 400" className="h-full max-h-[420px] w-full opacity-90">
        {list.map((e, i) => {
          const rad = (i / list.length) * Math.PI * 2;
          const r = 150 - (e.readiness / 100) * 55; // stronger orbits closer
          const x = cx + Math.cos(rad) * r;
          const y = cy + Math.sin(rad) * r;
          const size = 9 + (e.readiness / 100) * 16;
          const color = engineColor(e.name);
          return (
            <g key={e.name}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--accent-cyan)" strokeOpacity="0.3" strokeWidth="1.5" />
              <circle cx={x} cy={y} r={size + 12} fill={color} opacity="0.16" />
              <circle cx={x} cy={y} r={size} fill={color} opacity="0.92" />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="36" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="14" fill="var(--accent-cyan)" />
      </svg>
    </div>
  );
}
