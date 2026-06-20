import { C } from "../palette";

type Row = { metric: string; you: number; competitor: number };

const DEFAULT: Row[] = [
  { metric: "AI Citation", you: 68, competitor: 41 },
  { metric: "Structured Data", you: 92, competitor: 55 },
  { metric: "E-E-A-T", you: 74, competitor: 60 },
  { metric: "Core Web Vitals", you: 88, competitor: 72 },
  { metric: "Entity Coverage", you: 63, competitor: 38 },
];

/**
 * Static poster for the Competitive Battlefield — grouped you-vs-competitor
 * bars on a baseline. Pure SVG so incapable devices still read the comparison
 * with zero JS cost (matches the 3D scene's framing).
 */
export function BattlefieldFallback({ rows }: { rows?: Row[] }) {
  const list = rows?.length ? rows : DEFAULT;
  const W = 400;
  const H = 320;
  const base = 250;
  const maxH = 180;
  const slot = W / list.length;

  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="aurora-bg absolute inset-0" />
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-[420px] w-full opacity-90">
        <line x1="0" y1={base} x2={W} y2={base} stroke="var(--accent-cyan)" strokeOpacity="0.25" strokeWidth="1.5" />
        {list.map((r, i) => {
          const cx = i * slot + slot / 2;
          const youH = (r.you / 100) * maxH;
          const compH = (r.competitor / 100) * maxH;
          return (
            <g key={r.metric}>
              <rect x={cx - 24} y={base - youH} width="20" height={youH} rx="3" fill={C.blue} opacity="0.95" />
              <rect x={cx + 4} y={base - compH} width="20" height={compH} rx="3" fill="#3a4452" opacity="0.9" />
              <circle cx={cx - 14} cy={base - youH - 12} r="4" fill={r.you >= r.competitor ? C.success : C.error} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
