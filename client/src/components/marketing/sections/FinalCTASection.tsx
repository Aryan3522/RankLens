import { useRef } from "react";
import { motion } from "framer-motion";
import { Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/motion";
import { useAnalyze } from "../useAnalyze";

/** Conversion-focused closer with a pointer-tracked spotlight backdrop. */
export function FinalCTASection() {
  const { url, setUrl, analyze, isPending } = useAnalyze();
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current!.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    ref.current!.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <section className="px-4 py-24 md:py-32">
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        variants={fadeUp()}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="spotlight-bg aurora-bg relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-card/40 p-10 text-center backdrop-blur-xl md:p-16"
      >
        <h2 className="text-3xl font-black tracking-tighter md:text-5xl">See how AI sees your site</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Run your first analysis now — no account, no cost. Results in seconds.
        </p>

        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
          <div className="skeu flex flex-1 items-center gap-3 rounded-2xl px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="Paste a website URL"
              className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground/60"
              aria-label="URL to analyze"
            />
          </div>
          <Button
            onClick={() => analyze()}
            disabled={isPending}
            size="lg"
            className="h-auto shrink-0 gap-2 px-8 py-4 text-base font-bold"
          >
            {isPending ? "Starting…" : <>Analyze <Zap className="h-4 w-4" /></>}
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
