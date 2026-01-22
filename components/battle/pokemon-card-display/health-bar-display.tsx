"use client"

import { cn } from "@/lib/utils"

interface HealthBarDisplayProps {
  hpPercent: number
  showText?: boolean
  className?: string
  height?: number
}

export function HealthBarDisplay({ 
  hpPercent, 
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
            "text-[9px] font-bold w-[28px] text-right",
            hpPercent === 0 ? "text-gray-400" : "text-gray-700" 
        )}>
          {Math.round(hpPercent)}%
        </span>
      )}
    </div>
  )
}
