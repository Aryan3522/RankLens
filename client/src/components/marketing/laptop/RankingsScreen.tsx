import { TrendingDown, TrendingUp } from "lucide-react";
import { ScreenShell } from "./Laptop";
import type { ScreenData } from "./screen-data";

const SPARK = [54, 58, 56, 63, 61, 69, 72, 78];

const KEYWORDS = [
  { term: "AI SEO tools", position: 3, change: 2 },
  { term: "Rank tracking software", position: 4, change: 1 },
  { term: "AI content optimization", position: 6, change: 1 },
  { term: "Keyword rank checker", position: 8, change: 4 },
];

/** Tiny inline-SVG sparkline — no recharts, so it renders safely inside the
 *  drei <Html> portal (which lives outside the app's react-dom context tree). */
function MiniSpark({ values, w = 72, h = 32 }: { values: number[]; w?: number; h?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#4F8CFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Scene 1 — Google Rankings: visibility score + average position + top
 *  performing keywords, mirroring the reference hero screen. Pure/presentational
 *  (data is passed in) so it can render inside the 3D laptop's Html overlay. */
export function RankingsScreen({ data }: { data?: ScreenData }) {
  const score = Math.round(data?.seoScore ?? data?.aiVisibilityScore ?? 78);

  return (
    <ScreenShell label="RankLens · Google Rankings">
      <div className="flex h-full flex-col gap-3">
        <div className="text-sm font-bold tracking-tight">Google Rankings</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="skeu-sm rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Visibility Score
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black leading-none">{score}</span>
                <span className="flex items-center text-[11px] font-bold text-[#29D398]">
                  <TrendingUp className="mr-0.5 h-3 w-3" />+12.5%
                </span>
              </div>
              <MiniSpark values={SPARK} />
            </div>
          </div>

          <div className="skeu-sm rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Average Position
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-black leading-none">12.6</span>
              <span className="flex items-center text-[11px] font-bold text-[#29D398]">
                <TrendingDown className="mr-0.5 h-3 w-3" />+3.2
              </span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Positions gained</div>
          </div>
        </div>

        <div className="skeu-inset min-h-0 flex-1 rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Top Performing Keywords</span>
            <span className="flex gap-4"><span>Position</span><span>Change</span></span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {KEYWORDS.map((k) => (
              <li key={k.term} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-foreground/90">{k.term}</span>
                <span className="flex items-center gap-5 font-mono">
                  <span className="w-4 text-right text-muted-foreground">{k.position}</span>
                  <span className="flex w-6 items-center justify-end font-bold text-[#29D398]">
                    <TrendingUp className="mr-0.5 h-3 w-3" />{k.change}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScreenShell>
  );
}
