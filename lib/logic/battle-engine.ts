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

        // 3. Process Post-Turn Actions (Switches after KO)
        const postActions = node.turnData.postTurnActions || []
        for (const action of postActions) {
            const effectiveDeltas: BattleDelta[] = action.deltas || []
            for (const delta of effectiveDeltas) {
                currentState = this.applyDelta(currentState, delta)
            }
        }
      }
    }

    return currentState
  }

  /**
   * Resolves a battlefield slot to the actual team index.
   * Battlefield slots (0, 1, etc.) represent active positions on the field.
   * This method looks up which Pokemon from the team roster is currently in that position.
   * 
   * @param state Current battle state
   * @param side Which side ("my" or "opponent")
   * @param battlefieldSlot The battlefield slot (0 = first active position, 1 = second, etc.)
   * @returns The team array index, or null if slot is empty
   */
  static resolveSlotToTeamIndex(
    state: BattleState, 
    side: "my" | "opponent", 
    battlefieldSlot: number
  ): number | null {
    const activeSlots = side === "my" 
      ? state.activeSlots?.myTeam 
      : state.activeSlots?.opponentTeam
    
    if (!activeSlots || battlefieldSlot >= activeSlots.length) {
      return null
    }
    
    return activeSlots[battlefieldSlot] ?? null
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
        
        // Resolve battlefield slot to team index
        // This ensures we hit whoever is CURRENTLY in this battlefield position
        const teamIndex = this.resolveSlotToTeamIndex(
          newState, 
          delta.target.side, 
          delta.target.slotIndex
        )
        
        if (teamIndex === null) {
          // No Pokemon in this battlefield slot, skip damage application
          return newState
        }
        
        const targetPokemon = team[teamIndex]
        
        if (targetPokemon) {
             const newPokemon = { 
                 ...targetPokemon, 
                 hpPercent: Math.max(0, Math.min(100, targetPokemon.hpPercent + delta.amount)) 
             }
             team[teamIndex] = newPokemon
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
             slotsToUpdate[activePointerIndex] = delta.toSlot === -1 ? null : delta.toSlot
             // console.log("BattleEngine: Switch Successful", { from: delta.fromSlot, to: delta.toSlot, newSlots: slotsToUpdate })
        } else {
             // console.warn("BattleEngine: Switch Failed - fromSlot not found in active slots", { fromSlot: delta.fromSlot, activeSlots: slotsToUpdate })
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
        // 1. Create a deep copy of currentState to nextState
        let nextState = JSON.parse(JSON.stringify(currentState)) as BattleState

        // Validation for switch-after-ko: Skip if actor is not KO
        if (action.type === 'switch-after-ko') {
             const actorSide = action.actor?.side
             const actorSlotIndex = action.actor?.slotIndex
             if (actorSide && actorSlotIndex !== undefined) {
                 const team = actorSide === 'my' ? currentState.myTeam : currentState.enemyTeam
                 const actor = team[actorSlotIndex]
                 if (actor && actor.hpPercent > 0) {
                     // Actor is alive, so this switch-after-ko is invalid/stale.
                     // Treat as no-op.
                     states.push(currentState) // Push duplicate state to keep index alignment
                     continue 
                 }
             }
        }

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
