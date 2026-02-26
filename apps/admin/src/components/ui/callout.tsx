import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const calloutVariants = cva(
  "flex items-start gap-3 rounded-[5px] border px-4 py-3 text-sm tracking-[-0.05em]",
  {
    variants: {
      variant: {
        /* Pencil Callout (toUDX): circle "!" icon, text #5538B6 */
        info:    "border-primary/30 bg-primary-50 text-primary",
        warning: "border-warning/30 bg-[#FDF8E7] text-[#7A6020]",
        error:   "border-error/30 bg-[#FEF2F2] text-error",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const ICONS = {
  info:    AlertCircle,
  warning: AlertTriangle,
  error:   AlertCircle,
} as const

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {}

function Callout({ className, variant = "info", children, ...props }: CalloutProps) {
  const Icon = ICONS[variant ?? "info"]
  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="leading-[1.714]">{children}</div>
    </div>
  )
}

export { Callout, calloutVariants }
