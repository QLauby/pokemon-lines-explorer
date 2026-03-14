"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Effect, EffectType, Pokemon, PokemonHpInfo, SlotReference } from "@/types/types"
import { Trash2 } from "lucide-react"
import { HpChangeEffect } from "./hp-change-effect"
import { StatsModifierEffect } from "./stats-modifier-effect"
import { StatusChangeEffect } from "./status-change-effect"

interface EffectSelectionProps {
    effect: Effect
    options: { label: string; value: SlotReference; isAlly: boolean }[]
    onUpdate: (newEffect: Effect) => void
    onRemove: () => void
    readOnly?: boolean
    getPokemonHp?: (side: "my" | "opponent", slotIndex: number) => PokemonHpInfo | undefined
    getPokemon?: (side: "my" | "opponent", slotIndex: number) => Pokemon | undefined
    getPokemonHpByTeamIndex?: (side: "my" | "opponent", teamIndex: number) => PokemonHpInfo | undefined
    getPokemonByTeamIndex?: (side: "my" | "opponent", teamIndex: number) => Pokemon | undefined
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
    getPokemon,
    getPokemonHpByTeamIndex,
    getPokemonByTeamIndex,
    hpMode = "percent"
}: EffectSelectionProps) {
    
    const isSameTarget = (t1: SlotReference, t2: SlotReference) => {
        if (t1.type === "field" && t2.type === "field") return t1.target === t2.target;
        if (t1.type === "team_index" && t2.type === "team_index") return t1.side === t2.side && t1.teamIndex === t2.teamIndex;
        
        // Handle battlefield_slot (default if type is missing)
        const type1 = t1.type || "battlefield_slot"
        const type2 = t2.type || "battlefield_slot"
        
        if (type1 === "battlefield_slot" && type2 === "battlefield_slot") {
            const side1 = "side" in t1 ? t1.side : null;
            const side2 = "side" in t2 ? t2.side : null;
            const slot1 = "slotIndex" in t1 ? t1.slotIndex : null;
            const slot2 = "slotIndex" in t2 ? t2.slotIndex : null;
            return side1 === side2 && slot1 === slot2;
        }
        return false;
    }

    const targetOption = options.find(o => isSameTarget(o.value, effect.target))
    const isAlly = targetOption?.isAlly ?? ("side" in effect.target ? effect.target.side === "my" : false)

    const handleTargetChange = (value: string) => {
        if (!value) return
        const newTarget = JSON.parse(value) as SlotReference
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
                : newType === "status-change"
                ? [{ type: "STATUS_DELTAS", target: effect.target, operations: [] }]
                : newType === "stats-modifier"
                ? [{ type: "STATS_MODIFIERS_DELTAS", target: effect.target, operations: [] }]
                : []
        })
    }

    const getTargetPokemonHp = () => {
        if (!getPokemonHp) return undefined;
        if (effect.target.type === "field") return undefined;
        if (effect.target.type === "team_index") {
             if (!getPokemonHpByTeamIndex) return undefined;
             const side = "side" in effect.target ? effect.target.side : undefined;
             const teamIndex = "teamIndex" in effect.target ? effect.target.teamIndex : undefined;
             if (side === undefined || teamIndex === undefined) return undefined;
             return getPokemonHpByTeamIndex(side as "my" | "opponent", teamIndex);
        }
        const side = "side" in effect.target ? effect.target.side : undefined;
        const slot = "slotIndex" in effect.target ? effect.target.slotIndex : undefined;
        if (side === undefined || slot === undefined) return undefined;
        return getPokemonHp(side as "my" | "opponent", slot);
    }
    
    const getTargetPokemon = () => {
        if (!getPokemon) return undefined;
        if (effect.target.type === "field") return undefined;
        if (effect.target.type === "team_index") {
             if (!getPokemonByTeamIndex) return undefined;
             const side = "side" in effect.target ? effect.target.side : undefined;
             const teamIndex = "teamIndex" in effect.target ? effect.target.teamIndex : undefined;
             if (side === undefined || teamIndex === undefined) return undefined;
             return getPokemonByTeamIndex(side as "my" | "opponent", teamIndex);
        }
        const side = "side" in effect.target ? effect.target.side : undefined;
        const slot = "slotIndex" in effect.target ? effect.target.slotIndex : undefined;
        if (side === undefined || slot === undefined) return undefined;
        return getPokemon(side as "my" | "opponent", slot);
    }

    const pokemonHpInfo = getTargetPokemonHp();

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
                {/* Type Dropdown (Now first) */}
                <select
                    className={cn(
                        "h-6 text-[10px] bg-background/80 border rounded px-1 outline-none focus:ring-1 focus:ring-ring flex-1 shrink-0",
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

                {/* Target Dropdown (Now second) */}
                <select
                    className={cn(
                        "h-6 text-[10px] font-medium bg-background/80 border rounded px-1 outline-none focus:ring-1 focus:ring-ring flex-1 min-w-0 truncate",
                        isAlly ? "border-blue-200" : "border-red-200"
                    )}
                    value={JSON.stringify(effect.target)}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    disabled={readOnly}
                >
                    {options.map((opt, idx) => (
                        <option
                            key={`target-${idx}`}
                            value={JSON.stringify(opt.value)}
                        >
                            {opt.label}
                        </option>
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
                    <StatusChangeEffect
                        effect={effect}
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                        initialPokemon={getTargetPokemon()}
                    />
                )}
                {effect.type === "stats-modifier" && (
                    <StatsModifierEffect
                        effect={effect}
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                        initialPokemon={getTargetPokemon()}
                    />
                )}
            </div>
        </div>
    )
}
