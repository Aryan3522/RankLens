import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { Lazy3D } from "@/components/three/Lazy3D";
import { UniverseFallback } from "@/components/three/fallbacks/UniverseFallback";
import { SignalRadar } from "@/components/charts/SignalRadar";
import { fadeUp, useReveal } from "@/lib/motion";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { AI_VISIBILITY_ENGINES, AI_SIGNALS_DEMO } from "../data";

const universeLoader = () => import("@/components/three/scenes/AIVisibilityUniverse");
const demoUniverse = AI_VISIBILITY_ENGINES.map((e) => ({ name: e.name, readiness: e.readiness }));

/** AI visibility universe (engine readiness) + a 12-signal radar, bound to the visitor's real scan when present. */
export function AIVisibilitySection() {
  const { ref, animate } = useReveal();
  const { data: latest } = useLatestAnalysis();

  const liveEngines = (latest?.aiEngineReadiness?.length ?? 0) > 0;
  const universeEngines = liveEngines
    ? latest!.aiEngineReadiness!.map((e) => ({ name: e.engine, readiness: e.score }))
    : demoUniverse;

  const liveSignals = (latest?.aiVisibilityCategories?.length ?? 0) > 0;
  const radarData = liveSignals
    ? latest!.aiVisibilityCategories!.map((c) => ({ label: c.label, score: c.score }))
    : AI_SIGNALS_DEMO;

  return (
    <section id="ai" className="cv-auto relative overflow-hidden px-4 py-16 md:py-24">
      <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* 3D AI visibility universe */}
        <div className="relative order-2 h-[420px] lg:order-1">
          <Lazy3D
            className="absolute inset-0"
            loader={universeLoader}
            fallback={<UniverseFallback engines={universeEngines} />}
            sceneProps={{ engines: universeEngines }}
          />
        </div>

        {/* copy + 12-signal radar */}
        <div className="order-1 lg:order-2">
          <motion.div ref={ref} variants={fadeUp()} initial="hidden" animate={animate}>
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary">
              <Brain className="h-4 w-4" /> AI Visibility Engine
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
              Be the source AI chooses to cite
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              12 signals scored per engine — structure, entities, E-E-A-T, citations.
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
                liveSignals ? "skeu-sm text-primary" : "text-muted-foreground/60"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${liveSignals ? "bg-primary" : "bg-muted-foreground/40"}`} />
              {liveSignals ? "Live from your last scan" : "Demo — run a scan to see your own"}
            </span>
          </motion.div>

          <motion.div
            variants={fadeUp(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
            className="skeu mt-8 rounded-2xl p-4"
          >
            <SignalRadar data={radarData} height={300} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
