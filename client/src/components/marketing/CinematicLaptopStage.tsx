import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  ChevronRight,
  ClipboardPaste,
  Gauge,
  type LucideIcon,
  Mouse,
  Search,
  Sparkles,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import type { IconType } from "react-icons";
import { LaptopFallback } from "@/components/three/fallbacks/LaptopFallback";
import { useDeviceTier, type TierConfig } from "@/components/three/useDeviceTier";
import type { StageState } from "@/components/three/scenes/LaptopModel";
import { useLatestAnalysis } from "@/hooks/useLatestAnalysis";
import { cn } from "@/lib/utils";
import { useAnalyze } from "./useAnalyze";
import { RankingsScreen } from "./laptop/RankingsScreen";
import { AIVisibilityScreen } from "./laptop/AIVisibilityScreen";
import { SmartInsightsScreen } from "./laptop/SmartInsightsScreen";
import type { ScreenData } from "./laptop/screen-data";

// Lazy so the heavy `vendor-three` chunk stays off the critical path; only
// mounted on ≥1024px viewports (the laptop is hidden on mobile/tablet).
const LaptopModel = lazy(() => import("@/components/three/scenes/LaptopModel"));

const PLATFORMS: { Icon: IconType; label: string; color?: string }[] = [
  { Icon: FcGoogle, label: "Google" },
  { Icon: FaYoutube, label: "YouTube", color: "#FF0000" },
  { Icon: FaInstagram, label: "Instagram", color: "#E1306C" },
  { Icon: HiSparkles, label: "AI Search", color: "#7C5CFF" },
];

type Feature = { icon: LucideIcon; title: string; desc: string };

type SceneCopy = {
  key: string;
  /** left/right = copy beside the laptop; corners = top-left + bottom-right;
   *  none = laptop only (no copy). */
  layout: "left" | "right" | "corners" | "none";
  eyebrow: string;
  heading: ReactNode;
  body: string;
  hero?: boolean;
  features?: Feature[];
  Screen: ComponentType<{ data?: ScreenData }>;
};

const SCENES: SceneCopy[] = [
  {
    key: "rankings",
    layout: "left",
    eyebrow: "AI Powered SEO & Visibility Platform",
    heading: (
      <>
        Discover Why <span className="text-gradient">Content Ranks.</span> Fix What Doesn't.
      </>
    ),
    body: "Track your visibility across Google, AI platforms, YouTube, and Instagram. Uncover insights. Find opportunities. Rank higher.",
    hero: true,
    Screen: RankingsScreen,
  },
  {
    key: "ai",
    layout: "right",
    eyebrow: "AI Visibility",
    heading: (
      <>
        Track Your Presence <br className="hidden sm:block" />Across AI Platforms
      </>
    ),
    body: "Understand how often your brand is mentioned by AI models like ChatGPT, Gemini, Claude, and more. Optimize to become the answer.",
    features: [
      { icon: Activity, title: "AI Mention Tracking", desc: "Monitor brand presence across leading AI platforms." },
      { icon: BadgeCheck, title: "Visibility Score", desc: "Get a single score that represents your AI visibility." },
      { icon: Gauge, title: "Trend Analysis", desc: "Track your growth and identify opportunities." },
    ],
    Screen: AIVisibilityScreen,
  },
  {
    key: "insights",
    layout: "corners",
    eyebrow: "Smart Insights",
    heading: (
      <>
        Actionable Insights <br className="hidden sm:block" />That Drive Growth
      </>
    ),
    body: "From keyword gaps to content opportunities, get insights that help you rank higher and grow faster — every recommendation ranked by impact.",
    Screen: SmartInsightsScreen,
  },
  {
    // Showcase: laptop centred, face-on.
    key: "showcase",
    layout: "none",
    eyebrow: "",
    heading: "",
    body: "",
    Screen: SmartInsightsScreen,
  },
  {
    // Exit: scroll room while the lid folds shut + the laptop scales/rotates away.
    key: "close",
    layout: "none",
    eyebrow: "",
    heading: "",
    body: "",
    Screen: SmartInsightsScreen,
  },
];

/** Reactive min-width media query (used to gate the cinematic 3D stage). */
function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [px]);
  return match;
}

/** The reference hero's URL command bar — the one interactive surface. */
function HeroInput() {
  const { url, setUrl, analyze, isPending } = useAnalyze();
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      /* clipboard blocked — type manually */
    }
  };

  return (
    <div className="mt-8 max-w-md">
      <div className="skeu flex items-center gap-2 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="Enter your website or page URL"
          aria-label="URL to analyze"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={paste}
          className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground sm:flex"
          aria-label="Paste from clipboard"
        >
          <ClipboardPaste className="h-3.5 w-3.5" /> Paste
        </button>
        <button
          type="button"
          onClick={() => analyze()}
          disabled={isPending}
          className="inline-flex h-auto shrink-0 items-center gap-1 rounded-xl bg-gradient-to-br from-[#8b6bff] to-[#6d4bff] px-5 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(124,92,255,0.45)] transition-transform hover:brightness-110 active:translate-y-px disabled:opacity-70"
        >
          {isPending ? "Starting…" : <>Analyze Now <ChevronRight className="h-4 w-4" /></>}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <span key={p.label} className="skeu-sm inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <p.Icon className="h-4 w-4" style={p.color ? { color: p.color } : undefined} /> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One scene's text column — reveals on scroll (normal document flow). When the
 *  copy sits in the right-hand column (`align="right"`) it mirrors the hero:
 *  text, eyebrow, body and feature rows all align to the right edge. */
function SceneCopyPanel({ scene, align = "left" }: { scene: SceneCopy; align?: "left" | "right" }) {
  const right = align === "right";
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative w-full", right && "text-right")}
    >
      {/* Soft scrim so the copy always reads cleanly over the 3D laptop behind it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(6,8,13,0.72),transparent_75%)]"
      />
      {scene.hero ? (
        <span className="skeu-sm inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/90">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> {scene.eyebrow}
        </span>
      ) : (
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{scene.eyebrow}</span>
      )}
      <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl xl:text-7xl 2xl:text-[5.25rem]">
        {scene.heading}
      </h2>
      <p className={cn("mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg", right && "ml-auto")}>
        {scene.body}
      </p>

      {scene.hero && <HeroInput />}

      {scene.features && (
        <div className="mt-6 flex flex-col gap-4">
          {scene.features.map((f) => (
            <div key={f.title} className={cn("flex items-start gap-3", right && "flex-row-reverse")}>
              <span className="skeu-sm grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary">
                <f.icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-bold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Full-bleed "inside the laptop" view. After the camera dives through the screen
 * this crossfades in (settling from a slight overscale, as if we flew into it),
 * showing the product's full dashboard — the three live screens as a command
 * center, framed with a screen-bezel vignette so it reads as being inside the
 * display.
 */
/**
 * Desktop (≥1024px) cinematic stage. The 3D laptop is PINNED (sticky) and travels
 * between scene poses as you scroll, while the scene copy scrolls past it in
 * normal document flow (a stacked track overlaid on the pinned canvas). Scroll
 * progress is pushed into a render-free `StageState` ref the R3F loop reads each
 * frame. WebGL-absent desktops fall back to the static poster.
 */
function PinnedStage({ tier, screenData }: { tier: TierConfig; screenData: ScreenData }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useRef<StageState>({ progress: 0, scene: 0, sceneCount: SCENES.length });
  const [active, setActive] = useState(0);

  // framer's useScroll({target}) mis-calibrates under Lenis here (jittery,
  // non-linear progress that skips the lid-close), so we derive a clean 0→1
  // from the global pixel scroll against this section's own measured bounds.
  const bounds = useRef({ start: 0, end: 1 });
  const { scrollY } = useScroll();

  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      bounds.current = { start: el.offsetTop, end: el.offsetTop + el.offsetHeight - window.innerHeight };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useMotionValueEvent(scrollY, "change", (v) => {
    const { start, end } = bounds.current;
    const p = end > start ? Math.min(1, Math.max(0, (v - start) / (end - start))) : 0;
    stage.current.progress = p;
    const i = Math.min(SCENES.length - 1, Math.max(0, Math.round(p * (SCENES.length - 1))));
    stage.current.scene = i;
    if (i !== active) setActive(i);
  });

  const ActiveScreen = SCENES[active].Screen;

  return (
    <section ref={stageRef} className="hero-stage relative" style={{ height: `${SCENES.length * 100}vh` }}>
      {/* Pinned laptop — stays put while the copy scrolls; its lid folds shut on
          the exit, then the pin releases and normal scroll takes over. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          {tier.tier === "none" ? (
            <LaptopFallback />
          ) : (
            <Suspense fallback={<LaptopFallback />}>
              <LaptopModel stage={stage} tier={tier} screen={<ActiveScreen data={screenData} />} />
            </Suspense>
          )}
        </div>
        <div className="neon-glow pointer-events-none absolute inset-0" aria-hidden />

        {active === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-1.5 text-muted-foreground">
            <Mouse className="h-5 w-5 animate-bounce" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll Down</span>
          </div>
        )}
      </div>

      {/* Normal-scrolling copy track, overlaid on the pinned laptop. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {SCENES.map((s) => (
          <div key={s.key} className="relative flex h-screen items-center">
            {(s.layout === "left" || s.layout === "right") && (
              <div className="grid w-full grid-cols-1 px-6 lg:grid-cols-2 lg:px-12">
                <div className={cn("pointer-events-auto", s.layout === "right" && "lg:col-start-2")}>
                  <SceneCopyPanel scene={s} align={s.layout === "right" ? "right" : "left"} />
                </div>
              </div>
            )}

            {s.layout === "corners" && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-12% 0px" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto absolute left-6 top-20 max-w-xl lg:left-16 lg:top-28 lg:max-w-2xl xl:max-w-3xl"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10 bg-[radial-gradient(75%_70%_at_38%_45%,rgba(6,8,13,0.82),transparent_78%)]"
                  />
                  <span className="text-sm font-bold uppercase tracking-[0.22em] text-secondary">{s.eyebrow}</span>
                  <h2 className="mt-4 text-5xl font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                    {s.heading}
                  </h2>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-12% 0px" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="pointer-events-auto absolute bottom-20 right-6 max-w-lg text-right lg:bottom-28 lg:right-16 lg:max-w-xl xl:max-w-2xl"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10 bg-[radial-gradient(75%_70%_at_62%_55%,rgba(6,8,13,0.82),transparent_78%)]"
                  />
                  <p className="text-xl leading-relaxed text-foreground/85 lg:text-2xl">{s.body}</p>
                </motion.div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Mobile/tablet (<1024px) layout. The 3D laptop is hidden entirely; each scene
 * is a normal stacked block — copy followed by its dashboard rendered as a flat
 * card — so the content reads cleanly without the 3D centerpiece.
 */
function StackedSections({ screenData }: { screenData: ScreenData }) {
  return (
    <section className="hero-stage px-5 pb-16 pt-28">
      <div className="mx-auto flex w-full flex-col gap-24">
        {SCENES.filter((s) => s.layout !== "none").map((s) => {
          const Screen = s.Screen;
          return (
            <div key={s.key} className="flex flex-col gap-8">
              <SceneCopyPanel scene={s} />
              <div className="skeu rounded-2xl p-2">
                <div className="laptop-html-screen w-full" style={{ aspectRatio: "16 / 10" }}>
                  <Screen data={screenData} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const COMMAND_CARDS = [
  {
    key: "rankings",
    eyebrow: "Google Rankings",
    heading: "Where you rank, at a glance",
    body: "Your visibility score, average position, and top-performing keywords — tracked and explained over time.",
    Screen: RankingsScreen,
  },
  {
    key: "ai",
    eyebrow: "AI Visibility",
    heading: "How AI engines see you",
    body: "Mentions across ChatGPT, Gemini, Claude and Perplexity, distilled into one visibility score.",
    Screen: AIVisibilityScreen,
  },
  {
    key: "insights",
    eyebrow: "Smart Insights",
    heading: "Opportunities that drive growth",
    body: "Keyword gaps, content opportunities, and the competitors you're closest to overtaking.",
    Screen: SmartInsightsScreen,
  },
];

/**
 * "Inside the laptop" command center — a pinned horizontal gallery. Each card
 * fills the viewport (100vh); scrolling advances cards sideways one at a time,
 * and once the last card is reached normal vertical scroll resumes. On mobile it
 * falls back to natural vertical stacking.
 */
function CommandCenterSection({ screenData, horizontal }: { screenData: ScreenData; horizontal: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // framer's useScroll({target}) mis-calibrates under Lenis here (it reports
  // document-relative progress), so we drive the horizontal travel from the
  // global pixel scroll against this section's own measured bounds instead.
  const bounds = useRef({ start: 0, end: 1 });
  const { scrollY } = useScroll();
  const travel = (COMMAND_CARDS.length - 1) * 100;
  const x = useTransform(scrollY, (v) => {
    const { start, end } = bounds.current;
    const p = end > start ? Math.min(1, Math.max(0, (v - start) / (end - start))) : 0;
    return `-${p * travel}vw`;
  });

  useEffect(() => {
    if (!horizontal) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      bounds.current = { start: el.offsetTop, end: el.offsetTop + el.offsetHeight - window.innerHeight };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [horizontal]);

  const Card = ({ card }: { card: (typeof COMMAND_CARDS)[number] }) => {
    const Screen = card.Screen;
    return (
      <div className="flex h-screen w-full shrink-0 items-center md:w-screen">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:px-16 2xl:max-w-[110rem] 2xl:gap-24 2xl:px-24">
          <div className="max-w-xl 2xl:max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{card.eyebrow}</span>
            <h2 className="mt-3 text-4xl font-black tracking-tighter sm:text-5xl lg:text-6xl 2xl:text-7xl">{card.heading}</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground lg:text-lg 2xl:max-w-xl">{card.body}</p>
          </div>
          <div className="skeu rounded-3xl p-3">
            <div className="laptop-html-screen w-full" style={{ aspectRatio: "16 / 10" }}>
              <Screen data={screenData} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile / no-horizontal: natural vertical stack of full-height cards.
  if (!horizontal) {
    return (
      <section className="cv-auto">
        {COMMAND_CARDS.map((card) => (
          <Card key={card.key} card={card} />
        ))}
      </section>
    );
  }

  return (
    <section ref={ref} className="relative" style={{ height: `${COMMAND_CARDS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <motion.div className="flex h-full" style={{ x }}>
          {COMMAND_CARDS.map((card) => (
            <Card key={card.key} card={card} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Cinematic laptop hero. ≥1024px gets the pinned, scroll-driven 3D laptop (its
 * lid folds shut on the exit); below that the 3D is hidden in favour of a clean
 * stacked layout. Either way the command-center dashboard follows as a normal
 * section, reached by ordinary scrolling. Latest-analysis data is resolved here
 * (DOM tree, with context) and passed into the screens as plain props.
 */
export function CinematicLaptopStage() {
  const isDesktop = useMinWidth(1024);
  const tier = useDeviceTier();
  const { data: latest } = useLatestAnalysis();
  const screenData: ScreenData = {
    seoScore: latest?.seoScore ?? undefined,
    aiVisibilityScore: latest?.aiVisibilityScore ?? undefined,
  };

  return (
    <>
      {isDesktop ? <PinnedStage tier={tier} screenData={screenData} /> : <StackedSections screenData={screenData} />}
      <CommandCenterSection screenData={screenData} horizontal={isDesktop} />
    </>
  );
}
