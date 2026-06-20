import { TrendingUp } from "lucide-react";
import { ScreenShell } from "./Laptop";
import type { ScreenData } from "./screen-data";

const BARS = [40, 55, 48, 70, 62, 80, 58, 90, 72, 85, 95, 78];

const COMPETITORS = [
  { domain: "competitor.com", score: 85 },
  { domain: "competitor2.com", score: 72 },
  { domain: "competitor3.com", score: 65 },
];

/** Scene 3 — Smart Insights: keyword + content opportunity counts over a mini
 *  bar chart, with a top-competitor leaderboard. Mirrors the reference's third
 *  dashboard, here rendered on the persistent laptop screen. */
export function SmartInsightsScreen(_props: { data?: ScreenData }) {
  return (
    <ScreenShell label="RankLens · Smart Insights">
      <div className="flex h-full flex-col gap-3">
        <div className="skeu-sm rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Keyword Opportunities
            </div>
            <span className="flex items-center text-[11px] font-bold text-[#29D398]">
              <TrendingUp className="mr-0.5 h-3 w-3" />+23.5%
            </span>
          </div>
          <div className="mt-1 text-2xl font-black leading-none">1,264</div>
          <div className="mt-2 flex h-10 items-end gap-1">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-secondary"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          <div className="skeu-sm flex flex-col rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Content Opportunities
            </div>
            <div className="mt-1 text-2xl font-black leading-none">642</div>
            <div className="mt-1 text-[10px] text-muted-foreground">High-potential gaps</div>
          </div>

          <div className="skeu-sm flex flex-col rounded-xl p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top Competitors
            </div>
            <ul className="flex flex-col gap-2">
              {COMPETITORS.map((c, i) => (
                <li key={c.domain} className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 truncate">{c.domain}</span>
                  <span className="font-mono font-bold text-primary">{c.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
