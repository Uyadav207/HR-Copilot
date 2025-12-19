import * as React from "react"

import { cn } from "@/lib/utils"

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "soft" | "normal"
}

export function GlowCard({ className, intensity = "normal", ...props }: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl",
        "shadow-glass transition-all duration-200",
        "hover:border-white/15 hover:shadow-glow",
        intensity === "soft" && "hover:shadow-glass",
        className
      )}
      {...props}
    />
  )
}
