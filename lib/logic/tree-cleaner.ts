import { TreeNode, TurnAction } from "@/types/types"

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

export type ModificationType = 'DELETE_POKEMON' | 'CHANGE_DEPLOYMENT'

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
                    deltas: [],
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
                    deltas: [],
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
                
                action.deltas.forEach(delta => {
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
            
            // 2. Remap End Of Turn Deltas
            newNode.turnData.endOfTurnDeltas.forEach(delta => {
                 if (delta.type === 'HP_RELATIVE' && typeof delta.target === 'object') {
                     shiftRef(delta.target as IndexRef)
                 }
            })
            
            // 3. Remap Post Turn Actions
            if (newNode.turnData.postTurnActions) {
                newNode.turnData.postTurnActions.forEach(action => {
                    shiftRef(action.actor)
                    shiftRef(action.target)
                    action.deltas.forEach(delta => {
                        if (delta.type === 'HP_RELATIVE' && typeof delta.target === 'object') {
                             shiftRef(delta.target as IndexRef)
                        }
                    })
                })
            }

            return newNode
        })
    }
    
    return nodes
}
