"use client"

import { useEffect, useState } from "react"

interface ScoreBreakdownProps {
  thermal: number
  wind: number
  sun: number
  winner?: boolean
}

const rows = [
  ["Thermal comfort", "thermal"],
  ["Wind quality", "wind"],
  ["Sunlight balance", "sun"]
] as const

export default function ScoreBreakdown({ thermal, wind, sun, winner = false }: ScoreBreakdownProps) {
  const [mounted, setMounted] = useState(false)
  const scores = { thermal, wind, sun }
  const fill = winner ? "bg-livably-green" : "bg-gray-400"

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="space-y-4">
      {rows.map(([label, key]) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between text-[13px]">
            <span className="text-livably-muted">{label}</span>
            <span className="font-medium text-livably-text">{scores[key]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-livably-border">
            <div
              className={`h-full rounded-full ${fill} transition-[width] duration-[600ms] ease-out`}
              style={{ width: mounted ? `${scores[key]}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
