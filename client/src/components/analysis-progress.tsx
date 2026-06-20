import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, Search, Brain, Lightbulb, ClipboardList,
  CheckCircle2, Loader2, XCircle,
} from "lucide-react";

// The backend is a single blocking call, so we drive a client-side staged
// progress display through the 5 product-defined steps while the request is
// in flight, then snap to complete (or failed) when the record resolves.
const STEPS = [
  { key: "fetch", label: "Fetching content", icon: Download },
  { key: "seo", label: "Analyzing SEO", icon: Search },
  { key: "ai", label: "Analyzing AI visibility", icon: Brain },
  { key: "opps", label: "Finding opportunities", icon: Lightbulb },
  { key: "recs", label: "Generating recommendations", icon: ClipboardList },
];

const STEP_INTERVAL_MS = 1600;

export function AnalysisProgress({ status }: { status?: string }) {
  const isRunning = status === "running" || status === "queued" || status == null;
  const isFailed = status === "failed";
  const isDone = status === "completed";

  // Advance through steps on a timer while running; cap one short of the
  // final step so the UI doesn't claim completion before the server responds.
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setActive((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {STEPS.map((step, i) => {
        const complete = isDone || i < active;
        const current = isRunning && i === active;
        const Icon = step.icon;

        const state = isFailed && i >= active ? "failed" : complete ? "done" : current ? "current" : "pending";

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-500 ${
              state === "done"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : state === "current"
                  ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                  : state === "failed"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="shrink-0">
              {state === "done" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : state === "current" ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : state === "failed" ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Icon className="w-5 h-5 text-muted-foreground/40" />
              )}
            </div>
            <span
              className={`text-sm font-medium tracking-tight ${
                state === "done"
                  ? "text-emerald-300"
                  : state === "current"
                    ? "text-cyan-200"
                    : state === "failed"
                      ? "text-red-300"
                      : "text-muted-foreground/50"
              }`}
            >
              {step.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
