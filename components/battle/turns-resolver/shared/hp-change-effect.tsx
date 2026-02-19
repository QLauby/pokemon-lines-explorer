"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Effect } from "@/types/types"

interface HpChangeEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
}

export function HpChangeEffect({
    effect,
    onUpdate,
    readOnly
}: HpChangeEffectProps) {
    const delta = effect.deltas[0]
    
    if (!delta || delta.type !== "HP_RELATIVE") {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    const currentAmount = Math.abs(delta.amount)
    // Default: damage (negative or -0). Healing only if strictly positive.
    const isHealing = delta.amount > 0

    const handleAmountChange = (val: number) => {
        const newAmount = isHealing ? val : -val
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount }]
        })
    }

    const handleModeToggle = () => {
        const newIsHealing = !isHealing
        const newAmount = newIsHealing ? currentAmount : -currentAmount
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount }]
        })
    }

    // Visual Bar Calculation (capped at 100%)
    const percentage = Math.min(Math.max(currentAmount, 0), 100)
    
    return (
        <div className="flex items-center gap-3">
            {/* HP Bar Visualization */}
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200">
                <div 
                    className={cn(
                        "h-full transition-all duration-300",
                        isHealing ? "bg-green-500" : "bg-red-500"
                    )}
                    style={{ width: `${percentage}%` }}
                />
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
