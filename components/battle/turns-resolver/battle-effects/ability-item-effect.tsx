"use client"

import { MegaColoredIcon } from "@/components/pokemons/pokemon-card/sub-components/pokemon-card-header"
import { CircularButton } from "@/components/shared/circular-button"
import { EditableText } from "@/components/shared/editable-text"
import { Effect, Pokemon } from "@/types/types"
import { ArrowRight, RotateCcw, ShoppingBag, Sparkles } from "lucide-react"

interface AbilityItemEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    initialPokemon?: Pokemon
}

export function AbilityItemEffect({
    effect,
    onUpdate,
    readOnly,
    initialPokemon
}: AbilityItemEffectProps) {
    if (!initialPokemon) return null

    const abilityDelta = effect.deltas.find(d => d.type === "ABILITY_CHANGE")
    const itemDelta = effect.deltas.find(d => d.type === "ITEM_CHANGE")

    // Compute state AFTER the operations for visualization
    const afterAbility = abilityDelta?.type === "ABILITY_CHANGE" ? abilityDelta.abilityName : initialPokemon.abilityName
    
    // Check if the current state reflects a modification
    const isAbilityModified = !!abilityDelta
    const isItemModified = !!itemDelta

    const afterItemHeld = itemDelta?.type === "ITEM_CHANGE" ? itemDelta.heldItem : !!initialPokemon.heldItem
    const afterItemName = itemDelta?.type === "ITEM_CHANGE" ? itemDelta.heldItemName : initialPokemon.heldItemName

    const handleAbilityChange = (newName: string) => {
        if (readOnly) return
        const newDeltas = [...effect.deltas]
        const idx = newDeltas.findIndex(d => d.type === "ABILITY_CHANGE")
        if (idx !== -1) {
            newDeltas[idx] = { ...newDeltas[idx], type: "ABILITY_CHANGE", target: effect.target, abilityName: newName }
        } else {
            newDeltas.push({ type: "ABILITY_CHANGE", target: effect.target, abilityName: newName })
        }
        onUpdate({ ...effect, deltas: newDeltas })
    }

    const handleItemCycle = () => {
        if (readOnly) return
        const newDeltas = [...effect.deltas]
        const idx = newDeltas.findIndex(d => d.type === "ITEM_CHANGE")
        
        let nextHeld: boolean
        let nextName: string | undefined

        // Cycle: Off -> On (Normal) -> On (Mega Stone) -> Off
        if (!afterItemHeld) {
            nextHeld = true
            nextName = initialPokemon.heldItemName === "Mega Stone" ? "Item" : initialPokemon.heldItemName || "Item"
        } else if (afterItemName !== "Mega Stone") {
            nextHeld = true
            nextName = "Mega Stone"
        } else {
            nextHeld = false
            nextName = undefined
        }

        if (idx !== -1) {
            newDeltas[idx] = { 
                ...newDeltas[idx], 
                type: "ITEM_CHANGE", 
                target: effect.target, 
                heldItem: nextHeld, 
                heldItemName: nextName 
            }
        } else {
            newDeltas.push({ 
                type: "ITEM_CHANGE", 
                target: effect.target, 
                heldItem: nextHeld, 
                heldItemName: nextName 
            })
        }
        onUpdate({ ...effect, deltas: newDeltas })
    }

    const handleItemNameChange = (newName: string) => {
        if (readOnly) return
        const newDeltas = [...effect.deltas]
        const idx = newDeltas.findIndex(d => d.type === "ITEM_CHANGE")
        if (idx !== -1) {
            newDeltas[idx] = { ...newDeltas[idx], type: "ITEM_CHANGE", target: effect.target, heldItem: true, heldItemName: newName }
        } else {
            newDeltas.push({ type: "ITEM_CHANGE", target: effect.target, heldItem: true, heldItemName: newName })
        }
        onUpdate({ ...effect, deltas: newDeltas })
    }

    const resetAbility = () => {
        if (readOnly) return
        const newDeltas = effect.deltas.filter(d => d.type !== "ABILITY_CHANGE")
        onUpdate({ ...effect, deltas: newDeltas })
    }

    const resetItem = () => {
        if (readOnly) return
        const newDeltas = effect.deltas.filter(d => d.type !== "ITEM_CHANGE")
        onUpdate({ ...effect, deltas: newDeltas })
    }

    const pokemon = initialPokemon

    return (
        <div className="flex flex-col gap-1 w-full py-1">
            {/* Ability Line */}
            <div className="grid grid-cols-[130px_20px_1fr_30px] items-center gap-2 w-full bg-white/40 backdrop-blur-sm rounded-md border border-slate-100/50 px-2 h-9">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500/60 shrink-0" />
                    <span className="text-[10px] text-slate-400 italic truncate font-light">
                        {pokemon.abilityName || "No Ability"}
                    </span>
                </div>
                
                <div className="flex justify-center">
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300/60" />
                </div>
                
                <div className="min-w-0 h-full flex items-center">
                    <EditableText
                        value={afterAbility || ""}
                        placeholder="New Ability..."
                        onChange={handleAbilityChange}
                        autoWidth={false}
                        width="100%"
                        fontSize={12}
                        fontSizeRatio={0.7}
                        readOnly={readOnly}
                        className="font-medium text-amber-950"
                    />
                </div>

                <div className="flex justify-end">
                    {isAbilityModified && !readOnly && (
                        <button 
                            onClick={resetAbility}
                            className="p-1.5 rounded-full hover:bg-amber-100/50 text-slate-300 hover:text-amber-600 transition-all active:scale-90"
                            title="Reset to initial ability"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Item Line */}
            <div className="grid grid-cols-[130px_20px_1fr_30px] items-center gap-2 w-full bg-white/40 backdrop-blur-sm rounded-md border border-slate-100/50 px-2 h-9">
                <div className="flex items-center gap-1.5 min-w-0">
                    {pokemon.heldItemName === "Mega Stone" ? (
                        <div className="bg-white rounded-full p-0.5 border border-slate-100 flex items-center justify-center">
                             <MegaColoredIcon size={12} />
                        </div>
                    ) : (
                        <ShoppingBag className={pokemon.heldItem ? "h-3.5 w-3.5 text-amber-700/60 shrink-0" : "h-3.5 w-3.5 text-slate-300/60 shrink-0"} />
                    )}
                    <span className="text-[10px] text-slate-400 italic truncate font-light">
                        {pokemon.heldItem ? pokemon.heldItemName : "No Item"}
                    </span>
                </div>
                
                <div className="flex justify-center">
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300/60" />
                </div>
                
                <div className="min-w-0 flex items-center gap-2 h-full">
                    <div className="shrink-0">
                        <CircularButton
                            isActive={afterItemHeld}
                            onClick={handleItemCycle}
                            icon={afterItemHeld && afterItemName === "Mega Stone" ? MegaColoredIcon : ShoppingBag}
                            activeColor={afterItemName === "Mega Stone" ? "bg-transparent" : "bg-amber-700 text-white"}
                            title={afterItemHeld ? (afterItemName === "Mega Stone" ? "Méga-Gemme" : "Objet tenu") : "Aucun objet"}
                            variant="outlined"
                            diameter={20}
                            iconRatio={afterItemHeld && afterItemName === "Mega Stone" ? 0.8 : 0.6}
                            readOnly={readOnly}
                        />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center h-full">
                        {afterItemHeld ? (
                            <EditableText
                                value={afterItemName || ""}
                                placeholder="Object name..."
                                onChange={handleItemNameChange}
                                autoWidth={false}
                                width="100%"
                                fontSize={12}
                                fontSizeRatio={0.7}
                                readOnly={readOnly}
                                className="font-medium text-amber-950"
                            />
                        ) : (
                            <span className="text-[11px] text-slate-400/80 italic ml-1">No Item</span>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    {isItemModified && !readOnly && (
                        <button 
                            onClick={resetItem}
                            className="p-1.5 rounded-full hover:bg-amber-100/50 text-slate-300 hover:text-amber-600 transition-all active:scale-90"
                            title="Reset to initial item"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
