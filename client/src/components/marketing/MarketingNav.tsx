import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Command as CommandIcon, Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";

/**
 * Floating glassmorphic nav. Minimal by design: logo · search · theme · auth.
 * Condenses on scroll. The authed variant (settings + profile) is scaffolded
 * behind `authed` and wired up once the Supabase auth phase lands.
 */
export function MarketingNav({ authed = false }: { authed?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Flush, full-width top bar — no top padding/margin, transparent until
          scroll, then a full-bleed glass bar. Aligned across all screen sizes. */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          scrolled ? "glass-panel-strong border-b border-white/5" : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 transition-all duration-300 sm:px-6 lg:px-10",
            scrolled ? "h-14" : "h-16 sm:h-20",
          )}
        >
          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl skeu-sm text-primary">
              <CommandIcon className="h-4 w-4" />
            </span>
            <span className="text-lg font-black tracking-tighter">RankLens</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search / command palette */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full skeu-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-full skeu-sm px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>

            <ThemeToggle />

            {authed ? (
              <>
                <Link
                  href="/dashboard"
                  className="grid h-9 w-9 place-items-center rounded-full skeu-sm text-muted-foreground hover:text-foreground"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 text-xs font-black"
                  aria-label="Profile"
                >
                  RL
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="skeu-btn whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-foreground sm:px-4 sm:text-sm"
              >
                Login / Sign up
              </Link>
            )}
          </div>
        </div>
      </motion.header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
