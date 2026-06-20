import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { PRICING_CURRENCY, PRICING_TIERS } from "../data";

/** Pricing with an animated monthly/annual toggle. Free tier stays unlocked. */
export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="cv-auto border-y border-white/5 bg-white/[0.015] px-4 py-24">
      <div className="w-full">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</span>
          <h2 className="mt-3 text-3xl font-black tracking-tighter md:text-5xl">
            Core analysis is free, forever
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Every website audit, score, and recommendation is free. Paid plans add team and API features on top —
            they never lock the core analysis.
          </p>

          {/* billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 text-sm font-semibold backdrop-blur-md">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn("relative rounded-full px-4 py-1.5 transition-colors", !annual && "text-background")}
            >
              {!annual && (
                <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-primary" />
              )}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn("relative rounded-full px-4 py-1.5 transition-colors", annual && "text-background")}
            >
              {annual && (
                <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-primary" />
              )}
              <span className="relative z-10">
                Annual <span className="text-emerald-400">save up to 20%</span>
              </span>
            </button>
          </div>
        </div>

        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="grid grid-cols-1 gap-5 lg:grid-cols-3"
        >
          {PRICING_TIERS.map((tier) => {
            const price = annual ? tier.annual : tier.monthly;
            return (
              <motion.div
                key={tier.name}
                variants={fadeUp(0, 28)}
                className={cn(
                  "relative flex flex-col rounded-3xl p-7",
                  tier.highlighted
                    ? "skeu ring-2 ring-primary/40"
                    : "skeu",
                )}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-[11px] font-black uppercase tracking-wider text-background">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}
                <h3 className="text-lg font-black tracking-tight">{tier.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{tier.tagline}</p>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-5xl font-black tracking-tighter">
                    {PRICING_CURRENCY}
                    {price}
                  </span>
                  <span className="pb-2 text-sm text-muted-foreground">
                    {price === 0 ? "/ forever" : annual ? "/ mo, billed yearly" : "/ mo"}
                  </span>
                </div>
                <div className="skeu-inset mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {tier.highlight}
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/analyzer" className="mt-7">
                  <Button
                    variant={tier.highlighted ? "default" : "outline"}
                    className="w-full font-bold"
                    size="lg"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
