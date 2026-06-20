import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Lazy3D } from "@/components/three/Lazy3D";
import { BattlefieldFallback } from "@/components/three/fallbacks/BattlefieldFallback";
import { fadeUp, useReveal } from "@/lib/motion";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { COMPARISON_ROWS } from "../data";

const battlefieldLoader = () => import("@/components/three/scenes/CompetitiveBattlefield");

/** Maps each comparison metric to the analysis signal that powers the "you" pillar. */
const METRIC_SOURCES: { metric: string; competitor: number; category?: string }[] = [
  { metric: "AI Citation", competitor: 41, category: "citation-readiness" },
  { metric: "Structured Data", competitor: 55, category: "structured-data" },
  { metric: "E-E-A-T", competitor: 60, category: "eeat" },
  { metric: "Core Web Vitals", competitor: 72 },
  { metric: "Entity Coverage", competitor: 38, category: "entity-signals" },
];

/**
 * Competitive intelligence rendered as a 3D "battlefield": your pillars
 * (electric blue) vs a benchmark competitor (graphite), gap markers flagging
 * where you lead or trail. Your side reflects the real scan when present;
 * incapable devices get the static SVG bar poster.
 */
export function CompetitiveIntelSection() {
  const { ref, animate } = useReveal();
  const { data: latest } = useLatestAnalysis();

  const categories = latest?.aiVisibilityCategories ?? [];
  const live = categories.length > 0;
  const rows = live
    ? METRIC_SOURCES.map((m) => {
        const you =
          m.category != null
            ? categories.find((c) => c.id === m.category)?.score
            : latest?.performanceScore ?? undefined;
        return { metric: m.metric, you: Math.round(you ?? m.competitor + 10), competitor: m.competitor };
      })
    : COMPARISON_ROWS;

  return (
    <section className="cv-auto px-4 py-16 md:py-24">
      <div className="container mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div ref={ref} variants={fadeUp()} initial="hidden" animate={animate}>
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <TrendingUp className="h-4 w-4" /> Competitive intelligence
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
            See exactly where rivals beat you
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            See where you beat rivals — and which gap to close first.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["Keyword & entity gaps", "Structured-data coverage delta", "Citation-readiness comparison"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-primary" /> You
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#3a4452]" /> Competitor benchmark
            </span>
            <span className={live ? "text-primary" : "text-muted-foreground/60"}>
              {live ? "• Live from your last scan" : "• Demo data"}
            </span>
          </div>
        </motion.div>

        {/* 3D battlefield */}
        <div className="relative h-[420px]">
          <Lazy3D
            className="absolute inset-0"
            loader={battlefieldLoader}
            fallback={<BattlefieldFallback rows={rows} />}
            sceneProps={{ rows }}
          />
        </div>
      </div>
    </section>
  );
}
