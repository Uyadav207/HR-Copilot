"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface AnimatedCounterProps {
  value: number
  durationMs?: number
  decimals?: number
  className?: string
  formatter?: (value: number) => string
}

export function AnimatedCounter({
  value,
  durationMs = 650,
  decimals = 0,
  className,
  formatter,
}: AnimatedCounterProps) {
  const [display, setDisplay] = React.useState(0)
  const startValueRef = React.useRef(0)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const start = performance.now()
    const from = startValueRef.current
    const to = value

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (to - from) * eased
      setDisplay(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        startValueRef.current = to
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  const rounded = React.useMemo(() => {
    const factor = Math.pow(10, decimals)
    return Math.round(display * factor) / factor
  }, [display, decimals])

  const text = formatter ? formatter(rounded) : rounded.toFixed(decimals)

  return <span className={cn("tabular-nums", className)}>{text}</span>
}
