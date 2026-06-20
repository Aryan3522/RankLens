import { BookOpen, CalendarClock, Check, ChevronRight, ExternalLink, Users } from "lucide-react";
import { FaqExplorer } from "../FaqExplorer";
import {
  FAQS,
  PUBLISHED_ISO,
  PUBLISHED_LABEL,
  SOURCES,
  UPDATED_ISO,
  UPDATED_LABEL,
  WHAT_WE_MEASURE,
} from "../data";

/**
 * About / E-E-A-T credibility block + FAQ accordion. Carries the authorship,
 * freshness, and authoritative-sources signals AI answer engines reward, plus
 * the visible Q&A that backs the FAQPage JSON-LD injected by the page.
 *
 * Both sections are full-bleed and fill the viewport (min-h-screen, vertically
 * centred). There's no fixed max-width container — the content fans out into
 * columns so it scales with the screen instead of sitting in a narrow rail.
 */
export function AboutFaqSection() {
  return (
    <>
      {/* About / E-E-A-T */}
      <section
        id="about"
        className="cv-auto flex min-h-screen flex-col justify-center border-t border-white/5 bg-white/[0.015] px-6 py-24 md:px-12 lg:px-20 2xl:px-32"
      >
        <div className="w-full">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">About RankLens</span>
          </div>
          <h2 className="mb-5 text-4xl font-black tracking-tighter md:text-5xl lg:text-6xl">Who's behind RankLens</h2>
          <p className="byline mb-4 max-w-4xl text-lg leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">RankLens</strong> is built by an independent team of
            <strong className="font-semibold text-foreground"> SEO and AI-search researchers</strong> — every score is
            evidence-based and explained, never guessed.
          </p>
          <p className="mb-14 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80">
            <CalendarClock className="h-3.5 w-3.5 text-primary/70" />
            Published <time dateTime={PUBLISHED_ISO}>{PUBLISHED_LABEL}</time>
            <span className="text-muted-foreground/40">·</span>
            Last updated <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
          </p>

          {/* Two evidence columns — fan out to use the full width on desktop. */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
                <Check className="h-5 w-5 text-emerald-400" /> What every analysis measures
              </h3>
              <ul className="space-y-3 text-base text-muted-foreground">
                {WHAT_WE_MEASURE.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-primary/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
                <BookOpen className="h-5 w-5 text-primary" /> Sources &amp; standards we build on
              </h3>
              <ul className="space-y-3 text-base">
                {SOURCES.map((s) => (
                  <li key={s.href} className="flex items-start gap-2.5">
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-primary/70" />
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary/60"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="cv-auto flex min-h-screen flex-col justify-center border-t border-white/5 px-6 py-24 md:px-12 lg:px-20 2xl:px-32"
      >
        <h2 className="mb-12 text-center text-4xl font-black tracking-tighter md:text-5xl lg:text-6xl">
          Questions, answered
        </h2>
        <FaqExplorer faqs={FAQS} />
      </section>
    </>
  );
}
