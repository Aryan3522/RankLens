import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sun/moon theme switch. Guards on `mounted` so the icon doesn't flip on the
 * first client frame before next-themes has resolved the stored theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-foreground/80 backdrop-blur-md transition-all hover:text-foreground hover:border-white/20 glow-border-effect",
        className,
      )}
    >
      {/* Render a neutral placeholder until mounted to avoid hydration flip */}
      {mounted ? (
        <>
          <Sun
            className={cn(
              "absolute h-4 w-4 transition-all duration-300",
              isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
            )}
          />
          <Moon
            className={cn(
              "absolute h-4 w-4 transition-all duration-300",
              isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
            )}
          />
        </>
      ) : (
        <Moon className="h-4 w-4 opacity-60" />
      )}
    </button>
  );
}
