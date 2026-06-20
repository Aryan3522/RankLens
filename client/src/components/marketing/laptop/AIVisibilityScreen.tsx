import { TrendingUp } from "lucide-react";
import { ScreenShell } from "./Laptop";
import type { ScreenData } from "./screen-data";

const MENTIONS = [
  { engine: "ChatGPT", count: 128, change: 20, color: "#29D398" },
  { engine: "Gemini", count: 98, change: 18, color: "#4F8CFF" },
  { engine: "Claude", count: 76, change: 25, color: "#7C5CFF" },
  { engine: "Perplexity", count: 64, change: 10, color: "#4FE5FF" },
];

/** Scene 2 — AI Visibility: overall % + per-platform mention counts beside a
 *  glowing purple presence orb. Pure/presentational (see RankingsScreen). */
export function AIVisibilityScreen({ data }: { data?: ScreenData }) {
  const score = Math.round(data?.aiVisibilityScore ?? 68);

  return (
    <ScreenShell label="RankLens · AI Visibility">
      <div className="grid h-full grid-cols-5 gap-3">
        <div className="col-span-3 flex flex-col">
          <div className="text-sm font-bold tracking-tight">AI Visibility</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-4xl font-black leading-none">{score}%</span>
            <span className="flex items-center text-[11px] font-bold text-[#29D398]">
              <TrendingUp className="mr-0.5 h-3 w-3" />+15%
            </span>
          </div>

          <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mentions across AI platforms
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {MENTIONS.map((m) => (
              <li key={m.engine} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="flex-1 font-medium">{m.engine}</span>
                <span className="font-mono font-bold">{m.count}</span>
                <span className="w-10 text-right font-mono font-bold text-[#29D398]">+{m.change}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Presence orb — pure CSS glow, no extra geometry. */}
        <div className="col-span-2 grid place-items-center">
          <div className="presence-orb" />
        </div>
      </div>
    </ScreenShell>
  );
}
