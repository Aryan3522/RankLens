import React from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Retained for call-site compatibility; no longer used (skeuomorphic surfaces have no glow). */
  glowColor?: string;
  /** Lift + press feedback on hover/active for interactive surfaces. */
  interactive?: boolean;
}

/**
 * Raised skeuomorphic surface. Replaces the old glassmorphic glow card —
 * same name/props so existing call sites convert with no edits.
 */
export function GlowCard({ children, className, glowColor: _glowColor, interactive, ...props }: GlowCardProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl skeu p-4", interactive && "skeu-interactive", className)}
      {...props}
    >
      {children}
    </div>
  );
}
