"use client"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { THEME } from "@/lib/constants/color-constants"
import { StatProfile } from "@/types/types"
import { cn } from "@/lib/utils"
import { DistributionEngine } from "@/lib/logic/distribution-engine"

interface StatHpBarProps {
  hpMax: number
  hpPercent: number
  hpCurrent?: number
  statProfile?: StatProfile
  className?: string
  barHeight?: number
  showLabels?: boolean
}

export function StatHpBar({
  hpMax,
  hpPercent,
  hpCurrent,
  statProfile,
  className,
  barHeight = 8,
  showLabels = false
}: StatHpBarProps) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  
  // Variance bounds
  const stats = (statProfile && statProfile.distribution) ? DistributionEngine.getProfileStats(statProfile.distribution) : null
  const hasVariance = !!stats && stats.minHp < stats.maxHp
  const percentiles = (statProfile && statProfile.distribution) ? DistributionEngine.getPercentiles(statProfile.distribution) : null

  // Use median from profile if available, otherwise fixed hpPercent
  // Forced K.O. (hpPercent === 0) takes precedence for the central display
  const centralHp = hpPercent === 0 ? 0 : (stats ? stats.median : (hpCurrent ?? (hpPercent * hpMax / 100)))
  const centralPct = clamp((centralHp / hpMax) * 100)
  
  const minPct = stats ? clamp((stats.minHp / hpMax) * 100) : centralPct
  const maxPct = stats ? clamp((stats.maxHp / hpMax) * 100) : centralPct
  
  // Color based on HP percentage (roughly)
  const getHpColor = (pct: number) => {
    // A pokemon is only "Dead" if hpPercent is strictly 0. 
    // If median is 0 but hpPercent > 0 (uncertain rolls), it's "Low HP" (Red).
    if (pct <= 0 && hpPercent === 0) return THEME.common.disabled
    if (pct <= 20) return THEME.common.hp.low // Red
    if (pct <= 50) return THEME.common.hp.mid // Orange
    return THEME.common.hp.high // Green
  }
  
  const mainColor = getHpColor(centralPct)
  const isDead = hpPercent === 0 

  const content = (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {showLabels && (
        <div className="flex justify-between items-end text-[10px] font-bold uppercase text-slate-500 tracking-wider">
           <span>HP</span>
           <span className="tabular-nums">
              {hasVariance 
                ? `${Math.max(0, Math.round(stats!.minHp))} ~ ${Math.max(0, Math.round(stats!.maxHp))} HP`
                : `${Math.max(0, Math.round(centralHp))} / ${hpMax} HP`
              }
           </span>
        </div>
      )}
      
      <div 
        className="relative w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200"
        style={{ height: `${barHeight}px` }}
      >
        {/* Survival (Solid Min HP) */}
        {!isDead && (
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-300"
            style={{ 
                width: `${minPct}%`, 
                backgroundColor: mainColor 
            }}
          />
        )}
        
        {/* Variance Area (Min to Max) */}
        {hasVariance && (
           <>
             {/* Whisker / Full Range background (very faint) */}
             <div 
               className="absolute top-0 h-full transition-all duration-300 opacity-20"
               style={{ 
                   left: `${minPct}%`, 
                   width: `${maxPct - minPct}%`, 
                   backgroundColor: mainColor 
               }}
             />
             
             {/* Central Zone (IQR) - More visible */}
             <div 
               className="absolute top-0 h-full transition-all duration-300 opacity-50 rounded-[1px]"
               style={(() => {
                  const leftPct = clamp((percentiles!.q25 / hpMax) * 100);
                  const rightPct = clamp((percentiles!.q75 / hpMax) * 100);
                  return { 
                      left: `${leftPct}%`, 
                      width: `${rightPct - leftPct}%`, 
                      backgroundColor: mainColor 
                  };
               })()}
             />
           </>
        )}
        
        {/* Median Marker */}
        {hasVariance && centralHp > 0 && (
           <div 
             className="absolute top-0 w-[1.5px] h-full bg-white transition-all duration-300 z-10"
             style={{ 
                 left: `${centralPct}%`, 
                 transform: "translateX(-50%)", 
                 boxShadow: '0 0 4px rgba(255,255,255,0.8)' 
             }}
           />
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="p-3 text-[11px] space-y-2 bg-slate-900 text-slate-50 border-slate-800 shadow-xl"
        >
          <div className="font-bold border-b border-white/10 pb-1.5 mb-1.5 flex justify-between items-center text-[9px] uppercase tracking-wider text-slate-400">
            <span>Battle Status</span>
            <span 
              className="px-1.5 py-0.5 rounded-[2px] text-[8px] font-black leading-none text-white shadow-sm"
              style={{ 
                backgroundColor: isDead ? THEME.ko.bordeaux : (hasVariance ? THEME.ko.uncertain : THEME.common.success) 
              }}
            >
              {isDead ? "K.O." : (hasVariance ? "Uncertain" : "Fixed")}
            </span>
          </div>
             {hasVariance ? (
               <div className="flex flex-col gap-3 py-2 w-[310px]">
                  {/* Horizontal Abscissa Diagram */}
                  <div className="relative h-20 w-full mt-4 flex items-center select-none translate-y-[-4px]">
                    {/* Calculate dynamic proportions */}
                    {(() => {
                      const range = stats!.maxHp - stats!.minHp;
                      const getPct = (val: number) => range > 0 ? clamp((val - stats!.minHp) / range * 100) : 0;
                      
                      const pctQ5 = getPct(percentiles!.q5);
                      const pctQ25 = getPct(percentiles!.q25);
                      const pctMed = getPct(percentiles!.median);
                      const pctQ75 = getPct(percentiles!.q75);
                      const pctQ95 = getPct(percentiles!.q95);

                      return (
                        <>
                          {/* The Ruler / Axis */}
                          <div className="absolute left-0 w-full h-1.5 bg-slate-800 rounded-full border border-white/5 overflow-hidden">
                             {/* Central Zone (25-75%) Highlight */}
                             <div className="absolute inset-y-0 bg-blue-500/20" style={{ left: `${pctQ25}%`, width: `${pctQ75 - pctQ25}%` }} />
                          </div>

                          {/* All points (ticks + labels + values) */}
                          {(() => {
                            const rawPoints = [
                              { label: "MIN", value: Math.max(0, Math.round(stats!.minHp)), originalPct: 0, color: "text-rose-800" },
                              { label: "Q5", value: Math.round(percentiles!.q5), originalPct: pctQ5, color: "text-red-300" },
                              { label: "Q25", value: Math.round(percentiles!.q25), originalPct: pctQ25, color: "text-blue-300" },
                              { label: "MED", value: Math.round(percentiles!.median), originalPct: pctMed, color: "text-white", isBold: true },
                              { label: "Q75", value: Math.round(percentiles!.q75), originalPct: pctQ75, color: "text-blue-300" },
                              { label: "Q95", value: Math.round(percentiles!.q95), originalPct: pctQ95, color: "text-green-300" },
                              { label: "MAX", value: Math.max(0, Math.round(stats!.maxHp)), originalPct: 100, color: "text-green-400" }
                            ];

                            const MIN_GAP = 15;
                            const items = rawPoints.map(p => ({ ...p, visualPct: p.originalPct }));
                            
                            for (let i = 1; i < items.length; i++) {
                              if (items[i].visualPct < items[i-1].visualPct + MIN_GAP) {
                                items[i].visualPct = items[i-1].visualPct + MIN_GAP;
                              }
                            }
                            
                            if (items[items.length - 1].visualPct > 100) {
                              items[items.length - 1].visualPct = 100;
                              for (let i = items.length - 2; i >= 0; i--) {
                                if (items[i].visualPct > items[i+1].visualPct - MIN_GAP) {
                                  items[i].visualPct = items[i+1].visualPct - MIN_GAP;
                                }
                              }
                            }

                            return items.map((item, i) => {
                              const diff = item.originalPct - item.visualPct;
                              return (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "absolute inset-y-0 flex flex-col justify-between h-full pointer-events-none w-14",
                                    item.visualPct > 5 && item.visualPct < 95 ? "-translate-x-1/2" : "",
                                    item.visualPct >= 95 ? "-translate-x-full" : ""
                                  )}
                                  style={{ left: `${item.visualPct}%` }}
                                >
                                   <div className={cn(
                                     "text-[8px] font-black uppercase tracking-tighter opacity-70 flex-1 flex items-start",
                                     item.color,
                                     item.visualPct <= 5 ? "justify-start" : item.visualPct >= 95 ? "justify-end" : "justify-center"
                                   )}>
                                     {item.label}
                                   </div>
                                   
                                   <div 
                                     className={cn(
                                        "w-[1px] h-3 bg-white/30 absolute top-1/2 -translate-y-1/2",
                                        item.isBold ? "bg-white w-[1.5px] h-4 z-20" : ""
                                     )} 
                                     style={{ 
                                       left: item.visualPct <= 5 ? `calc(0% + ${diff}%)` : (item.visualPct >= 95 ? `calc(100% + ${diff}%)` : `calc(50% + ${diff}%)`) 
                                     }}
                                   />
   
                                   <div className={cn(
                                      "text-[10px] font-bold tabular-nums tracking-tighter flex-1 flex items-end",
                                      item.color,
                                      item.isBold ? "text-[12px] font-black items-center -mb-2" : "",
                                      item.visualPct <= 5 ? "justify-start" : item.visualPct >= 95 ? "justify-end" : "justify-center"
                                   )}>
                                     <div className="flex items-baseline gap-0.5">
                                        <span className={cn(item.isBold && "text-white text-[13px]")}>{item.value}</span>
                                        <span className="opacity-40 text-[8px] font-medium">/{hpMax}</span>
                                     </div>
                                   </div>
                                </div>
                              );
                            });
                          })()}
                        </>
                      );
                    })()}
                  </div>

                  {/* Legend Footer */}
                  <div className="bg-white/5 rounded p-2 border border-white/5 space-y-1 mt-1 text-[8.5px]">
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-bold flex gap-1.5 items-center"><span className="text-red-300">Q5</span>/ <span className="text-green-300">Q95</span></span>
                        <span>5% / 95% extreme outcomes</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-bold flex gap-1.5 items-center"><span className="text-blue-300">Q25</span>/ <span className="text-blue-300">Q75</span></span>
                        <span>25% / 75% realistic outcomes</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-bold text-white">MEDIAN</span>
                        <span>Exact center (50%) of all combinations</span>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 tabular-nums">
                 <span className="text-slate-400 font-medium">Actual</span>
                 <span className="text-white font-bold">{Math.round(centralHp)} / {hpMax} HP</span>
                 
                 <span className="text-slate-400 font-medium">Ratio</span>
                 <span className="text-white font-bold">{hpPercent.toFixed(1)}%</span>
               </div>
             )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
