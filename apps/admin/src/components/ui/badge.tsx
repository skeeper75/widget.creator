import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium tracking-[-0.05em] transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Primary — Pencil: bg #5538B6, white text */
        default:
          "border-transparent bg-primary text-primary-foreground",
        /* Warning — Pencil: bg #E6B93F, dark text */
        warning:
          "border-transparent bg-warning text-warning-foreground",
        /* Success — Pencil: bg #7AC8C4, dark text */
        success:
          "border-transparent bg-success text-success-foreground",
        /* Destructive — error */
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        /* Outline — subtle bordered badge */
        outline:
          "text-foreground border-border",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
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
