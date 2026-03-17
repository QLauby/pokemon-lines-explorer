"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CustomTagData, Effect, EffectType, Pokemon, PokemonHpInfo, SlotReference } from "@/types/types"
import { Trash2 } from "lucide-react"
import { AbilityItemEffect } from "./ability-item-effect"
import { HpChangeEffect } from "./hp-change-effect"
import { MegaTeraEffect } from "./mega-tera-effect"
import { OthersEffect } from "./others-effect"
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
    getBattlefieldTags?: (target: "global" | "my_side" | "opponent_side") => CustomTagData[]
    hpMode?: "percent" | "hp"
}

const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
    "hp-change": "HP Change",
    "status-change": "Status Change",
    "stats-modifier": "Stats Modifier",
    "others": "Custom effects",
    "terrain": "Terrain effects",
    "mega-tera": "Mega / Tera",
    "ability-item": "Ability & Item",
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
    getBattlefieldTags,
    hpMode = "percent"
}: EffectSelectionProps) {
    
    const isSameTarget = (t1: SlotReference, t2: SlotReference) => {
        const type1 = t1.type || "battlefield_slot"
        const type2 = t2.type || "battlefield_slot"
        
        if (type1 !== type2) return false

        if (type1 === "field") return t1.target === t2.target
        if (type1 === "team_index") return t1.side === t2.side && t1.teamIndex === t2.teamIndex
        
        return t1.side === t2.side && t1.slotIndex === t2.slotIndex
    }

    // Auto-correction: If the current target is not in the list of valid options 
    // (happens when changing effect type), force select the first valid option.
    useEffect(() => {
        if (!readOnly && options.length > 0) {
            const currentTargetIsValid = options.some(opt => isSameTarget(opt.value, effect.target));
            if (!currentTargetIsValid) {
                handleTargetChange(JSON.stringify(options[0].value));
            }
        }
    }, [options, effect.type]); // Trigger when options change (which happens when type changes)

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
                : (newType === "others" || newType === "terrain")
                ? [{ type: "OTHERS_EFFECT_DELTAS", target: effect.target, operations: [] }]
                : newType === "mega-tera"
                ? [{ type: "MEGA_TERA_DELTAS", target: effect.target, operations: [] }]
                : newType === "ability-item"
                ? [
                    { type: "ABILITY_CHANGE", target: effect.target, abilityName: getTargetPokemon()?.abilityName || "" },
                    { type: "ITEM_CHANGE", target: effect.target, heldItem: getTargetPokemon()?.heldItem || false, heldItemName: getTargetPokemon()?.heldItemName || "" }
                  ]
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

    const getTargetCustomTags = () => {
        if (effect.target.type === "field") {
            if (!getBattlefieldTags) return [];
            return getBattlefieldTags(effect.target.target || "global");
        }
        return getTargetPokemon()?.customTags || [];
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
                {(effect.type === "others" || effect.type === "terrain") && (
                    <OthersEffect
                        effect={effect}
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                        initialTags={getTargetCustomTags()}
                    />
                )}
                {effect.type === "mega-tera" && (
                    <MegaTeraEffect
                        effect={effect}
                        onUpdate={onUpdate}
                        readOnly={readOnly}
                        initialPokemon={getTargetPokemon()}
                    />
                )}
                {effect.type === "ability-item" && (
                    <AbilityItemEffect
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
