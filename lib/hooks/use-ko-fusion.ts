import { BattleState, TurnAction } from "@/types/types"
import { useEffect, useRef } from "react"

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
    const orphanedChoicesRef = useRef<Map<string, { id: string, target: any, deltas: import("@/types/types").BattleDelta[], isCollapsed: boolean }>>(new Map())

    useEffect(() => {
        if (readOnly) return
    
        const allKOs: { isAlly: boolean, pokemonId: string, occurringAtIndex: number }[] = []
        
        Object.entries(detectedKOs).forEach(([actionIdxStr, kos]) => {
            const idx = Number.parseInt(actionIdxStr, 10)
            kos.forEach(k => {
                allKOs.push({
                    isAlly: k.isAlly,
                    pokemonId: k.pokemon.id,
                    occurringAtIndex: idx
                })
            })
        })
    
        const requirements: { side: "my" | "opponent", slotIndex: number, triggeredByActionIndex: number }[] = []
    
        allKOs.forEach(ko => {
            const stateAfter = getStateAtAction(ko.occurringAtIndex + 1)
            const team = ko.isAlly ? stateAfter.myTeam : stateAfter.enemyTeam
            const slotIndex = team.findIndex(p => p.id === ko.pokemonId)
            
            if (slotIndex !== -1) {
                requirements.push({
                    side: ko.isAlly ? "my" : "opponent",
                    slotIndex,
                    triggeredByActionIndex: ko.occurringAtIndex
                })
            }
        })
    
    
        const processedActions: TurnAction[] = []
        const matchedReqIndices = new Set<number>()
        
        // 1. Update Persistent Cache with current known choices (ID + Target + Deltas + UI State)
        actions.forEach(action => {
             if (action.type === "switch-after-ko") {
                 const key = `${action.actor.side}-${action.actor.slotIndex}`
                 // Always update the cache with the latest state of this switch card
                 orphanedChoicesRef.current.set(key, { 
                     id: action.id,
                     target: action.target, 
                     deltas: action.deltas || [],
                     isCollapsed: action.isCollapsed ?? true
                 })
             }
        })
        
        const orphanedChoices = orphanedChoicesRef.current // Use ref as source of truth
        let changesMade = false
    
        actions.forEach((action, currentActionIndex) => {
            const reqIndex = requirements.findIndex((req, idx) => 
                !matchedReqIndices.has(idx) &&
                req.side === action.actor.side &&
                req.slotIndex === action.actor.slotIndex &&
                currentActionIndex > req.triggeredByActionIndex
            )
    
            const isMatch = reqIndex !== -1
    
            if (action.type === "switch-after-ko") {
                if (isMatch) {
                     matchedReqIndices.add(reqIndex)
                     processedActions.push(action)
                } else {
                     if (action.metadata?.fusedFrom) {
                         // 1. Defusion / Split: 
                         const originalAction: TurnAction = {
                             id: action.metadata.fusedFrom.id || crypto.randomUUID(), // Restore Original ID or fail safe
                             actor: action.actor,
                             type: "attack", // Reset to default/original type
                             target: undefined, 
                             deltas: [], 
                             metadata: {}, 
                             isCollapsed: true 
                         }
                         processedActions.push(originalAction)

                         // B. The Switch Action (Switch) - Ejected downwards
                         const switchAction: TurnAction = {
                            id: action.id, // Keep the Switch ID
                            type: "switch-after-ko",
                            actor: action.actor,
                            target: action.target,
                            deltas: action.deltas,
                            metadata: { ...action.metadata, fusedFrom: undefined },
                            isCollapsed: action.isCollapsed
                         }
                         
                         // We also update cache to be super safe
                         const key = `${action.actor.side}-${action.actor.slotIndex}`
                         orphanedChoicesRef.current.set(key, { 
                             id: switchAction.id,
                             target: switchAction.target,
                             deltas: switchAction.deltas || [],
                             isCollapsed: switchAction.isCollapsed ?? true
                         })

                         changesMade = true
                     } else {
                         // Case: Unmatched Switch Action. We drop it (delete).
                         changesMade = true
                     }
                }
            } else {
                if (isMatch) {
                    matchedReqIndices.add(reqIndex)
                    
                    // FUSION HAPPENING (Merge)
                   
                    const key = `${action.actor.side}-${action.actor.slotIndex}`
                    const cachedSwitch = orphanedChoices.get(key)
                    
                    const switchId = cachedSwitch?.id || crypto.randomUUID()

                    processedActions.push({
                        ...action, // Keep basic props (actor)
                        id: switchId, // SWAP ID -> Become the Switch
                        type: "switch-after-ko",
                        target: cachedSwitch?.target, 
                        
                        deltas: cachedSwitch?.deltas || (cachedSwitch?.target ? [{
                            type: "SWITCH",
                            side: action.actor.side,
                            fromSlot: action.actor.slotIndex,
                            toSlot: cachedSwitch.target.slotIndex
                        }] : []),
                        
                        // Restore PRESERVED collapsed state
                        isCollapsed: cachedSwitch?.isCollapsed ?? true,
                        
                        metadata: {
                            ...action.metadata,
                            fusedFrom: {
                                id: action.id, // SAVE Original Action ID
                                type: action.type,
                                // We strictly DO NOT save target/deltas of the ACTION here to comply with "data deleted" rule
                            }
                        }
                    })
                    changesMade = true
                } else {
                    processedActions.push(action)
                }
            }
        })
    
        requirements.forEach((req, idx) => {
            if (!matchedReqIndices.has(idx)) {
                // Check for orphaned choice for this slot
                const key = `${req.side}-${req.slotIndex}`
                const recoveredData = orphanedChoices.get(key)

                const newSwitch: TurnAction = {
                    id: recoveredData?.id || crypto.randomUUID(), // RECOVER ID if available
                    type: "switch-after-ko",
                    actor: { side: req.side, slotIndex: req.slotIndex },
                    target: recoveredData?.target, // Apply recovered target if available
                    // Restore PRESERVED deltas (including switch + effects)
                    deltas: recoveredData?.deltas || (recoveredData?.target ? [{
                        type: "SWITCH",
                        side: req.side,
                        fromSlot: req.slotIndex,
                        toSlot: recoveredData.target.slotIndex
                    }] : []),
                    metadata: {},
                    // Restore PRESERVED collapsed state
                    isCollapsed: recoveredData?.isCollapsed ?? true
                }
    
                const triggerActionId = actions[req.triggeredByActionIndex]?.id
                
                let insertionIndex = processedActions.findIndex(a => a.id === triggerActionId)
    
                if (insertionIndex === -1) {
                    processedActions.push(newSwitch)
                } else {
                    insertionIndex++ 
    
                    while (insertionIndex < processedActions.length) {
                        const nextAction = processedActions[insertionIndex]
                        
                        if (nextAction.type !== "switch-after-ko") break
    
                         const nextReqIndex = requirements.findIndex(r => 
                            r.side === nextAction.actor.side &&
                            r.slotIndex === nextAction.actor.slotIndex &&
                            r.triggeredByActionIndex === req.triggeredByActionIndex 
                        )
    
                        if (nextReqIndex !== -1) {
                             if (nextAction.actor.slotIndex < req.slotIndex) {
                                 insertionIndex++
                             } else {
                                 break
                             }
                        } else {
                            break
                        }
                    }
                    
                    processedActions.splice(insertionIndex, 0, newSwitch)
                }
                changesMade = true
            }
        })
    
        if (changesMade) {
            setActions(processedActions)
        }
    
      }, [actions, detectedKOs, getStateAtAction, readOnly, setActions])
}
