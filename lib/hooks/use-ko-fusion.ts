import { BattleState, TurnAction } from "@/types/types"
import { useEffect } from "react"

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
        let changesMade = false
    
        actions.forEach((action, currentActionIndex) => {
            const reqIndex = requirements.findIndex((req, idx) => 
                !matchedReqIndices.has(idx) &&
                req.side === action.actor.side &&
                req.slotIndex === action.actor.slotIndex &&
                currentActionIndex > req.triggeredByActionIndex
            )
    
            const isMatch = reqIndex !== -1
    
            if (action.type === "forced-switch") {
                if (isMatch) {
                     matchedReqIndices.add(reqIndex)
                     processedActions.push(action)
                } else {
                     if (action.metadata?.fusedFrom) {
                         processedActions.push({
                             ...action,
                             type: action.metadata.fusedFrom.type,
                             target: action.metadata.fusedFrom.target,
                             metadata: {
                                 ...action.metadata,
                                 fusedFrom: undefined
                             }
                         })
                         changesMade = true
                     } else {
                         changesMade = true
                     }
                }
            } else {
                if (isMatch) {
                    matchedReqIndices.add(reqIndex)
                    processedActions.push({
                        ...action,
                        type: "forced-switch",
                        target: undefined, 
                        metadata: {
                            ...action.metadata,
                            fusedFrom: {
                                type: action.type,
                                target: action.target
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
                const newSwitch: TurnAction = {
                    id: crypto.randomUUID(),
                    type: "forced-switch",
                    actor: { side: req.side, slotIndex: req.slotIndex },
                    target: undefined,
                    deltas: [],
                    metadata: {},
                    isCollapsed: true
                }
    
                const triggerActionId = actions[req.triggeredByActionIndex]?.id
                
                let insertionIndex = processedActions.findIndex(a => a.id === triggerActionId)
    
                if (insertionIndex === -1) {
                    processedActions.push(newSwitch)
                } else {
                    insertionIndex++ 
    
                    while (insertionIndex < processedActions.length) {
                        const nextAction = processedActions[insertionIndex]
                        
                        if (nextAction.type !== "forced-switch") break
    
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
