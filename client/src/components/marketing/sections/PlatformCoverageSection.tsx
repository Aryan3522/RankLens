import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { PLATFORMS } from "../data";

/** Floating cards for each surface RankLens covers. */
export function PlatformCoverageSection() {
  return (
    <section id="platforms" className="cv-auto px-4 py-24">
      <div className="w-full">
        <div className="mb-14 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Platform coverage</span>
          <h2 className="mt-3 text-3xl font-black tracking-tighter md:text-5xl">One lens, every surface</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Analyze the places your audience actually discovers you — search, AI answers, and social.
          </p>
        </div>

        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PLATFORMS.map((p) => (
            <motion.div
              key={p.name}
              variants={fadeUp(0, 28)}
              whileHover={{ y: -6 }}
              className="depth-card group relative overflow-hidden p-6"
            >
              <div
                className="mb-4 grid h-12 w-12 place-items-center rounded-xl border"
                style={{
                  background: `hsl(${p.accent} / 0.12)`,
                  borderColor: `hsl(${p.accent} / 0.3)`,
                }}
              >
                <p.icon className="h-5 w-5" style={{ color: `hsl(${p.accent})` }} />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
                {p.status === "soon" ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Soon
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
