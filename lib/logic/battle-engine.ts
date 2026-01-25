import { BattleDelta, BattleState, SlotReference, StatsModifiers, TreeNode } from "../types"

export class BattleEngine {
  static computeState(initialState: BattleState, nodes: Map<string, TreeNode>, targetNodeId: string): BattleState {
    if (!targetNodeId || !nodes.has(targetNodeId)) {
      return initialState
    }

    // 1. Trace path from target to root
    const path: TreeNode[] = []
    let currentId: string | undefined = targetNodeId
    while (currentId && nodes.has(currentId)) {
      const node = nodes.get(currentId)
      if (!node) break
      path.unshift(node)
      currentId = node.parentId
    }

    // 2. Apply turn data sequentially
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState // Deep copy initial state

    for (const node of path) {
      if (node.id === "root") continue
      
      // Process TurnData if visible
      if (node.turnData) {
        // 1. Process Ordered Actions
        for (const action of node.turnData.actions) {
            
            // --- Legacy Support Start ---
            const effectiveDeltas: BattleDelta[] = [...(action.deltas || [])]

            // Legacy Switch Handling
            if (action.type === "switch" && action.targetId && action.actorId && effectiveDeltas.length === 0) {
                 const from = this.findSlotForId(currentState, action.actorId)
                 const to = this.findSlotForId(currentState, action.targetId)
                 if (from && to) {
                     effectiveDeltas.push({
                         type: "SWITCH",
                         side: from.side,
                         fromSlot: from.slotIndex,
                         toSlot: to.slotIndex
                     })
                 }
            }

            // Legacy HP Changes Handling
            if (action.hpChanges && action.hpChanges.length > 0) {
                 for (const legacyDelta of action.hpChanges) {
                     const targetSlot = this.findSlotForId(currentState, legacyDelta.targetId)
                     if (targetSlot) {
                         effectiveDeltas.push({
                             type: "HP_RELATIVE",
                             target: targetSlot,
                             amount: legacyDelta.amount
                         })
                     }
                 }
            }
            // --- Legacy Support End ---

            for (const delta of effectiveDeltas) {
                currentState = this.applyDelta(currentState, delta)
            }
        }
        
        // 2. Process End of Turn
        // Handle potential missing endOfTurnDeltas or legacy structure if needed
        const eotDeltas = node.turnData.endOfTurnDeltas || []
        for (const delta of eotDeltas) {
             // Check if it's a legacy delta (targetId instead of target)
             if ('targetId' in delta && typeof delta.targetId === 'string') {
                  const targetSlot = this.findSlotForId(currentState, delta.targetId as string)
                  if (targetSlot) {
                      const amount = (delta as any).amount || 0
                      currentState = this.applyDelta(currentState, {
                          type: "HP_RELATIVE",
                          target: targetSlot,
                          amount: amount
                      })
                  }
             } else {
                 currentState = this.applyDelta(currentState, delta)
             }
        }
      }
    }

    return currentState
  }
  
  // Helper for Legacy Migrations
  private static findSlotForId(state: BattleState, id: string): SlotReference | null {
      const myIndex = state.myTeam.findIndex(p => p.id === id)
      if (myIndex !== -1) return { side: "my", slotIndex: myIndex }
      
      const oppIndex = state.enemyTeam.findIndex(p => p.id === id)
      if (oppIndex !== -1) return { side: "opponent", slotIndex: oppIndex }
      
      return null
  }

  static applyDelta(state: BattleState, delta: BattleDelta): BattleState {
    const newState = { ...state, myTeam: [...state.myTeam], enemyTeam: [...state.enemyTeam] }

    switch (delta.type) {
      case "HP_RELATIVE": {
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        const targetPokemon = team[delta.target.slotIndex]
        
        if (targetPokemon) {
             const newPokemon = { 
                 ...targetPokemon, 
                 hpPercent: Math.max(0, Math.min(100, targetPokemon.hpPercent + delta.amount)) 
             }
             team[delta.target.slotIndex] = newPokemon
        }
        return newState
      }
      
      case "SWITCH": {
        const team = delta.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Ensure indices are valid
        if (team[delta.fromSlot] && team[delta.toSlot]) {
             // Perform the swap
             const temp = team[delta.fromSlot]
             team[delta.fromSlot] = team[delta.toSlot]
             team[delta.toSlot] = temp
        }
        return newState
      }

      default:
        return state
    }
  }

  static validateTree(initialState: BattleState, nodes: Map<string, TreeNode>): string[] {
    return []
  }

  static getStatsModifiersDefault(): StatsModifiers {
    return {
        att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0
    }
  }
}
