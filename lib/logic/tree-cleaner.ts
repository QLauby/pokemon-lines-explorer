import { resolveHpMaxFromState } from "@/lib/utils/hp-utils"
import { BattleState, TreeNode, TurnAction } from "@/types/types"
import { traverseTreeWithState } from "./tree-traversal"

/**
 * Removes the specified nodes and all their descendants from the tree.
 * 
 * @param nodes The full list of nodes in the tree.
 * @param corruptedNodeIds The IDs of the nodes identified as the "root" of corruption.
 * @returns A new array of nodes with the corrupted branches removed.
 */
export function pruneTree(
  nodes: TreeNode[],
  corruptedNodeIds: string[]
): TreeNode[] {
  // 1. Identify all nodes to remove (recursive)
  const nodesToRemove = new Set<string>(corruptedNodeIds)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Helper to mark descendants
  const markDescendants = (parentId: string) => {
    // Find children
    nodes.forEach(n => {
        if (n.parentId === parentId) {
            nodesToRemove.add(n.id)
            markDescendants(n.id)
        }
    })
  }

  // Initial pass for direct corrupted nodes
  corruptedNodeIds.forEach(id => {
      markDescendants(id)
  })

  // 2. Filter the nodes
  return nodes.filter(n => !nodesToRemove.has(n.id))
}

export type ModificationType = 'DELETE_POKEMON' | 'CHANGE_DEPLOYMENT' | 'CHANGE_HP_MODE' | 'REORDER_POKEMON'

export interface IndexRef {
    side: 'my' | 'opponent'
    slotIndex: number
}

// ... (keep sanitizeTreeForModification signature)
export function sanitizeTreeForModification(
  nodes: TreeNode[],
  type: ModificationType,
  payload: any
): TreeNode[] {
    if (type === 'CHANGE_DEPLOYMENT') {
        const { newActiveSlots } = payload as { newActiveSlots: { myTeam: number[], opponentTeam: number[] } }
        
        return nodes.map(node => {
            if (node.turn !== 0) return node
            
            const newNode = JSON.parse(JSON.stringify(node)) as TreeNode
            
            // Regenerate deployment actions for both sides
            const deploymentActions: TurnAction[] = []
            
            // My Team deployments
            const myLimit = newActiveSlots.myTeam.filter(x => x !== null && x !== undefined).length
            for (let i = 0; i < myLimit; i++) {
                deploymentActions.push({
                    id: `deploy-my-${i}`,
                    type: "switch",
                    actor: { side: "my", slotIndex: i },
                    target: { side: "my", slotIndex: i },
                    actionDeltas: [],
                    effects: [],
                    isCollapsed: true
                })
            }
            
            // Opponent Team deployments
            const oppLimit = newActiveSlots.opponentTeam.filter(x => x !== null && x !== undefined).length
            for (let i = 0; i < oppLimit; i++) {
                deploymentActions.push({
                    id: `deploy-opp-${i}`,
                    type: "switch",
                    actor: { side: "opponent", slotIndex: i },
                    target: { side: "opponent", slotIndex: i },
                    actionDeltas: [],
                    effects: [],
                    isCollapsed: true
                })
            }
            
            newNode.turnData.actions = deploymentActions
            return newNode
        })
    }
    if (type === 'DELETE_POKEMON') {
        const { originalIndex, isMyTeam } = payload as { originalIndex: number, isMyTeam: boolean }
        
        return nodes.map(node => {
            // Deep clone to avoid mutation
            const newNode = JSON.parse(JSON.stringify(node)) as TreeNode
            
            // Helper to shift index
            const shiftRef = (ref: IndexRef | undefined) => {
                if (!ref) return
                // We only shift if it's the SAME SIDE
                const sameSide = (ref.side === 'my' && isMyTeam) || (ref.side === 'opponent' && !isMyTeam)
                
                if (sameSide && ref.slotIndex > originalIndex) {
                    ref.slotIndex -= 1
                }
            }
            
            // 1. Remap Actions
            newNode.turnData.actions.forEach(action => {
                shiftRef(action.actor)
                shiftRef(action.target)
                
                action.effects.forEach(effect => {
                    shiftRef(effect.target)
                    effect.deltas.forEach(delta => {
                        if (delta.type === 'HP_RELATIVE' && typeof delta.target === 'object') {
                             shiftRef(delta.target as IndexRef)
                        }
                        if (delta.type === 'SWITCH') {
                             if (isMyTeam && action.actor.side === 'my' && delta.fromSlot > originalIndex) delta.fromSlot--
                             if (!isMyTeam && action.actor.side === 'opponent' && delta.fromSlot > originalIndex) delta.fromSlot--
                             
                             if (isMyTeam && action.actor.side === 'my' && delta.toSlot > originalIndex) delta.toSlot--
                             if (!isMyTeam && action.actor.side === 'opponent' && delta.toSlot > originalIndex) delta.toSlot--
                        }
                    })
                })
            })
            
            // 2. Remap End Of Turn Deltas
            newNode.turnData.endOfTurnEffects.forEach(effect => {
                 shiftRef(effect.target)
                 effect.deltas.forEach(delta => {
                     if (delta.type === 'HP_RELATIVE' && typeof delta.target === 'object') {
                         shiftRef(delta.target as IndexRef)
                     }
                 })
            })
            
            // 3. Remap Post Turn Actions
            if (newNode.turnData.postTurnActions) {
                newNode.turnData.postTurnActions.forEach(action => {
                    shiftRef(action.actor)
                    shiftRef(action.target)
                    action.effects.forEach(effect => {
                        shiftRef(effect.target)
                        effect.deltas.forEach(delta => {
                            if (delta.type === 'HP_RELATIVE' && typeof delta.target === 'object') {
                                 shiftRef(delta.target as IndexRef)
                            }
                        })
                    })
                })
            }

            return newNode
        })
    }
    
    if (type === 'CHANGE_HP_MODE') {
        const { newHpMode, currentHpMode, initialState } = payload as { 
            newHpMode: "percent" | "hp" | "rolls"
            currentHpMode: "percent" | "hp" | "rolls"
            initialState: BattleState 
        }

        // ── percent → hp : no tree changes needed (corruption handler normalises initialState) ──
        if (newHpMode === "hp" || newHpMode === "rolls") return nodes

        // ── rolls → hp → (handled by rolls-to-hp conversion below) ──
        // ── rolls → percent : convert rollProfiles to %, handled below ──
        // ── hp → percent : convert HP deltas to % ──

        // Deep copy nodes to mutate them safely in place during traversal
        const clonedNodes = JSON.parse(JSON.stringify(nodes)) as TreeNode[]

        traverseTreeWithState(clonedNodes, initialState, {
            onBeforeDelta: (delta, currentState) => {
                if (delta.type === 'HP_RELATIVE' && delta.unit === 'hp') {
                    const hpMax = resolveHpMaxFromState(currentState, delta.target)
                    // Preserve sign; no rounding — the stored value is the precise %
                    delta.amount = (delta.amount / hpMax) * 100
                    delta.unit = 'percent'
                    // Clear rollProfile if converting away from rolls (% is incompatible)
                    ;(delta as any).rollProfile = undefined
                }
            }
        })

        return clonedNodes
    }

    if (type === 'REORDER_POKEMON') {
        const { isMyTeam, oldIndex, newIndex } = payload as { isMyTeam: boolean, oldIndex: number, newIndex: number }
        
        return nodes.map(node => {
            const newNode = JSON.parse(JSON.stringify(node)) as TreeNode
            
            const remapRef = (ref?: any, forceRemapTeamIndex = false) => {
                if (!ref) return
                const sameSide = (ref.side === 'my' && isMyTeam) || (ref.side === 'opponent' && !isMyTeam)
                if (!sameSide) return

                // 1. Remap teamIndex (always safe)
                if (ref.teamIndex !== undefined) {
                    if (ref.teamIndex === oldIndex) ref.teamIndex = newIndex
                    else if (ref.teamIndex === newIndex) ref.teamIndex = oldIndex
                }
                
                // 2. Remap slotIndex
                // If forceRemapTeamIndex is true (e.g. action.target for a switch), we remap it regardless of value
                // Otherwise, we only remap if it's > 1 (bench in double battle)
                const isLikelyTeamIndex = forceRemapTeamIndex || ref.type === 'team_index' || ref.slotIndex > 1
                
                if (ref.slotIndex !== undefined && isLikelyTeamIndex) {
                    if (ref.slotIndex === oldIndex) ref.slotIndex = newIndex
                    else if (ref.slotIndex === newIndex) ref.slotIndex = oldIndex
                }
            }

            const remapDelta = (d: any) => {
                const sameSide = (d.side === 'my' && isMyTeam) || (d.side === 'opponent' && !isMyTeam)
                if (d.type === 'SWITCH' && sameSide) {
                    if (d.fromSlot === oldIndex) d.fromSlot = newIndex
                    else if (d.fromSlot === newIndex) d.fromSlot = oldIndex
                    
                    if (d.toSlot === oldIndex) d.toSlot = newIndex
                    else if (d.toSlot === newIndex) d.toSlot = oldIndex
                }
                // For a SWITCH delta, any target is likely a team index
                if (d.target) remapRef(d.target, d.type === 'SWITCH')
            }

            const remapAction = (a: TurnAction) => {
                const isSwitch = a.type === 'switch' || a.type === 'switch-after-ko'
                remapRef(a.actor) // Actor is always a field slot (0 or 1) except in post-turn sometimes, but slotIndex > 1 check inside remapRef handles it
                remapRef(a.target, isSwitch) 
                a.actionDeltas.forEach(remapDelta)
                a.effects.forEach(e => {
                    remapRef(e.target)
                    e.deltas.forEach(remapDelta)
                })
            }

            newNode.turnData.actions.forEach(remapAction)
            newNode.turnData.endOfTurnEffects.forEach(e => {
                remapRef(e.target)
                e.deltas.forEach(remapDelta)
            })
            if (newNode.turnData.postTurnActions) newNode.turnData.postTurnActions.forEach(remapAction)

            return newNode
        })
    }

    return nodes
}
