import { BattleState, TurnAction } from "@/types/types"
import { useEffect, useRef } from "react"
import { BattleEngine } from "../logic/battle-engine"

interface UseKoFusionProps {
    actions: TurnAction[]
    setActions: (actions: TurnAction[]) => void
    detectedKOs: { [actionIndex: number]: { isAlly: boolean; pokemon: import("@/types/types").Pokemon }[] }
    getStateAtAction: (index: number) => BattleState
    readOnly?: boolean
}

export function useKoFusion({
    actions,
    setActions,
    detectedKOs,
    getStateAtAction,
    readOnly
}: UseKoFusionProps) {
    
    // Persistent cache for switch IDs, targets, effects, AND UI state
    const orphanedChoicesRef = useRef<Map<string, { id: string, target: any, effects: import("@/types/types").Effect[], isCollapsed: boolean }>>(new Map())

    useEffect(() => {
        if (readOnly) return
    
        const allKOs: { isAlly: boolean, pokemonId: string, occurringAtIndex: number, koOrderIndex: number }[] = []
        
        let globalKoOrder = 0
        Object.entries(detectedKOs).forEach(([actionIdxStr, kos]) => {
            const idx = Number.parseInt(actionIdxStr, 10)
            
            // Ignore KOs that happen at End of Turn or later (handled by usePostTurnSwitches)
            if (idx >= actions.length) return

            const action = actions[idx]
            const stateBefore = getStateAtAction(idx)
            
            // Build a map of pokemon to their delta index (order of damage application)
            const deltaOrderMap = new Map<string, number>()
            if (action?.effects) {
                action.effects.forEach((effect) => {
                    effect.deltas.forEach((delta, deltaIdx) => {
                        if (delta.type === "HP_RELATIVE" && delta.target) {
                            const targetTeam = delta.target.side === "my" ? stateBefore.myTeam : stateBefore.enemyTeam
                            
                            // Resolve battlefield slot to team index
                            const teamIndex = BattleEngine.resolveSlotToTeamIndex(
                                stateBefore,
                                delta.target.side,
                                delta.target.slotIndex
                            )
                            
                            if (teamIndex !== null) {
                                const targetPokemon = targetTeam[teamIndex]
                                if (targetPokemon) {
                                    deltaOrderMap.set(targetPokemon.id, deltaIdx)
                                }
                            }
                        }
                    })
                })
            }
            
            // Sort KOs by their delta order
            const sortedKos = [...kos].sort((a, b) => {
                const aOrder = deltaOrderMap.get(a.pokemon.id) ?? 9999
                const bOrder = deltaOrderMap.get(b.pokemon.id) ?? 9999
                return aOrder - bOrder
            })
            
            sortedKos.forEach(k => {
                allKOs.push({
                    isAlly: k.isAlly,
                    pokemonId: k.pokemon.id,
                    occurringAtIndex: idx,
                    koOrderIndex: globalKoOrder++
                })
            })
        })
    
        const requirements: { side: "my" | "opponent", slotIndex: number, triggeredByActionIndex: number, pokemonId: string, koOrderIndex: number }[] = []
    
        allKOs.forEach(ko => {
            // Find the battlefield slot the fainted pokemon occupied AFTER the KO action.
            // Using stateAfter ensures we correctly find Pokémon that were just switched in and died to hazards.
            const stateAfter = getStateAtAction(ko.occurringAtIndex + 1)
            const team = ko.isAlly ? stateAfter.myTeam : stateAfter.enemyTeam
            const activeSlots = ko.isAlly
                ? stateAfter.activeSlots?.myTeam
                : stateAfter.activeSlots?.opponentTeam

            const teamIndex = team.findIndex(p => p.id === ko.pokemonId)
            let battlefieldSlot = (activeSlots || []).indexOf(teamIndex)

            // Fallback 1: If it's technically completely removed from active slots right after KO
            // (e.g. some instant resolution), we look at where it WAS before the KO action.
            if (battlefieldSlot === -1) {
                const stateBefore = getStateAtAction(ko.occurringAtIndex)
                const activeBefore = ko.isAlly ? stateBefore.activeSlots?.myTeam : stateBefore.activeSlots?.opponentTeam
                battlefieldSlot = (activeBefore || []).indexOf(teamIndex)
            }

            // Fallback 2: "Dead on Arrival". The Pokémon was not on the field before the action (was on bench),
            // but entered during a Switch action and died instantly to Entry Hazards, so it's not on the field after either.
            if (battlefieldSlot === -1) {
                const action = actions[ko.occurringAtIndex]
                if (action && (action.type === "switch" || action.type === "switch-after-ko")) {
                    const actionIsAlly = action.actor.side === "my"
                    if (ko.isAlly === actionIsAlly) {
                        battlefieldSlot = action.actor.slotIndex
                    }
                }
            }

            if (battlefieldSlot !== -1) {
                requirements.push({
                    side: ko.isAlly ? "my" : "opponent",
                    slotIndex: battlefieldSlot, // battlefield slot (0 or 1), not team index
                    triggeredByActionIndex: ko.occurringAtIndex,
                    pokemonId: ko.pokemonId,
                    koOrderIndex: ko.koOrderIndex
                })
            }
        })
    
        // 1. Update Persistent Cache with current known choices
        actions.forEach(action => {
             if (action.type === "switch-after-ko") {
                 const key = `${action.actor.side}-${action.actor.slotIndex}`
                 orphanedChoicesRef.current.set(key, { 
                     id: action.id,
                     target: action.target, 
                     effects: action.effects || [],
                     isCollapsed: action.isCollapsed ?? true
                 })
             }
        })
        
        const orphanedChoices = orphanedChoicesRef.current
        let changesMade = false

        // SEPARATE ACTIONS
        const inputNormalActions: TurnAction[] = []
        const inputSwitchActions: TurnAction[] = []

        actions.forEach(a => {
            if (a.type === "switch-after-ko") inputSwitchActions.push(a)
            else inputNormalActions.push(a)
        })

        const finalProcessedActions: TurnAction[] = []
        const matchedReqIndices = new Set<number>()

        // -------------------------------------------------------------
        // PHASE 1: Process Normal Actions (Fusion Logic)
        // -------------------------------------------------------------
        
        for (const action of inputNormalActions) {
            const originalIndex = actions.indexOf(action)
            
            const relevantReqIndex = requirements.findIndex(req => 
                req.side === action.actor.side && 
                req.slotIndex === action.actor.slotIndex &&
                originalIndex >= req.triggeredByActionIndex
            )

            if (relevantReqIndex !== -1) {
                const req = requirements[relevantReqIndex]

                // SELF-KO CHECK: If this action caused its own actor's death (e.g. Explosion)
                if (originalIndex === req.triggeredByActionIndex) {
                    finalProcessedActions.push(action)
                    continue
                }
                
                // DEFUSION CHECK: If there's a switch-after-ko for this slot BEFORE this action,
                const hasUnfusedSwitchBefore = inputSwitchActions.some(sw => 
                    sw.actor.side === action.actor.side &&
                    sw.actor.slotIndex === action.actor.slotIndex &&
                    actions.indexOf(sw) < originalIndex &&
                    !sw.triggeredByKO // Only count unfused switches as defusion intent
                )
                
                if (hasUnfusedSwitchBefore) {
                    // User wants them separate, don't fuse
                    finalProcessedActions.push(action)
                } else {
                    // Normal fusion
                    matchedReqIndices.add(relevantReqIndex)
                    
                    // Mark requirement as fused
                    const reqAny = req as any
                    reqAny._triggeredByKO = true
                    
                    changesMade = true
                }
            } else {
                finalProcessedActions.push(action)
            }
        }

        // -------------------------------------------------------------
        // PHASE 2: Process Switch Actions (Defusion Logic)
        // -------------------------------------------------------------
        
        actions.forEach((action, idx) => {
            if (action.type === "switch-after-ko" && action.triggeredByKO) {
                // If there is ANY non-switch action AFTER this switch in the input list, it means it was moved up (or action moved down)
                // Logic: Switch should be at the very end.
                const hasNormalActionAfter = actions.slice(idx + 1).some(a => a.type !== "switch-after-ko")
                
                if (hasNormalActionAfter) {
                    const triggeredByKO = (action.metadata as any)?.fusedFrom // Handle legacy metadata if present, though we should migrate
                    
                    // Fallback to empty if metadata lost, but types imply we should have data
                    const restoredAction: TurnAction = {
                        id: crypto.randomUUID(),
                        actor: action.actor,
                        type: "attack",
                        target: undefined,
                        actionDeltas: [],
                        effects: [],
                        isCollapsed: true,
                        metadata: {}
                    }

                    // Attempt to restore from metadata if available (legacy support or if we store stash there)
                     if (action.metadata) {
                        // ... complex restoration logic if we stashed the whole action ...
                     }
                    
                    const req = requirements.find(r => r.side === action.actor.side && r.slotIndex === action.actor.slotIndex)
                    
                    if (req) {
                        const triggerActionOld = actions[req.triggeredByActionIndex]
                        const triggerId = triggerActionOld?.id
                        
                        let insertIdx = finalProcessedActions.findIndex(a => a.id === triggerId)
                        if (insertIdx !== -1) {
                            finalProcessedActions.splice(insertIdx, 0, restoredAction)
                        } else {
                            finalProcessedActions.push(restoredAction)
                        }
                        
                        changesMade = true
                    }
                }
            }
        })

        // -------------------------------------------------------------
        // PHASE 2.5: Handle Orphaned Fused Switches (KO requirement disappeared)
        // -------------------------------------------------------------
        
        // Identify switches that no longer have a matching KO requirement
        inputSwitchActions.forEach(switchAction => {
            const hasRequirement = requirements.some(r => 
                r.side === switchAction.actor.side && 
                r.slotIndex === switchAction.actor.slotIndex
            )
            
            // If KO disappeared AND switch was fused, restore the original action
            if (!hasRequirement && switchAction.triggeredByKO) {
                const restoredAction: TurnAction = {
                    id: crypto.randomUUID(),
                    actor: switchAction.actor,
                    type: "attack",
                    target: undefined,
                    actionDeltas: [],
                    effects: [],
                    metadata: {},
                    isCollapsed: true
                }
                
                // Add at the end as the user specified "derniÃ¨re position des actions du tour"
                finalProcessedActions.push(restoredAction)
                changesMade = true
            }
            // If unfused orphan, simply discard (which happens automatically by not adding it)
        })

        // -------------------------------------------------------------
        // PHASE 3: Generate Switches (Enforce Position & Order)
        // -------------------------------------------------------------

        // Sort requirements by KO sequence order (preserves delta order within same action)
        requirements.sort((a, b) => a.koOrderIndex - b.koOrderIndex)

        requirements.forEach(req => {
            const key = `${req.side}-${req.slotIndex}`
            const cachedSwitch = orphanedChoices.get(key)
            
            const triggeredByKO = (req as any)._triggeredByKO
            
            // Check for ANY existing switch (fused or unfused) for this side/slot
            const existingSwitch = inputSwitchActions.find(a => 
                a.actor.side === req.side && 
                a.actor.slotIndex === req.slotIndex
            )

            // Check if there are available bench members for this switch
            const stateAtSwitch = getStateAtAction(actions.length) // State at end of all actions
            const team = req.side === "my" ? stateAtSwitch.myTeam : stateAtSwitch.enemyTeam
            const activeSlots = req.side === "my" ? stateAtSwitch.activeSlots?.myTeam : stateAtSwitch.activeSlots?.opponentTeam
            
            const availableBenchMembers = team
                .map((p, idx) => ({ pokemon: p, idx }))
                .filter(({ pokemon, idx }) => 
                    pokemon.hpPercent > 0 && // Living
                    !(activeSlots || []).includes(idx) // Not active
                )
            
            const hasNoAvailableSwitch = availableBenchMembers.length === 0

            // If a switch already exists, reuse it with updated actionDeltas
            if (existingSwitch) {
                const toSlot = existingSwitch.target ? existingSwitch.target.slotIndex : -1
                const updatedSwitch: TurnAction = {
                    ...existingSwitch,
                    // Recompute actionDeltas with the correct battlefield slot
                    actionDeltas: [{
                        type: "SWITCH",
                        side: req.side,
                        fromSlot: -1,
                        toSlot,
                        slotIndex: req.slotIndex // battlefield slot
                    }],
                    // Strip any legacy SWITCH deltas mistakenly placed in effects
                    effects: existingSwitch.effects.filter(e => e.deltas.every(d => d.type !== "SWITCH")),
                    triggeredByKO: !!(triggeredByKO || existingSwitch.triggeredByKO),
                    faintedPokemonId: req.pokemonId
                }

                finalProcessedActions.push(updatedSwitch)
            } else {
                // No existing switch, create a new one
                const newSwitch: TurnAction = {
                    id: cachedSwitch?.id || crypto.randomUUID(),
                    type: "switch-after-ko",
                    actor: { side: req.side, slotIndex: req.slotIndex },
                    target: hasNoAvailableSwitch ? undefined : cachedSwitch?.target,
                    // SWITCH delta goes in actionDeltas, not in a dummy Effect
                    actionDeltas: [{
                        type: "SWITCH",
                        side: req.side,
                        fromSlot: -1,
                        toSlot: hasNoAvailableSwitch ? -1 : (cachedSwitch?.target?.slotIndex ?? -1),
                        slotIndex: req.slotIndex
                    }],
                    // Preserve user-editable effects (HP changes etc.), stripping any legacy SWITCH dummy effects
                    effects: (cachedSwitch?.effects || []).filter(e => e.deltas.every(d => d.type !== "SWITCH")),
                    isCollapsed: cachedSwitch?.isCollapsed ?? true,
                    triggeredByKO: !!triggeredByKO,
                    faintedPokemonId: req.pokemonId
                }

                finalProcessedActions.push(newSwitch)
                
                // Check for change: If we generated a switch that didn't exist or changed state
                if (!existingSwitch && !cachedSwitch && !triggeredByKO) {
                     // It's a "silent" update usually, but ensuring we trigger update if needed
                }
            }
        })
        
        // Final sanity check
        if (!changesMade) {
            // Compare stringified representations to catch subtle mutations (like metadata.faintedPokemonId changing)
            // that don't alter the length or IDs of the array but must trigger a re-render.
            if (JSON.stringify(actions) !== JSON.stringify(finalProcessedActions)) {
                changesMade = true
            }
        }

        if (changesMade) {
            setActions(finalProcessedActions)
        }
    
      }, [actions, detectedKOs, getStateAtAction, readOnly, setActions])
}
