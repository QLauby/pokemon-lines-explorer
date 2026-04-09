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

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TypeLiseret } from "@/components/shared/type-liseret"
import { THEME } from "@/lib/constants/color-constants"
import { EffectOption } from "@/lib/utils/turn-logic-helpers"

interface EffectSelectionProps {
    effect: Effect
    options: EffectOption[]
    onUpdate: (newEffect: Effect) => void
    onRemove: () => void
    hpMode?: "percent" | "hp" | "rolls"
    readOnly?: boolean
    getPokemonHp?: (side: "my" | "opponent", slotIndex: number) => PokemonHpInfo | undefined
    getPokemon?: (side: "my" | "opponent", slotIndex: number) => Pokemon | undefined
    getPokemonHpByTeamIndex?: (side: "my" | "opponent", teamIndex: number) => PokemonHpInfo | undefined
    getPokemonByTeamIndex?: (side: "my" | "opponent", teamIndex: number) => Pokemon | undefined
    getBattlefieldTags?: (target: "global" | "my_side" | "opponent_side") => CustomTagData[]
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
    getPokemonHp,
    getPokemon,
    getPokemonHpByTeamIndex,
    getPokemonByTeamIndex,
    getBattlefieldTags,
    hpMode = "percent",
    readOnly = false,
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
            const isUnselected = "slotIndex" in effect.target && (effect.target as any).slotIndex === -1;
            
            if (!currentTargetIsValid && !isUnselected) {
                handleTargetChange(JSON.stringify(options[0].value));
            }
        }
    }, [options, effect.type]); // Trigger when options change (which happens when type changes)

    const targetOption = options.find(o => isSameTarget(o.value, effect.target))
    const isAlly = targetOption?.isAlly ?? ("side" in effect.target ? effect.target.side === "my" : false)

    const handleTargetChange = (value: string) => {
        if (!value) return
        const newTarget = value === "none" 
            ? { type: "battlefield_slot" as const, side: "opponent" as const, slotIndex: -1 }
            : JSON.parse(value) as SlotReference
            
        onUpdate({
            ...effect,
            target: newTarget,
            // Also propagate the new target into each delta that carries its own target
            deltas: effect.deltas.map(d => 
                "target" in d ? { ...d, target: newTarget } : d
            )
        })
    }

    const handleTypeChange = (newType: string) => {
        const typedNewType = newType as EffectType
        if (typedNewType === effect.type) return
        // Reset deltas when changing type
        onUpdate({
            ...effect,
            type: typedNewType,
            deltas: typedNewType === "hp-change" 
                ? [{ type: "HP_RELATIVE", target: effect.target, amount: undefined, unit: hpMode === "rolls" ? "hp" : hpMode }] 
                : typedNewType === "status-change"
                ? [{ type: "STATUS_DELTAS", target: effect.target, operations: [] }]
                : typedNewType === "stats-modifier"
                ? [{ type: "STATS_MODIFIERS_DELTAS", target: effect.target, operations: [] }]
                : (typedNewType === "others" || typedNewType === "terrain")
                ? [{ type: "OTHERS_EFFECT_DELTAS", target: effect.target, operations: [] }]
                : typedNewType === "mega-tera"
                ? [{ type: "MEGA_TERA_DELTAS", target: effect.target, operations: [] }]
                : typedNewType === "ability-item"
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
        <div 
            className={cn(
                "rounded-md border overflow-hidden transition-all shadow-sm",
                isAlly ? "border-[var(--color-ally)]/40 shadow-[var(--color-ally)]/5" : "border-[var(--color-opp)]/40 shadow-[var(--color-opp)]/5"
            )}
            style={{ 
                "--effect-ring": isAlly ? "var(--color-ally)" : "var(--color-opp)"
            } as React.CSSProperties}
        >
            {/* Row 1: Target + Type + Delete */}
            <div className={cn(
                "flex items-center gap-1.5 px-2 py-1",
                isAlly ? "bg-[var(--color-ally-bg)]" : "bg-[var(--color-opp-bg)]"
            )}>
                {/* Type Dropdown (Now first) */}
                <Select
                    value={effect.type}
                    onValueChange={handleTypeChange}
                    disabled={readOnly}
                >
                    <SelectTrigger
                        className={cn(
                            "h-6 text-[10px] bg-background/80 px-1.5 flex-1 shrink-0 min-w-0 transition-colors shadow-none",
                            "focus:ring-1 focus:ring-[var(--effect-ring)]",
                            isAlly ? "border-[var(--color-ally)]/20" : "border-[var(--color-opp)]/20"
                        )}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(EFFECT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-[10px] py-1 px-2">
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Target Dropdown (Now second) */}
                <Select
                    value={targetOption ? JSON.stringify(effect.target) : "none"}
                    onValueChange={handleTargetChange}
                    disabled={readOnly}
                >
                    <SelectTrigger
                        className={cn(
                            "h-6 text-[10px] font-bold bg-background/80 px-1.5 flex-[1.5] min-w-0 transition-colors shadow-none",
                            "focus:ring-1 focus:ring-[var(--effect-ring)]",
                            isAlly ? "border-[var(--color-ally)]/20" : "border-[var(--color-opp)]/20"
                        )}
                        style={{
                            color: (() => {
                                if (!targetOption) return "var(--text-main)"
                                if (effect.target.type === "field") {
                                    return effect.target.side === "my" ? THEME.common.ally_text : THEME.common.opponent_text
                                }
                                return isAlly ? THEME.common.ally_text : THEME.common.opponent_text
                            })()
                        }}
                    >
                        <SelectValue placeholder="Target Pokémon..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none" className="text-[10px] py-1 px-2 italic opacity-60">
                            Target Pokémon...
                        </SelectItem>
                        {options.map((opt, idx) => (
                            <SelectItem
                                key={`target-${idx}`}
                                value={JSON.stringify(opt.value)}
                                className="text-[10px] py-1 px-2"
                            >
                                <div className="flex items-center gap-2">
                                    {opt.types && <TypeLiseret types={opt.types} className="w-1 h-3 rounded-full" />}
                                    <span style={{ 
                                        color: opt.isAlly ? THEME.common.ally_text : THEME.common.opponent_text,
                                        fontWeight: opt.value.type === "field" ? "normal" : "bold"
                                    }}>
                                        {opt.label}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Delete */}
                {!readOnly && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onRemove} 
                        className="h-6 w-6 text-foreground hover:text-destructive shrink-0 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }} />
                    </Button>
                )}
            </div>
            
            {/* Row 1.5: Optional description */}
            <div className="px-2 py-1.5 border-t border-dashed bg-muted flex items-center gap-2">
                <span className="text-[9px] font-bold text-foreground/70 uppercase shrink-0">Description :</span>
                <input 
                    className="flex-1 bg-transparent border-none outline-none text-[10px] placeholder:italic italic h-5"
                    value={effect.description || ""}
                    onChange={(e) => onUpdate({ ...effect, description: e.target.value })}
                    placeholder="Optional description"
                    readOnly={readOnly}
                />
            </div>

            {/* Row 2: Effect-specific content */}
            <div className="px-2 py-2.5 bg-background/60 min-h-[40px] flex flex-col justify-center">
                {(!targetOption) ? (
                    <div className="text-[10px] text-muted-foreground italic text-center py-2">
                        Please select a target Pokémon or Field side above to configure this effect.
                    </div>
                ) : (
                    <>
                        {effect.type === "hp-change" && (
                            <HpChangeEffect
                                effect={effect}
                                onUpdate={onUpdate}
                                readOnly={readOnly}
                                initialHp={pokemonHpInfo?.hpPercent}
                                initialHpMax={pokemonHpInfo?.hpMax}
                                initialHpCurrent={pokemonHpInfo?.hpCurrent}
                                initialStatProfile={pokemonHpInfo?.statProfile}
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
                                isAlly={isAlly}
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
                                isAlly={isAlly}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
