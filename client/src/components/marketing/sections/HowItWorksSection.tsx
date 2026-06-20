import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { fadeUp, staggerContainer, useReveal } from "@/lib/motion";
import { HOW_IT_WORKS } from "../data";

/** Scroll-driven Analyze → Discover → Optimize → Rank narrative. */
export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Vertical progress line that fills as you scroll through the section.
  const lineScale = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);
  const { ref, animate } = useReveal();

  return (
    <section id="how" ref={sectionRef} className="cv-auto border-y border-white/5 bg-white/[0.015] px-4 py-24">
      <div className="w-full">
        <motion.div
          ref={ref}
          variants={fadeUp()}
          initial="hidden"
          animate={animate}
          className="mb-16 text-center"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-primary">How RankLens works</span>
          <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
            From URL to action plan in seconds
          </h2>
        </motion.div>

        <div className="relative">
          {/* progress rail */}
          <div className="absolute left-[27px] top-2 bottom-2 hidden w-px bg-white/10 sm:block">
            <motion.div
              style={{ scaleY: lineScale }}
              className="h-full w-full origin-top bg-gradient-to-b from-cyan-400 via-purple-400 to-pink-400"
            />
          </div>

          <motion.ol
            variants={staggerContainer(0.15)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10%" }}
            className="m-0 list-none space-y-6 p-0"
          >
            {HOW_IT_WORKS.map((s, i) => (
              <motion.li key={s.step} variants={fadeUp(0, 30)} className="flex items-start gap-5">
                <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-black text-cyan-300 backdrop-blur-md">
                  0{i + 1}
                </span>
                <div className="depth-card flex-1 p-5">
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-400">{s.step}</div>
                  <h3 className="mt-1 text-lg font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
