import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock } from "lucide-react";

// Shows a live countdown when the server rate-limits an analysis (HTTP 429).
// Submit stays disabled by the parent until `seconds` elapses.
export function RateLimitDialog({
  open,
  seconds,
  onOpenChange,
}: {
  open: boolean;
  seconds: number;
  onOpenChange: (open: boolean) => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!open) return;
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, seconds]);

  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-amber-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            Slow down a moment
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            To keep RankLens fast and free for everyone, analyses are limited to one per minute.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="text-6xl font-black tabular-nums text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            {remaining}
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            {remaining > 0 ? "seconds remaining" : "ready — try again"}
          </p>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
