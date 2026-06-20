import { Brain, ClipboardPaste, Globe, Instagram, Search, Youtube, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenShell } from "./Laptop";
import { useAnalyze } from "../useAnalyze";

const COVERAGE = [
  { icon: Globe, label: "Google" },
  { icon: Brain, label: "AI Search" },
  { icon: Youtube, label: "YouTube" },
  { icon: Instagram, label: "Instagram" },
];

/** Scene 0 — the interactive URL command input + coverage badges, inside the screen. */
export function HeroScreen() {
  const { url, setUrl, analyze, isPending } = useAnalyze();

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      /* clipboard blocked — type manually */
    }
  };

  return (
    <ScreenShell label="RankLens · Analyzer" className="flex flex-col justify-center gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Analyze any URL</div>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Website, YouTube, or Instagram — one scan.</p>
      </div>

      <div className="skeu flex items-center gap-2 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="Paste a URL…"
          aria-label="URL to analyze"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={paste}
          className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground sm:flex"
          aria-label="Paste from clipboard"
        >
          <ClipboardPaste className="h-3.5 w-3.5" /> Paste
        </button>
        <Button onClick={() => analyze()} disabled={isPending} className="h-auto shrink-0 gap-1.5 px-4 py-2 text-sm font-bold">
          {isPending ? "…" : <>Analyze <Zap className="h-3.5 w-3.5" /></>}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {COVERAGE.map((c) => (
          <span key={c.label} className="skeu-sm inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <c.icon className="h-3 w-3 text-primary" /> {c.label}
          </span>
        ))}
      </div>
    </ScreenShell>
  );
}
