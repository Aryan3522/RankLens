/**
 * Static poster for the AI citation network — a central node radiating links to
 * five engine nodes. Pure SVG/CSS so it costs nothing and matches the 3D layout.
 */
export function CitationFallback() {
  const engines = [
    { c: "#34d399", a: 0 },
    { c: "#22d3ee", a: 72 },
    { c: "#a855f7", a: 144 },
    { c: "#fbbf24", a: 216 },
    { c: "#f472b6", a: 288 },
  ];
  const R = 120;
  const cx = 200;
  const cy = 200;

  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="aurora-bg absolute inset-0" />
      <svg viewBox="0 0 400 400" className="h-full max-h-[420px] w-full opacity-90">
        {engines.map((e, i) => {
          const rad = (e.a * Math.PI) / 180;
          const x = cx + Math.cos(rad) * R;
          const y = cy + Math.sin(rad) * R;
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="14" fill={e.c} opacity="0.9" />
              <circle cx={x} cy={y} r="26" fill={e.c} opacity="0.18" />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="34" fill="none" stroke="#67e8f9" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="14" fill="#22d3ee" />
      </svg>
    </div>
  );
}
