import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-sm font-medium tracking-[-0.05em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Primary filled — Pencil: bg #5538B6, hover #351D87 */
        default:
          "bg-primary text-primary-foreground hover:bg-primary-dark",
        /* Destructive — error state */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /* Primary outline — border #5538B6, text #5538B6, white background (h-[50px] via size lg) */
        outline:
          "border border-primary text-primary bg-background hover:bg-primary-50",
        /* Secondary filled — bg #EEEBF9 (light primary), text #5538B6, no border */
        secondary:
          "bg-primary-50 text-primary hover:bg-primary-100",
        /* Neutral ghost — border #CACACA, text #424242 */
        ghost:
          "border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50",
        /* Neutral filled — bg #CACACA, text #424242 (h-[50px] via size lg) */
        neutral:
          "bg-gray-200 text-gray-700 hover:bg-gray-100",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-[50px] px-6",
        icon:    "h-10 w-10",
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
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
