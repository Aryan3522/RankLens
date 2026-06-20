import { SignalRadar } from "@/components/charts/SignalRadar";
import { engineColor } from "@/components/three/palette";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { ScreenShell } from "./Laptop";
import { AI_SIGNALS_DEMO, AI_VISIBILITY_ENGINES } from "../data";

/** Scene 1 — AI visibility: the 12-signal radar + per-engine readiness, inside the screen. */
export function AIScreen() {
  const { data: latest } = useLatestAnalysis();

  const signals = latest?.aiVisibilityCategories?.length
    ? latest.aiVisibilityCategories.map((c) => ({ label: c.label, score: c.score }))
    : AI_SIGNALS_DEMO;

  const engines = latest?.aiEngineReadiness?.length
    ? latest.aiEngineReadiness.map((e) => ({ name: e.engine, readiness: e.score, color: engineColor(e.engine) }))
    : AI_VISIBILITY_ENGINES.map((e) => ({ name: e.name, readiness: e.readiness, color: `hsl(${e.accent})` }));

  return (
    <ScreenShell label="RankLens · AI Visibility">
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="min-h-0 sm:col-span-3">
          <SignalRadar data={signals} height={210} />
        </div>
        <div className="flex flex-col justify-center gap-2 sm:col-span-2">
          {engines.slice(0, 5).map((e) => (
            <div key={e.name}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold">{e.name}</span>
                <span className="font-mono text-muted-foreground">{e.readiness}%</span>
              </div>
              <div className="skeu-inset h-1.5 overflow-hidden rounded-full">
                <div className="h-full rounded-full" style={{ width: `${e.readiness}%`, background: e.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
