import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Faq = { q: string; a: string };

/**
 * Futuristic, searchable FAQ — a live-filtered list of glass rows that expand
 * with a smooth motion reveal (not a stock accordion). Single-open for focus;
 * an active row lights up with a gradient rail.
 */
export function FaqExplorer({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs
      .map((f, i) => ({ ...f, i }))
      .filter((f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <div className="w-full">
      {/* Search */}
      <div className="skeu-inset mx-auto mb-6 flex max-w-2xl items-center gap-3 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          aria-label="Search FAQs"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 lg:gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.map((f) => {
            const isOpen = open === f.i;
            return (
              <motion.div
                key={f.i}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "skeu-sm group relative overflow-hidden rounded-2xl transition-shadow",
                  isOpen && "ring-1 ring-primary/30",
                )}
              >
                {/* gradient rail on the active item */}
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary to-secondary transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                />
                <button
                  onClick={() => setOpen(isOpen ? null : f.i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-base font-bold tracking-tight">{f.q}</span>
                  <Plus
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary transition-transform duration-300",
                      isOpen ? "rotate-45" : "group-hover:rotate-90",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="skeu-sm rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
            No questions match “{query}”. Try a different term.
          </div>
        )}
      </div>
    </div>
  );
}
