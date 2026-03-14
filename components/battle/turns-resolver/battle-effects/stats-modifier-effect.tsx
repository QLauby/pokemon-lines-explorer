"use client"

import { Counter } from "@/components/shared/counter"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { Effect, Pokemon, StatModifierKey } from "@/types/types"
import { RotateCcw } from "lucide-react"

interface StatsModifierEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    initialPokemon?: Pokemon
}

const STAT_CONFIG = [
    { label: "Att", key: "att", min: -6, max: 6 },
    { label: "Def", key: "def", min: -6, max: 6 },
    { label: "SpA", key: "spa", min: -6, max: 6 },
    { label: "SpD", key: "spd", min: -6, max: 6 },
    { label: "Spe", key: "spe", min: -6, max: 6 },
    { label: "Acc", key: "acc", min: -6, max: 6 },
    { label: "Ev", key: "ev", min: -6, max: 6 },
    { label: "Crit", key: "crit", min: 0, max: 4 },
] as const;

export function StatsModifierEffect({
    effect,
    onUpdate,
    readOnly,
    initialPokemon
}: StatsModifierEffectProps) {
    const delta = effect.deltas[0]

    if (!delta || delta.type !== "STATS_MODIFIERS_DELTAS") {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    const currentOperations = delta.operations || []

    const handleUpdateStat = (stat: StatModifierKey, amount: number) => {
        if (readOnly) return

        const newOperations = [...currentOperations]
        const existingIdx = newOperations.findIndex(op => op.stat === stat)

        if (amount === 0) {
            if (existingIdx !== -1) newOperations.splice(existingIdx, 1)
        } else {
            if (existingIdx !== -1) {
                newOperations[existingIdx] = { ...newOperations[existingIdx], amount }
            } else {
                newOperations.push({ stat, amount })
            }
        }

        onUpdate({
            ...effect,
            deltas: [{ ...delta, operations: newOperations }]
        })
    }

    const toggleReset = () => {
        if (readOnly) return
        onUpdate({
            ...effect,
            deltas: [{ ...delta, setAllToZero: !delta.setAllToZero }]
        })
    }

    const getModifierColor = (value: number, key: string) => {
        if (value === 0) return "text-gray-400";
        return value > 0 ? "text-blue-500 font-bold" : "text-red-500 font-bold";
    };

    const getLabelColor = (value: number) => {
        if (value === 0) return "text-gray-400";
        return value > 0 ? "text-blue-600/70" : "text-red-600/70";
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 py-2 px-3 bg-white/40 border border-gray-100 rounded min-h-[48px] w-full">
            {STAT_CONFIG.map((config) => {
                const op = currentOperations.find(o => o.stat === config.key)
                const deltaAmount = op?.amount ?? 0
                
                // Calculate final value for indicator
                let finalValue = 0
                if (initialPokemon) {
                    const initialValue = delta.setAllToZero ? 0 : (initialPokemon.statsModifiers?.[config.key] ?? 0)
                    finalValue = Math.max(config.min, Math.min(config.max, initialValue + deltaAmount))
                }

                return (
                    <div key={config.key} className="flex flex-col items-center gap-0.5 min-w-[38px]">
                        <span className={cn(
                            "text-[10px] font-bold tracking-tight transition-colors duration-300",
                            getLabelColor(deltaAmount)
                        )}>
                            {config.label}
                        </span>
                        
                        <Counter
                            value={deltaAmount.toString()}
                            onChange={(val: string) => handleUpdateStat(config.key as StatModifierKey, parseInt(val) || 0)}
                            min={-12} // Allow large deltas for robustness, clamping is at engine level
                            max={12}
                            fontSize={12}
                            fontSizeRatio={0.6}
                            width={30}
                            showPlusSign={true}
                            className={cn(
                                "transition-all duration-300",
                                getModifierColor(deltaAmount, config.key)
                            )}
                            readOnly={readOnly}
                        />

                        {initialPokemon && (
                            <span className={cn(
                                "text-[9px] font-medium opacity-60",
                                finalValue === 0 ? "text-gray-400" : (finalValue > 0 ? "text-blue-600" : "text-red-600")
                            )}>
                                {finalValue}
                            </span>
                        )}
                    </div>
                )
            })}

            {/* Light Reset Toggle */}
            <div className="flex flex-col items-center gap-0.5 ml-1 pl-2 border-l border-gray-200">
                <span className={cn(
                    "text-[10px] font-bold tracking-tight transition-colors duration-300",
                    delta.setAllToZero ? "text-orange-600" : "text-gray-400"
                )}>
                    Reset
                </span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleReset}
                    disabled={readOnly}
                    className={cn(
                        "h-7 w-7 rounded-sm border transition-all duration-300",
                        delta.setAllToZero 
                            ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm" 
                            : "bg-white/50 border-gray-100 text-gray-300 hover:text-gray-500 hover:bg-white"
                    )}
                >
                    <RotateCcw className={cn("h-3.5 w-3.5 transition-transform duration-500", delta.setAllToZero && "rotate-180")} />
                </Button>
                <span className="text-[9px] font-medium opacity-0">.</span> {/* Spacer for alignment with indicator */}
            </div>
        </div>
    )
}
