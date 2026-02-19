import { CombatSession, TreeNode } from "@/types/types"
import { ModificationType } from "./tree-cleaner"

type CorruptionCriteria = (node: TreeNode, payload: any) => boolean

/**
 * Factory to get the corruption criteria function based on modification type.
 */
function isSlotInvolved(node: TreeNode, isMyTeam: boolean, slotIndex: number): boolean {
    // Helper to check if a ref matches the target slot
    const isMatch = (ref: { side: 'my' | 'opponent', slotIndex: number } | undefined) => {
        if (!ref) return false
        const sideMatch = isMyTeam ? ref.side === 'my' : ref.side === 'opponent'
        return sideMatch && ref.slotIndex === slotIndex
    }

    // 1. Check Actions
    const actionsCorrupted = node.turnData.actions.some(action => {
        if (isMatch(action.actor)) return true
        if (isMatch(action.target)) return true
        if (action.effects.some(e => e.deltas.some(d => d.type === 'HP_RELATIVE' && typeof d.target === 'object' && isMatch(d.target)))) return true
        return false
    })
    if (actionsCorrupted) return true
    
    // 2. Check End of Turn Deltas
    const eotCorrupted = node.turnData.endOfTurnEffects.some(effect => {
        return effect.deltas.some(d => d.type === 'HP_RELATIVE' && typeof d.target === 'object' && isMatch(d.target))
    })
    if (eotCorrupted) return true

    // 3. Post Turn Actions
    if (node.turnData.postTurnActions) {
            const postCorrupted = node.turnData.postTurnActions.some(action => {
            if (isMatch(action.actor)) return true
            if (isMatch(action.target)) return true
            return false
            })
            if (postCorrupted) return true
    }
    
    return false
}

function getCorruptionCriteria(type: ModificationType): CorruptionCriteria {
    switch (type) {
        case 'DELETE_POKEMON':
            return (node: TreeNode, payload: { originalIndex: number, isMyTeam: boolean }) => {
                return isSlotInvolved(node, payload.isMyTeam, payload.originalIndex)
            }
        case 'CHANGE_DEPLOYMENT':
            return (node: TreeNode) => {
                // Turn 0: Only corrupted if it has deltas (actual gameplay logic)
                if (node.turn === 0) {
                    const hasActionDeltas = node.turnData.actions.some(a => a.effects.some(e => e.deltas.length > 0))
                    const hasEndOfTurnDeltas = node.turnData.endOfTurnEffects.length > 0
                    return hasActionDeltas || hasEndOfTurnDeltas
                }
                
                // Turn 1+: Always corrupted (active Pokémon have changed)
                return true
            }
        default:
            return () => false
    }
}

/**
 * Detects which nodes become invalid (corrupted) based on a specific modification.
 */
export function detectCorruption(
  originalSession: CombatSession,
  modification: { type: ModificationType; payload: any }
): string[] {
  // Generic Strategy for all modifications
  const criteria = getCorruptionCriteria(modification.type)
  const corruptedIds: string[] = []
  const visited = new Set<string>()
  
  const checkNodeRec = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      
      const node = originalSession.nodes.find(n => n.id === nodeId)
      if (!node) return

      if (criteria(node, modification.payload)) {
          corruptedIds.push(nodeId)
          // Stop traversing this branch
          return 
      }
      
      // Continue to children
      const children = originalSession.nodes.filter(n => n.parentId === nodeId)
      children.forEach(child => checkNodeRec(child.id))
  }
  
  const rootChildren = originalSession.nodes.filter(n => !n.parentId || n.parentId === 'root')
  rootChildren.forEach(child => checkNodeRec(child.id))

  return corruptedIds
}

