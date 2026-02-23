"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Effect, EffectType, PokemonHpInfo, SlotReference } from "@/types/types"
import { Trash2 } from "lucide-react"
import { HpChangeEffect } from "./hp-change-effect"

interface EffectSelectionProps {
    effect: Effect
    options: { label: string; value: SlotReference; isAlly: boolean }[]
    onUpdate: (newEffect: Effect) => void
    onRemove: () => void
    readOnly?: boolean
    getPokemonHp?: (side: "my" | "opponent", slotIndex: number) => PokemonHpInfo | undefined
    hpMode?: "percent" | "hp"
}

const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
    "hp-change": "HP Change",
    "status-change": "Status Change",
    "stats-modifier": "Stats Modifier",
}

export function EffectSelection({
    effect,
    options,
    onUpdate,
    onRemove,
    readOnly,
    getPokemonHp,
    hpMode = "percent"
}: EffectSelectionProps) {
    
    const targetOption = options.find(o => 
        o.value.side === effect.target.side && 
        o.value.slotIndex === effect.target.slotIndex
    )
    const isAlly = targetOption?.isAlly ?? (effect.target.side === "my")

    const handleTargetChange = (value: string) => {
        if (!value) return
        const [side, slotStr] = value.split(":")
        const newTarget = { side: side as "my" | "opponent", slotIndex: parseInt(slotStr, 10) }
        onUpdate({
            ...effect,
            target: newTarget,
            // Also propagate the new target into each delta that carries its own target
            deltas: effect.deltas.map(d => 
                "target" in d ? { ...d, target: newTarget } : d
            )
        })
    }

    const handleTypeChange = (newType: EffectType) => {
        if (newType === effect.type) return
        // Reset deltas when changing type
        onUpdate({
            ...effect,
            type: newType,
            deltas: newType === "hp-change" 
                ? [{ type: "HP_RELATIVE", target: effect.target, amount: 0, unit: hpMode }] 
                : []
        })
    }

    const pokemonHpInfo = getPokemonHp?.(effect.target.side, effect.target.slotIndex)

    return (
        <div className={cn(
            "rounded-md border overflow-hidden",
            isAlly ? "border-blue-200" : "border-red-200"
        )}>
            {/* Row 1: Target + Type + Delete */}
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1",
                isAlly ? "bg-blue-50/50" : "bg-red-50/50"
            )}>
                {/* Target Dropdown */}
                <select
                    className={cn(
                        "h-6 text-[10px] font-medium bg-background/80 border rounded px-1 outline-none focus:ring-1 focus:ring-ring flex-1 min-w-0 truncate",
                        isAlly ? "border-blue-200" : "border-red-200"
                    )}
                    value={`${effect.target.side}:${effect.target.slotIndex}`}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    disabled={readOnly}
                >
                    {options.map((opt, idx) => (
                        <option
                            key={`${opt.value.side}-${opt.value.slotIndex}-${idx}`}
                            value={`${opt.value.side}:${opt.value.slotIndex}`}
                        >
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Type Dropdown */}
                <select
                    className={cn(
                        "h-6 text-[10px] bg-background/80 border rounded px-1 outline-none focus:ring-1 focus:ring-ring shrink-0",
                        isAlly ? "border-blue-200" : "border-red-200"
                    )}
                    value={effect.type}
                    onChange={(e) => handleTypeChange(e.target.value as EffectType)}
                    disabled={readOnly}
                >
                    {Object.entries(EFFECT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                {/* Delete */}
                {!readOnly && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onRemove} 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
            </div>

            {/* Row 2: Effect-specific content */}
            <div className="px-2 py-1.5 bg-card/30">
                {effect.type === "hp-change" && (
                    <HpChangeEffect
                        effect={effect}
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                        initialHp={pokemonHpInfo?.hpPercent}
                        initialHpMax={pokemonHpInfo?.hpMax}
                        initialHpCurrent={pokemonHpInfo?.hpCurrent}
                        hpMode={hpMode}
                    />
                )}
                {effect.type === "status-change" && (
                    <div className="text-[11px] text-muted-foreground italic py-1">
                        Status Change — bientôt disponible
                    </div>
                )}
                {effect.type === "stats-modifier" && (
                    <div className="text-[11px] text-muted-foreground italic py-1">
                        Stats Modifier — bientôt disponible
                    </div>
                )}
            </div>
        </div>
    )
}
