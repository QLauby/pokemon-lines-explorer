import { StatHpBar } from "../../shared/stat-hp-bar"
import { cn } from "@/lib/utils/cn"
import { DistributionEngine } from "@/lib/logic/distribution-engine"

interface HealthBarDisplayProps {
  hpPercent: number
  hpMode?: "percent" | "hp" | "rolls"
  hpMax?: number
  hpCurrent?: number
  showText?: boolean
  className?: string
  height?: number
  statProfile?: import("@/types/types").StatProfile
}

export function HealthBarDisplay({ 
  hpPercent, 
  hpMode = "percent",
  hpMax = 100,
  hpCurrent,
  showText = true, 
  className,
  height = 10,
  statProfile
}: HealthBarDisplayProps) {
  
  const stats = (statProfile && statProfile.distribution) ? DistributionEngine.getProfileStats(statProfile.distribution) : null
  const hasVariance = !!stats && stats.minHp < stats.maxHp
  const currentMeanHp = (hpMode === "rolls" && stats) ? stats.meanHp : (hpCurrent ?? (hpPercent * hpMax / 100))

  return (
    <div className={cn("w-full flex items-center gap-1.5", className)}>
      <StatHpBar
        hpMax={hpMax}
        hpPercent={hpPercent}
        hpCurrent={hpCurrent}
        statProfile={hpMode === "rolls" ? statProfile : undefined}
        barHeight={height}
        className="flex-1"
      />
      
      {/* Show numeric values only if there's no uncertainty */}
      {showText && !hasVariance && (
        <div className="flex items-center text-[10px] font-bold text-slate-700 tabular-nums shrink-0 mt-[1px]">
          <span className="flex items-baseline gap-0.5">
             <span className="text-[11px] font-bold">{Math.round(currentMeanHp)}</span>
             <span className="text-slate-400 text-[9px] font-medium">/{hpMax}</span>
          </span>
        </div>
      )}
    </div>
  )
}
