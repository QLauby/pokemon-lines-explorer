import { BattleDelta, BattleState, StatsModifiers, TreeNode } from "@/types/types"

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
      
      // Process TurnData if visible
      if (node.turnData) {
        // 1. Process Ordered Actions
        for (const action of node.turnData.actions) {
            
            const effectiveDeltas: BattleDelta[] = action.deltas || []
            for (const delta of effectiveDeltas) {
                currentState = this.applyDelta(currentState, delta)
            }
        }
        
        // 2. Process End of Turn
        const eotDeltas = node.turnData.endOfTurnDeltas || []
        for (const delta of eotDeltas) {
             currentState = this.applyDelta(currentState, delta)
        }
      }
    }

    return currentState
  }

  static applyDelta(state: BattleState, delta: BattleDelta): BattleState {
    const newState = { 
        ...state, 
        myTeam: [...state.myTeam], 
        enemyTeam: [...state.enemyTeam],
        // Safety copy for activeSlots
        activeSlots: { 
            myTeam: [...(state.activeSlots?.myTeam || [])], 
            opponentTeam: [...(state.activeSlots?.opponentTeam || [])] 
        }
    }

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
        // 1. Deep copy activeSlots to ensure immutability
        const newActiveSlots = {
             myTeam: [...(newState.activeSlots?.myTeam || [])],
             opponentTeam: [...(newState.activeSlots?.opponentTeam || [])]
        }
        newState.activeSlots = newActiveSlots

        // 2. Identify which side to update
        const slotsToUpdate = delta.side === "my" ? newActiveSlots.myTeam : newActiveSlots.opponentTeam
        
        // 3. Find the loop index where "fromSlot" is currently active
        const activePointerIndex = slotsToUpdate.indexOf(delta.fromSlot)

        if (activePointerIndex !== -1) {
             // 4. Update the pointer to point to the new Pokemon (delta.toSlot)
             slotsToUpdate[activePointerIndex] = delta.toSlot
        }

        return newState
      }

      default:
        return state
    }
  }



  /**
   * Computes the sequence of states for a single turn, step by step for each action.
   * Returns an array where index i corresponds to the state BEFORE action i,
   * and the last element corresponds to the state AFTER the last action.
   */
  static computeTurnSequence(initialState: BattleState, actions: any[]): BattleState[] {
    const states: BattleState[] = []
    
    // State 0: Initial
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState
    states.push(currentState)

    for (const action of actions) {
        // 1. Create a deep copy of currentState to nextState to avoid mutation by reference
        let nextState = JSON.parse(JSON.stringify(currentState)) as BattleState

        // 2. State mutations (HP changes, switches) are handled via deltas.

        // 3. Apply Deltas: Continue applying deltas via this.applyDelta
        const deltas = action.deltas || []
        for (const delta of deltas) {
            nextState = this.applyDelta(nextState, delta)
        }
        
        currentState = nextState
        states.push(currentState)
    }

    return states
  }

  static getStatsModifiersDefault(): StatsModifiers {
    return {
        att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0
    }
  }
}
