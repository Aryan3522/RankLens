import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // @replit
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          "border-primary/50 bg-primary/20 text-primary shadow-[0_0_10px_rgba(6,182,212,0.2)]",
        secondary:
          "border-secondary/50 bg-secondary/20 text-secondary shadow-[0_0_10px_rgba(139,92,246,0.2)]",
        destructive:
          "border-destructive/50 bg-destructive/20 text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]",
        outline: "text-foreground border border-white/20 bg-white/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
