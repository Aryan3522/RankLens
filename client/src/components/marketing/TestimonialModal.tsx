import { useState } from "react";
import { Quote, Send, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ranklens.pendingTestimonials";

type Pending = { name: string; role: string; quote: string; rating: number; submittedAt: string };

/** Persist a submission locally (no backend yet — Supabase phase will sync + gate
 *  admin approval). Kept resilient to storage being unavailable. */
function savePending(t: Pending) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: Pending[] = raw ? JSON.parse(raw) : [];
    list.unshift(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* storage blocked — submission still acknowledged to the user */
  }
}

/**
 * Premium "share your story" submission modal. Validates client-side and stores
 * the testimonial locally as pending; real persistence + admin approval arrive
 * with the Supabase phase. Trigger is passed as children.
 */
export function TestimonialModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);

  const submit = () => {
    if (!name.trim() || !quote.trim()) {
      toast.error("Add your name and a few words to submit.");
      return;
    }
    savePending({ name: name.trim(), role: role.trim(), quote: quote.trim(), rating, submittedAt: new Date().toISOString() });
    toast.success("Thanks! Your story is in review — we'll publish it once approved.");
    setOpen(false);
    setName("");
    setRole("");
    setQuote("");
    setRating(5);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="skeu max-w-lg gap-0 border-none p-0 sm:rounded-2xl">
        <div className="relative overflow-hidden rounded-t-2xl px-6 pt-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
          <DialogHeader className="relative">
            <span className="skeu-sm inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Quote className="h-3.5 w-3.5" /> Share your story
            </span>
            <DialogTitle className="mt-3 text-2xl font-black tracking-tighter">
              How has RankLens helped you?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Your testimonial is reviewed before it goes live on the wall.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Chen" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Role / company</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Head of Growth, Lumen" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Your experience</label>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What changed after using RankLens?"
              rows={4}
              maxLength={280}
            />
            <span className="self-end text-[10px] text-muted-foreground/60">{quote.length}/280</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Rating</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={n <= rating ? "h-5 w-5 fill-[#FFB648] text-[#FFB648]" : "h-5 w-5 text-muted-foreground/40"} />
                </button>
              ))}
            </div>
          </div>

          <Button onClick={submit} className="mt-2 w-full gap-2 font-bold">
            Submit for review <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
