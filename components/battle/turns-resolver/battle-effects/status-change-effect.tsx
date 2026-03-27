"use client"

import { PokemonCardDisplayStatus } from "@/components/battle/pokemon-card-display/sub-components/status"
import { StatusSelector } from "@/components/pokemons/pokemon-card/sub-components/status-selector"
import { computeStatusOperations } from "@/lib/utils/status-diff-generator"
import { Effect, Pokemon } from "@/types/types"
import { ArrowRight } from "lucide-react"

interface StatusChangeEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    initialPokemon?: Pokemon
}

export function StatusChangeEffect({
    effect,
    onUpdate,
    readOnly,
    initialPokemon
}: StatusChangeEffectProps) {
    const delta = effect.deltas[0]

    if (!delta || delta.type !== "STATUS_DELTAS") {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    if (!initialPokemon) return null

    // Compute the state AFTER the operations for visualization
    const afterPokemon = { ...initialPokemon }
    for (const op of delta.operations) {
        switch (op.type) {
            case "ADD":
                if (op.status === "confusion" || op.status === "love") {
                    afterPokemon[op.status] = true
                } else {
                    afterPokemon.status = op.status
                }
                break
            case "REMOVE":
                if (op.status === "confusion" || op.status === "love") {
                    afterPokemon[op.status] = false
                } else {
                    afterPokemon.status = null
                }
                break
            case "COUNTER_RELATIVE": {
                const counterKey = op.status === "sleep" ? "sleepCounter" : 
                                 op.status === "confusion" ? "confusionCounter" : "toxicCounter"
                const currentValue = afterPokemon[counterKey as keyof Pokemon] as number ?? 0
                // @ts-ignore
                afterPokemon[counterKey] = currentValue + op.amount
                break
            }
            case "COUNTER_TOGGLE": {
                const showKey = op.status === "sleep" ? "showSleepCounter" : 
                              op.status === "confusion" ? "showConfusionCounter" : "showToxicCounter"
                const counterKey = op.status === "sleep" ? "sleepCounter" : 
                                 op.status === "confusion" ? "confusionCounter" : "toxicCounter"
                // @ts-ignore
                afterPokemon[showKey] = op.show
                if (op.show === true && afterPokemon[counterKey as keyof Pokemon] === undefined) {
                    // @ts-ignore
                    afterPokemon[counterKey] = 0
                } else if (op.show === false) {
                    // @ts-ignore
                    afterPokemon[counterKey] = undefined
                }
                break
            }
        }
    }

    const handleUpdate = (
        id: string,
        isMyTeam: boolean,
        updates: {
            status?: any
            confusion?: boolean
            love?: boolean
            sleepCounter?: number
            confusionCounter?: number
            toxicCounter?: number
            showSleepCounter?: boolean
            showConfusionCounter?: boolean
            showToxicCounter?: boolean
        }
    ) => {
        if (readOnly) return

        const newPokemon = { ...afterPokemon }
        
        if ('status' in updates) newPokemon.status = updates.status
        if ('confusion' in updates) newPokemon.confusion = updates.confusion!
        if ('love' in updates) newPokemon.love = updates.love!
        if ('sleepCounter' in updates) newPokemon.sleepCounter = updates.sleepCounter
        if ('confusionCounter' in updates) newPokemon.confusionCounter = updates.confusionCounter
        if ('toxicCounter' in updates) newPokemon.toxicCounter = updates.toxicCounter
        if ('showSleepCounter' in updates) newPokemon.showSleepCounter = updates.showSleepCounter
        if ('showConfusionCounter' in updates) newPokemon.showConfusionCounter = updates.showConfusionCounter
        if ('showToxicCounter' in updates) newPokemon.showToxicCounter = updates.showToxicCounter

        // Compute relative diffs from initial to new
        const operations = computeStatusOperations(initialPokemon, newPokemon)
        
        onUpdate({
            ...effect,
            deltas: [{ ...delta, operations }]
        })
    }

    const hasAnyStatusBefore = initialPokemon.status || initialPokemon.confusion || initialPokemon.love
    const hasAnyStatusAfter = afterPokemon.status || afterPokemon.confusion || afterPokemon.love

    return (
        <div className="flex items-stretch gap-3 w-full">
            {/* Visualisation Avant -> Après */}
            <div className="flex items-center justify-center w-[150px] shrink-0 bg-white/50 px-2 py-1.5 rounded border border-slate-100 min-h-[36px] gap-2">
                <div className="flex-1 flex justify-end min-w-0">
                    {hasAnyStatusBefore ? (
                        <PokemonCardDisplayStatus pokemon={initialPokemon} />
                    ) : (
                        <span className="text-[10px] text-slate-400 italic whitespace-nowrap">No status</span>
                    )}
                </div>
                
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 mx-1" />
                
                <div className="flex-1 flex justify-start min-w-0">
                    {hasAnyStatusAfter ? (
                        <PokemonCardDisplayStatus pokemon={afterPokemon} />
                    ) : (
                        <span className="text-[10px] text-slate-400 italic whitespace-nowrap">No status</span>
                    )}
                </div>
            </div>

            {/* Ligne de démarcation verticale */}
            <div className="w-px bg-slate-200 my-1 rounded-full shrink-0" />

            {/* Télécommande / Sélecteur */}
            <div className="flex-1 min-w-0 flex items-center justify-center bg-white/40 border border-slate-100 rounded px-2 py-1.5 min-h-[36px]">
                <StatusSelector 
                    pokemon={afterPokemon}
                    isMyTeam={"side" in effect.target ? effect.target.side === "my" : false}
                    onUpdate={handleUpdate}
                    readOnly={readOnly}
                    showLabel={false}
                    centerItems={true}
                />
            </div>
        </div>
    )
}
