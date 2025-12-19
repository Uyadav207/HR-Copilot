import * as React from "react"

import { cn } from "@/lib/utils"

export interface GradientTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements
}

/**
 * Kept for compatibility with earlier UI work.
 * In the simplified theme, this is just a convenience wrapper.
 */
export function GradientText({ className, children, as = "span", ...props }: GradientTextProps) {
  const Comp = as as any
  return (
    <Comp className={cn("text-foreground", className)} {...props}>
      {children}
    </Comp>
  )
}
