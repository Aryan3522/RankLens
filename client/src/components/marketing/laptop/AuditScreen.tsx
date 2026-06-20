import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { ScoreDonut } from "@/components/charts/ScoreDonut";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { ScreenShell } from "./Laptop";
import { AUDIT_ISSUES } from "../data";

const SEVERITY = {
  critical: { icon: AlertTriangle, color: "text-destructive" },
  important: { icon: Info, color: "text-amber-400" },
  minor: { icon: CheckCircle2, color: "text-emerald-400" },
} as const;
type Severity = keyof typeof SEVERITY;
const PRIORITY_TO_SEVERITY: Record<string, Severity> = { critical: "critical", important: "important", "nice-to-have": "minor" };

/** Scene 3 — audit: overall score + prioritized issues, inside the screen. */
export function AuditScreen() {
  const { data: latest } = useLatestAnalysis();
  const plan = latest?.actionPlan ?? [];
  const live = plan.length > 0 || latest?.aiVisibilityScore != null;
  const score = live ? Math.round(latest!.aiVisibilityScore ?? latest!.seoScore ?? 74) : 74;
  const issues: { severity: Severity; label: string }[] = live && plan.length
    ? plan.slice(0, 4).map((a) => ({ severity: PRIORITY_TO_SEVERITY[a.priority] ?? "minor", label: a.title }))
    : AUDIT_ISSUES.slice(0, 4);

  return (
    <ScreenShell label="RankLens · Audit">
      <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-5">
        <div className="flex flex-col items-center justify-center sm:col-span-2">
          <ScoreDonut value={score} size={108} suffix="/100" />
          <div className="mt-1 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {live ? "Your last scan" : "Overall visibility"}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:col-span-3">
          {issues.map((it) => {
            const s = SEVERITY[it.severity];
            return (
              <div key={it.label} className="skeu-sm flex items-start gap-2 rounded-lg px-2.5 py-2">
                <s.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${s.color}`} />
                <span className="text-[11px] leading-snug">{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}
