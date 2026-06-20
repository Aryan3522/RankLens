import { PlusCircle } from "lucide-react";
import VelocityMarquee from "@/components/ui/velocity-marquee";
import { Button } from "@/components/ui/button";
import { TestimonialModal } from "../TestimonialModal";
import { TESTIMONIALS } from "../data";

// Map our testimonials onto the VelocityMarquee item shape. Alternating
// blue/purple accents keep it on-brand; no score → the card's gauge stays hidden.
const ACCENTS = ["from-primary to-secondary", "from-secondary to-accent-cyan", "from-accent-cyan to-primary"];
const ITEMS = TESTIMONIALS.map((t, i) => ({
  name: t.name,
  purpose: t.role,
  description: t.quote,
  color: ACCENTS[i % ACCENTS.length],
}));

/**
 * Social proof as an interactive velocity marquee (FutureUIKit) — two rows
 * drifting in opposite directions that react to scroll speed, with hover-glow
 * cards. A submission modal lets visitors add their own (pending review).
 */
export function TestimonialsSection() {
  return (
    <section className="cv-auto overflow-hidden py-24">
      <div className="mb-10 px-4 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Loved by operators</span>
        <h2 className="mt-3 text-3xl font-black tracking-tighter md:text-5xl">Teams ship faster with RankLens</h2>
      </div>

      <VelocityMarquee items={ITEMS} />

      <div className="mt-10 flex justify-center px-4">
        <TestimonialModal>
          <Button variant="outline" className="gap-2 rounded-full font-bold">
            <PlusCircle className="h-4 w-4" /> Share your story
          </Button>
        </TestimonialModal>
      </div>
    </section>
  );
}
