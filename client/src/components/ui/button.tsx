import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer relative",
  {
    variants: {
      variant: {
        default: "skeu-btn-primary",
        destructive: "skeu-btn text-destructive",
        outline: "skeu-inset text-foreground hover:text-primary",
        secondary: "skeu-btn text-secondary",
        ghost: "border border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 border-none",
      },
      size: {
        default: "min-h-10 px-6 py-2",
        sm: "min-h-8 px-4 text-xs",
        lg: "min-h-12 px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
