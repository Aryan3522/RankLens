import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { fadeUp, staggerContainer, useReveal } from "@/lib/motion";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { AUDIT_ISSUES } from "../data";

const SEVERITY = {
  critical: { icon: AlertTriangle, color: "text-destructive", ring: "border-destructive/30 bg-destructive/10" },
  important: { icon: Info, color: "text-amber-400", ring: "border-amber-500/30 bg-amber-500/10" },
  minor: { icon: CheckCircle2, color: "text-emerald-400", ring: "border-emerald-500/30 bg-emerald-500/10" },
} as const;

type Severity = keyof typeof SEVERITY;
const PRIORITY_TO_SEVERITY: Record<string, Severity> = {
  critical: "critical",
  important: "important",
  "nice-to-have": "minor",
};

/** A realistic mini audit dashboard — score gauge + prioritized issues, bound to the visitor's real scan when present. */
export function AuditExperienceSection() {
  const { ref, animate } = useReveal();
  const { data: latest } = useLatestAnalysis();

  const plan = latest?.actionPlan ?? [];
  const live = plan.length > 0 || latest?.aiVisibilityScore != null;
  const score = live ? Math.round(latest!.aiVisibilityScore ?? latest!.seoScore ?? 74) : 74;
  const issues: { severity: Severity; label: string }[] = live && plan.length
    ? plan.slice(0, 5).map((a) => ({ severity: PRIORITY_TO_SEVERITY[a.priority] ?? "minor", label: a.title }))
    : AUDIT_ISSUES;
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const dash = 2 * Math.PI * 42;

  return (
    <section className="cv-auto border-y border-white/5 bg-white/[0.015] px-4 py-16 md:py-24">
      <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="skeu order-2 rounded-3xl p-6 lg:order-1"
        >
          {/* score header */}
          <motion.div variants={fadeUp(0, 16)} className="mb-6 flex items-center gap-4">
            <div className="relative grid h-24 w-24 place-items-center">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#auditGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  initial={{ strokeDashoffset: dash }}
                  whileInView={{ strokeDashoffset: dash * (1 - score / 100) }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                />
                <defs>
                  <linearGradient id="auditGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4F8CFF" />
                    <stop offset="100%" stopColor="#7C5CFF" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-2xl font-black">{score}</span>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary">
                {live ? "Your last scan" : "Overall visibility"}
              </div>
              <div className="text-lg font-bold">{score >= 80 ? "Strong visibility" : "Good, with quick wins"}</div>
              <div className="text-sm text-muted-foreground">
                {issues.length} issues found · {criticalCount} critical
              </div>
            </div>
          </motion.div>

          {/* issues list */}
          <div className="space-y-2">
            {issues.map((issue) => {
              const s = SEVERITY[issue.severity];
              return (
                <motion.div
                  key={issue.label}
                  variants={fadeUp(0, 14)}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${s.ring}`}
                >
                  <s.icon className={`mt-1 h-4 w-4 shrink-0 ${s.color}`} />
                  <span className="text-sm">{issue.label}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div ref={ref} variants={fadeUp()} initial="hidden" animate={animate} className="order-1 lg:order-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">The audit experience</span>
          <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
            Every score, explained and fixable
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            No mystery numbers — see what's hurting your score, ranked by impact.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
