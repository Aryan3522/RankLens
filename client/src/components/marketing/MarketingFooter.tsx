import { Link } from "wouter";
import { FileText, GitBranch, Globe, Mail, ShieldCheck, Users } from "lucide-react";

/** Footer ported from the original home page, restyled to be theme-aware. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 px-4 py-8">
      <div className="flex w-full flex-col items-center justify-between gap-4 text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-500" />
            <p className="text-xs">
              © 2026 RankLens · SEO &amp; AI Visibility Intelligence · 100% free core analysis, 100% private
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            3D laptop model “Laptop” by Poly by Google —{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              CC BY 3.0
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <a href="#about" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <Users className="h-3.5 w-3.5" /> About
          </a>
          <a
            href="mailto:contact@ranklens.app"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5" /> Contact
          </a>
          <Link href="/dashboard" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <Globe className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <Link href="/analyzer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <FileText className="h-3.5 w-3.5" /> Analyzer
          </Link>
          <Link href="/keywords" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <GitBranch className="h-3.5 w-3.5" /> Keywords
          </Link>
        </div>
      </div>
    </footer>
  );
}
