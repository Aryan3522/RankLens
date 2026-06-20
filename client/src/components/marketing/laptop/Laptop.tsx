import type { ReactNode } from "react";
import { motion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

/** App-window chrome inside the laptop screen: a slim titlebar + content area. */
export function ScreenShell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#FF5E7A]/70" />
        <span className="h-2 w-2 rounded-full bg-[#FFB648]/70" />
        <span className="h-2 w-2 rounded-full bg-[#29D398]/70" />
        <span className="ml-2 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className={cn("min-h-0 flex-1 p-3 sm:p-4", className)}>{children}</div>
    </div>
  );
}

/**
 * Pure CSS-3D laptop. The screen surface holds real, interactive HTML (no
 * WebGL, no fallback) so the same frame works on every device. Scroll-driven
 * transforms (rotateY / scale / skewY) are passed in as motion values; pass
 * static values under reduced-motion to freeze it.
 */
export function Laptop({
  children,
  rotateY,
  scale,
  skewY,
}: {
  children: ReactNode;
  rotateY?: MotionValue<number> | number;
  scale?: MotionValue<number> | number;
  skewY?: MotionValue<number> | number;
}) {
  return (
    <div className="laptop-3d mx-auto w-full max-w-[640px]">
      <motion.div className="laptop-3d-inner" style={{ rotateY, scale, skewY }}>
        <div className="laptop-screen">
          <div className="laptop-screen-surface">{children}</div>
        </div>
        <div className="laptop-base" />
      </motion.div>
    </div>
  );
}
