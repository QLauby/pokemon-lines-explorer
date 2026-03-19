import { THEME } from "@/lib/constants/color-constants"
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
  let color: string = THEME.common.hp.high // >= 50%
  if (hpPercent < 20) {
    color = THEME.common.hp.low
  } else if (hpPercent < 50) {
    color = THEME.common.hp.mid
  }

  return (
    <div className={cn("w-full flex items-center gap-1.5", className)}>
      <div className={cn("flex-1 rounded-full overflow-hidden", `h-[${height}px]`)} style={{ height, backgroundColor: THEME.counter.bg /* reuse slate-200 */ }}>
        <div
          className={cn("h-full transition-all duration-300 ease-in-out")}
          style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%`, backgroundColor: color }}
        />
      </div>
      {showText && (
        <span className={cn(
            "text-[9px] font-bold text-right shrink-0",
            hpPercent === 0 ? "text-slate-400" : "text-slate-700",
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
