import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer glow-border-effect relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground border border-primary/50 hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md",
        destructive:
          "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md",
        outline:
          "border border-primary/30 bg-black/40 text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-xl",
        secondary:
          "bg-secondary/20 text-secondary border border-secondary/50 hover:bg-secondary/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] backdrop-blur-md",
        ghost: "border border-transparent hover:bg-white/10 hover:text-white backdrop-blur-md",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 glow-border-effect-none border-none",
      },
      size: {
        // @replit changed sizes
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
  ({ className, variant, size, asChild = false, onMouseMove, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (onMouseMove) onMouseMove(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onMouseMove={variant !== 'link' ? handleMouseMove : onMouseMove}
        style={{
          ...style,
          ...(variant !== 'link' ? {
            "--mouse-x": `${position.x}px`,
            "--mouse-y": `${position.y}px`,
          } : {}),
        } as React.CSSProperties}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
