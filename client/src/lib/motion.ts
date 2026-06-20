import { useRef } from "react";
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";

/** Shared easing + timing so every section animates with one voice. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const DURATION = { fast: 0.4, base: 0.6, slow: 0.9 } as const;

/** Fade + rise, optionally delayed. The workhorse reveal. */
export const fadeUp = (delay = 0, y = 24): Variants => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT, delay },
  },
});

/** Parent that staggers its children's reveals. */
export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export const scaleIn = (delay = 0): Variants => ({
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE_OUT, delay },
  },
});

export const blurIn = (delay = 0): Variants => ({
  hidden: { opacity: 0, filter: "blur(12px)" },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: DURATION.slow, ease: EASE_OUT, delay },
  },
});

/**
 * Reveal-on-scroll: returns a ref + the variant control string. Use as
 * `const { ref, animate } = useReveal(); <motion.div ref={ref} variants={fadeUp()}
 *   initial="hidden" animate={animate}>`. Honors reduced-motion.
 */
export function useReveal<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const prefersReduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });
  return { ref, animate: prefersReduced || inView ? "show" : "hidden" } as const;
}

/**
 * Magnetic pointer attraction for CTAs. Spread the returned handlers + style
 * onto a motion element. Collapses to no-op under reduced-motion.
 */
export function useMagnetic(strength = 0.4) {
  const prefersReduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });

  const onMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { style: { x, y }, onMouseMove, onMouseLeave } as const;
}

/** Map a 0..1 scroll progress to a vertical parallax offset in px. */
export function useParallax(progress: MotionValue<number>, distance = 60) {
  const prefersReduced = useReducedMotion();
  return useTransform(progress, [0, 1], prefersReduced ? [0, 0] : [distance, -distance]);
}
