import { convertPercentDeltaToHp, getEffectiveHpMax, recalcHpPercent } from "@/lib/utils/hp-utils"
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
            // 1. Action-level deltas first (SWITCH, PP_CHANGE)
            for (const delta of (action.actionDeltas || [])) {
                currentState = this.applyDelta(currentState, delta)
            }
            // 2. User effects (HP_RELATIVE etc.)
            for (const effect of (action.effects || [])) {
                for (const delta of effect.deltas) {
                    currentState = this.applyDelta(currentState, delta)
                }
            }
        }
        
        // 2. Process End of Turn
        const eotEffects = node.turnData.endOfTurnEffects || []
        for (const effect of eotEffects) {
             for (const delta of effect.deltas) {
                 currentState = this.applyDelta(currentState, delta)
             }
        }

        // 3. Process Post-Turn Actions (Switches after KO)
        const postActions = node.turnData.postTurnActions || []
        for (const action of postActions) {
            for (const delta of (action.actionDeltas || [])) {
                currentState = this.applyDelta(currentState, delta)
            }
            for (const effect of (action.effects || [])) {
                for (const delta of effect.deltas) {
                    currentState = this.applyDelta(currentState, delta)
                }
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
      case "HP_RELATIVE":
      case "HP_SET": {
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Resolve battlefield slot to team index
        const teamIndex = this.resolveSlotToTeamIndex(
          newState, 
          delta.target.side, 
          delta.target.slotIndex
        )
        
        if (teamIndex === null) {
          return newState
        }
        
        const targetPokemon = team[teamIndex]
        
        if (targetPokemon) {
             // --- Unit handling ---
             const hpMax = getEffectiveHpMax(targetPokemon)
             
             let newHpCurrent: number;

             if (delta.type === "HP_SET") {
                 // 1. Calculate the exact targeted HP
                 const targetHp = delta.unit === "hp" 
                     ? delta.amount 
                     : Math.round((delta.amount / 100) * hpMax)
                     
                 // 2. Bound it to max/min
                 newHpCurrent = Math.max(0, Math.min(hpMax, targetHp))
             } else {
                 // 1. Calculate the exact HP change using Math.trunc for correct rounding (-12.5 -> -12)
                 const deltaHp = delta.unit === "hp" 
                     ? delta.amount 
                     : convertPercentDeltaToHp(delta.amount, hpMax)
                     
                 // 2. Apply it to hpCurrent and bound it
                 const currentHp = targetPokemon.hpCurrent ?? hpMax
                 newHpCurrent = Math.max(0, Math.min(hpMax, currentHp + deltaHp))
             }
             
             // 3. Recalculate percent strictly from the new current HP
             const newHpPercent = recalcHpPercent(newHpCurrent, hpMax)
             
             team[teamIndex] = { ...targetPokemon, hpPercent: newHpPercent, hpCurrent: newHpCurrent }

             // If the Pokémon just fainted, remove it from the battlefield slot.
             if (newHpPercent === 0) {
               const slots = delta.target.side === "my"
                 ? newState.activeSlots.myTeam
                 : newState.activeSlots.opponentTeam
               const battlefieldSlot = delta.target.slotIndex
               if (battlefieldSlot < slots.length) {
                 slots[battlefieldSlot] = null
               }
             }
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

        // newActiveSlots is already assigned to newState.activeSlots at line 139
        const slotsToUpdate = delta.side === "my" ? newActiveSlots.myTeam : newActiveSlots.opponentTeam
        
        // 3. Find where to apply the switch
        let activePointerIndex = -1
        
        if (delta.slotIndex !== undefined) {
             // Use explicit battlefield slot if provided
             activePointerIndex = delta.slotIndex
        } else {
             // Fallback: Find the loop index where "fromSlot" is currently active
             activePointerIndex = slotsToUpdate.indexOf(delta.fromSlot)
        }

        if (activePointerIndex !== -1 && activePointerIndex < slotsToUpdate.length) {
             // 4. Update the pointer to point to the new Pokemon (delta.toSlot)
             slotsToUpdate[activePointerIndex] = delta.toSlot === -1 ? null : delta.toSlot
        } else {
             // console.warn("BattleEngine: Switch Failed - target slot not found", { delta, activeSlots: slotsToUpdate })
        }

        return newState
      }

      case "PP_CHANGE": {
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Resolve battlefield slot to team index
        const teamIndex = this.resolveSlotToTeamIndex(
          newState, 
          delta.target.side, 
          delta.target.slotIndex
        )
        
        if (teamIndex === null) return newState
        
        const targetPokemon = team[teamIndex]
        
        if (targetPokemon && targetPokemon.attacks) {
            const attackIndex = targetPokemon.attacks.findIndex(a => a.name === delta.moveName)
            if (attackIndex !== -1) {
                const newAttacks = [...targetPokemon.attacks]
                const attack = newAttacks[attackIndex]
                newAttacks[attackIndex] = {
                    ...attack,
                    currentPP: Math.max(0, attack.currentPP + delta.amount)
                }
                
                team[teamIndex] = {
                    ...targetPokemon,
                    attacks: newAttacks
                }
            }
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

        // Validation for switch-after-ko: Skip if the battlefield slot still has a living pokemon.
        if (action.type === 'switch-after-ko') {
             const actorSide = action.actor?.side
             const battlefieldSlot = action.actor?.slotIndex
             if (actorSide !== undefined && battlefieldSlot !== undefined) {
                 const slots = actorSide === 'my'
                   ? currentState.activeSlots?.myTeam
                   : currentState.activeSlots?.opponentTeam
                 const teamIndex = slots?.[battlefieldSlot] ?? null
                 if (teamIndex !== null) {
                     // Slot is occupied by a living pokemon — this switch-after-ko is stale
                     const team = actorSide === 'my' ? currentState.myTeam : currentState.enemyTeam
                     if (team[teamIndex] && team[teamIndex].hpPercent > 0) {
                         states.push(currentState)
                         continue
                     }
                 }
             }
        }

        // 2. State mutations (HP changes, switches) are handled via deltas.

        // 3. Apply Deltas: Continue applying deltas via this.applyDelta
        for (const delta of (action.actionDeltas || [])) {
            nextState = this.applyDelta(nextState, delta)
        }
        for (const effect of (action.effects || [])) {
            for (const delta of effect.deltas) {
                nextState = this.applyDelta(nextState, delta)
            }
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
