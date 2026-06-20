import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { FEATURES } from "../data";

/** Animated bento grid of capabilities with hover depth transforms. */
export function FeaturesBentoSection() {
  return (
    <section className="cv-auto border-y border-white/5 bg-white/[0.015] px-4 py-24">
      <div className="w-full">
        <div className="mb-14 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Capabilities</span>
          <h2 className="mt-4 text-3xl font-black tracking-tighter md:text-5xl">
            Everything a modern audit needs
          </h2>
        </div>

        <motion.div
          variants={staggerContainer(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp(0, 28)}
              whileHover={{ y: -6 }}
              className={cn(
                "depth-card group relative overflow-hidden p-6",
                f.span === "wide" && "sm:col-span-2",
                f.span === "tall" && "lg:row-span-2",
              )}
            >
              {/* subtle corner glow on hover */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <f.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="font-bold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
