/**
 * Pure-CSS poster shown wherever the 3D hero engine can't or shouldn't run
 * (mobile, reduced-motion, no WebGL, before the chunk loads). Reuses the
 * brand aurora + a faint neural-node SVG so layout and vibe match the 3D scene
 * with zero JS cost and no CLS.
 */
export function HeroFallback() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="aurora-bg absolute inset-0" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[
          [160, 180], [320, 120], [480, 220], [620, 150],
          [240, 360], [420, 420], [600, 380], [360, 260],
        ].map(([x, y], i) => (
          <g key={i}>
            {i > 0 && (
              <line
                x1={x}
                y1={y}
                x2={[160, 320, 480, 620, 240, 420, 600, 360][i - 1]}
                y2={[180, 120, 220, 150, 360, 420, 380, 260][i - 1]}
                stroke="var(--accent-purple)"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            )}
            <circle cx={x} cy={y} r="22" fill="url(#nodeGlow)" />
            <circle cx={x} cy={y} r="4" fill="var(--accent-cyan)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
