import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { ScreenShell } from "./Laptop";
import { COMPARISON_ROWS } from "../data";

const METRIC_SOURCES: { metric: string; competitor: number; category?: string }[] = [
  { metric: "AI Citation", competitor: 41, category: "citation-readiness" },
  { metric: "Structured Data", competitor: 55, category: "structured-data" },
  { metric: "E-E-A-T", competitor: 60, category: "eeat" },
  { metric: "Core Web Vitals", competitor: 72 },
  { metric: "Entity Coverage", competitor: 38, category: "entity-signals" },
];

/** Scene 2 — competitive: you-vs-competitor bars, inside the screen. */
export function CompetitiveScreen() {
  const { data: latest } = useLatestAnalysis();
  const categories = latest?.aiVisibilityCategories ?? [];

  const rows = categories.length
    ? METRIC_SOURCES.map((m) => {
        const you = m.category != null
          ? categories.find((c) => c.id === m.category)?.score
          : latest?.performanceScore ?? undefined;
        return { metric: m.metric, you: Math.round(you ?? m.competitor + 10), competitor: m.competitor };
      })
    : COMPARISON_ROWS;

  return (
    <ScreenShell label="RankLens · Competitive">
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="flex items-center justify-end gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> You</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#3a4452]" /> Competitor</span>
        </div>
        {rows.map((r) => (
          <div key={r.metric}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-medium">{r.metric}</span>
              <span className="font-mono font-bold text-primary">{r.you}</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full skeu-inset">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${r.you}%` }} />
              <span className="absolute inset-y-0 w-0.5 bg-white/50" style={{ left: `${r.competitor}%` }} />
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}
