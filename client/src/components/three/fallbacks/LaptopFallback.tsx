import { C } from "../palette";

/**
 * Static poster for the hero laptop — an SVG laptop whose screen shows a small
 * analytics dashboard (bars + trend line). Pure SVG/CSS so it costs nothing on
 * mobile / reduced-motion / pre-load and matches the 3D framing (zero CLS).
 */
export function LaptopFallback() {
  const bars = [38, 62, 48, 80, 56, 92];
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center overflow-hidden">
      <div className="aurora-bg absolute inset-0" />
      <svg viewBox="0 0 400 300" className="h-full max-h-[440px] w-full">
        {/* screen */}
        <rect x="70" y="36" width="260" height="168" rx="10" fill="#0c0f14" stroke="rgba(255,255,255,0.08)" />
        <rect x="80" y="46" width="240" height="148" rx="6" fill="#0b1320" />
        {/* dashboard bars */}
        {bars.map((h, i) => (
          <rect key={i} x={96 + i * 34} y={182 - h} width="20" height={h} rx="3" fill={C.blue} opacity="0.92" />
        ))}
        {/* trend line */}
        <polyline
          points="100,120 150,96 200,108 250,72 300,84"
          fill="none"
          stroke={C.cyan}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        {[ [100,120],[150,96],[200,108],[250,72],[300,84] ].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="3.5" fill={C.purple} />
        ))}
        {/* base / keyboard deck */}
        <path d="M48 204 H352 L372 232 H28 Z" fill="#1b2230" stroke="rgba(255,255,255,0.08)" />
        <rect x="170" y="210" width="60" height="6" rx="3" fill="#2a3446" />
      </svg>
    </div>
  );
}
