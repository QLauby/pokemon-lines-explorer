"use client"

import { cn } from "@/lib/utils/cn"

interface HealthBarDisplayProps {
  hpPercent: number
  hpMode?: "percent" | "hp"
  hpMax?: number
  hpCurrent?: number
  showText?: boolean
  className?: string
  height?: number
}

export function HealthBarDisplay({ 
  hpPercent, 
  hpMode = "percent",
  hpMax = 100,
  hpCurrent,
  showText = true, 
  className,
  height = 6 
}: HealthBarDisplayProps) {
  // Color logic
  let colorClass = "bg-green-500" // >= 50%
  if (hpPercent < 20) {
    colorClass = "bg-red-500"
  } else if (hpPercent < 50) {
    colorClass = "bg-orange-500"
  }

  return (
    <div className={cn("w-full flex items-center gap-1.5", className)}>
      <div className={cn("flex-1 bg-gray-200 rounded-full overflow-hidden", `h-[${height}px]`)} style={{ height }}>
        <div
          className={cn("h-full transition-all duration-300 ease-in-out", colorClass)}
          style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
        />
      </div>
      {showText && (
        <span className={cn(
            "text-[9px] font-bold text-right shrink-0",
            hpPercent === 0 ? "text-gray-400" : "text-gray-700",
            hpMode === "hp" ? "w-[42px]" : "w-[28px]"
        )}>
          {hpMode === "hp" && hpCurrent !== undefined
            ? `${hpCurrent}/${hpMax}`
            : `${hpPercent % 1 === 0 ? hpPercent.toFixed(0) : hpPercent.toFixed(1)}%`
          }
        </span>
      )}
    </div>
  )
}
