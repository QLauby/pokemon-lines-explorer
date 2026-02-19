"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Effect } from "@/types/types"
import React from "react"

interface HpChangeEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
}

export function HpChangeEffect({
    effect,
    onUpdate,
    readOnly,
    initialHp
}: HpChangeEffectProps & { initialHp?: number }) {
    const delta = effect.deltas[0]
    
    if (!delta || delta.type !== "HP_RELATIVE") {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    const currentAmount = Math.abs(delta.amount)
    
    // Manage local UI state for healing/damage mode to allow toggling at 0
    // If delta.amount is not 0, it dictates the mode.
    // If delta.amount IS 0, we rely on local state.
    const [isHealingUI, setIsHealingUI] = React.useState(delta.amount > 0)

    // Sync local state when external amount changes significantly (non-zero)
    React.useEffect(() => {
        if (delta.amount !== 0) {
            setIsHealingUI(delta.amount > 0)
        }
    }, [delta.amount])

    const isHealing = delta.amount !== 0 ? delta.amount > 0 : isHealingUI

    const handleAmountChange = (val: number) => {
        const newAmount = isHealing ? val : -val
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount }]
        })
    }

    const handleModeToggle = () => {
        const newIsHealing = !isHealing
        setIsHealingUI(newIsHealing) // Update local UI immediately
        
        // If non-zero, update the actual effect too
        if (currentAmount !== 0) {
             const newAmount = newIsHealing ? currentAmount : -currentAmount
             onUpdate({
                ...effect,
                deltas: [{ ...delta, amount: newAmount }]
            })
        }
    }

    // --- Visualization Logic ---
    const getHpColor = (pct: number) => {
        if (pct >= 50) return "bg-green-500"
        if (pct >= 20) return "bg-orange-500"
        return "bg-red-500"
    }

    // Default to 100% or 0% for visualization if initialHp is missing
    let barContent = null

    if (initialHp !== undefined) {
        if (!isHealing) {
            // DAMAGE: 100% -> 80%
            // Show 80% as HP color, then 20% as transparent red
            const startHp = initialHp
            const endHp = Math.max(0, startHp - currentAmount)
            const damage = startHp - endHp // Actual damage taken (capped at 0)
            
            barContent = (
                <>
                    {/* Remaining HP */}
                    <div 
                        className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white", getHpColor(endHp))}
                        style={{ width: `${endHp}%` }}
                    >
                        {endHp > 10 && `${endHp}%`}
                    </div>
                    {/* Damage */}
                    <div 
                        className="absolute top-0 h-full bg-red-500/50 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ left: `${endHp}%`, width: `${damage}%` }}
                    >
                        {damage > 5 && `-${damage}%`}
                    </div>
                </>
            )
        } else {
            // HEALING: 20% -> 70%
            // Show 20% as HP color (red), then 50% as Pale Green
            const startHp = initialHp
            const endHp = Math.min(100, startHp + currentAmount)
            const healed = endHp - startHp

            barContent = (
                <>
                    {/* Initial HP */}
                    <div 
                        className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white", getHpColor(startHp))}
                        style={{ width: `${startHp}%` }}
                    >
                        {startHp > 10 && `${startHp}%`}
                    </div>
                    {/* Healed Amount */}
                    <div 
                        className="absolute top-0 h-full bg-green-500/50 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ left: `${startHp}%`, width: `${healed}%` }}
                    >
                        {healed > 5 && `+${healed}%`}
                    </div>
                </>
            )
        }
    } else {
        // Fallback: Just show the amount as a bar (Old behavior)
        const percentage = Math.min(Math.max(currentAmount, 0), 100)
        barContent = (
             <div 
                className={cn(
                    "h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white",
                    isHealing ? "bg-green-500/50" : "bg-red-500/50" // Fallback fallback style
                )}
                style={{ width: `${percentage}%` }}
             >
                {percentage > 5 && `${percentage}%`}
             </div>
        )
    }
    
    return (
        <div className="flex items-center gap-3">
            {/* HP Bar Visualization */}
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200">
                {barContent}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                        "w-7 h-7 font-bold text-sm transition-all border",
                        isHealing
                        ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    )}
                    onClick={handleModeToggle}
                    disabled={readOnly}
                    title={isHealing ? "Switch to Damage" : "Switch to Healing"}
                >
                    {isHealing ? "+" : "−"}
                </Button>

                <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentAmount === 0 ? "" : currentAmount.toString()}
                    placeholder="0"
                    onChange={(e) => {
                        const valStr = e.target.value
                        if (valStr.includes("-") && isHealing) handleModeToggle()
                        if (valStr.includes("+") && !isHealing) handleModeToggle()
                        
                        const raw = valStr.replace(/[^0-9]/g, "")
                        let val = parseInt(raw, 10)
                        if (isNaN(val)) val = 0
                        if (val > 100) val = 100
                        
                        handleAmountChange(val)
                    }}
                    className="w-14 h-7 text-center font-bold text-xs"
                    disabled={readOnly}
                />
                <span className="text-xs text-muted-foreground font-medium">%</span>
            </div>
        </div>
    )
}
