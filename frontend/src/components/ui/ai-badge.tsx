import * as React from "react"

import { cn } from "@/lib/utils"

export interface AIBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "primary" | "success" | "warning" | "neutral"
}

export function AIBadge({ className, tone = "neutral", ...props }: AIBadgeProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
      : tone === "primary"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-muted text-muted-foreground border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClass,
        className
      )}
      {...props}
    />
  )
}
