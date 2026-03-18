import { getEffectiveHpMax } from "@/lib/utils/hp-utils"
import { BattleDelta, BattleState, CustomTagData, OtherOperation, SlotReference, StatsModifiers, TreeNode } from "@/types/types"

export class BattleEngine {
  static computeState(initialState: BattleState, nodes: Map<string, TreeNode>, targetNodeId: string, hpMode: "percent" | "hp" = "percent"): BattleState {
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
    
    // Normalize state (for old sessions missing battlefieldState)
    if (!currentState.battlefieldState) {
        currentState.battlefieldState = { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } };
    }

    for (const node of path) {
      
      // Process TurnData if visible
      if (node.turnData) {
        // 1. Process Ordered Actions
        for (const action of node.turnData.actions) {
            // 1. Action-level deltas first (SWITCH, PP_CHANGE)
            for (const delta of (action.actionDeltas || [])) {
                currentState = this.applyDelta(currentState, delta, hpMode)
            }
            // 2. User effects (HP_RELATIVE etc.)
            for (const effect of (action.effects || [])) {
                for (const delta of effect.deltas) {
                    currentState = this.applyDelta(currentState, delta, hpMode)
                }
            }
        }
        
        // 2. Process End of Turn
        const eotEffects = node.turnData.endOfTurnEffects || []
        for (const effect of eotEffects) {
             for (const delta of effect.deltas) {
                 currentState = this.applyDelta(currentState, delta, hpMode)
             }
        }

        // 3. Process Post-Turn Actions (Switches after KO)
        const postActions = node.turnData.postTurnActions || []
        for (const action of postActions) {
            for (const delta of (action.actionDeltas || [])) {
                currentState = this.applyDelta(currentState, delta, hpMode)
            }
            for (const effect of (action.effects || [])) {
                for (const delta of effect.deltas) {
                    currentState = this.applyDelta(currentState, delta, hpMode)
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

  /**
   * Resolves a polymorphic TargetReference (SlotReference) to the actual team index.
   * If type is 'battlefield_slot', it looks up the active position.
   * If type is 'team_index', it returns the teamIndex directly.
   * If type is 'field', it returns null (not a Pokemon target).
   */
  static resolveTargetToTeamIndex(
    state: BattleState,
    target: SlotReference | undefined
  ): number | null {
    if (!target) return null;

    if (target.type === "field") {
      return null; // Field targets don't resolve to a specific team member
    }

    if (target.type === "team_index") {
      return target.teamIndex ?? null;
    }

    // Default: battlefield_slot
    const side = target.side;
    const battlefieldSlot = (target as any).slotIndex; // Cast because TS sees it as TargetReference which might not have slotIndex depending on narrowing

    if (side === undefined || battlefieldSlot === undefined) return null;

    const activeSlots = side === "my" 
      ? state.activeSlots?.myTeam 
      : state.activeSlots?.opponentTeam
    
    if (!activeSlots || battlefieldSlot >= activeSlots.length) {
      return null
    }
    
    return activeSlots[battlefieldSlot] ?? null
  }

  static applyDelta(state: BattleState, delta: BattleDelta, hpMode: "percent" | "hp" = "percent"): BattleState {
    const newState = { 
        ...state, 
        myTeam: [...state.myTeam], 
        enemyTeam: [...state.enemyTeam],
        // Safety copy for activeSlots
        activeSlots: { 
            myTeam: [...(state.activeSlots?.myTeam || [])], 
            opponentTeam: [...(state.activeSlots?.opponentTeam || [])] 
        },
        battlefieldState: {
            ...state.battlefieldState,
            customTags: [...(state.battlefieldState?.customTags || [])],
            playerSide: {
                ...(state.battlefieldState?.playerSide || {}),
                customTags: [...(state.battlefieldState?.playerSide?.customTags || [])]
            },
            opponentSide: {
                ...(state.battlefieldState?.opponentSide || {}),
                customTags: [...(state.battlefieldState?.opponentSide?.customTags || [])]
            }
        }
    }

    switch (delta.type) {
      case "HP_RELATIVE":
      case "HP_SET": {
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Resolve polymorphic target to team index
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        
        if (teamIndex === null) {
          return newState
        }
        
        const targetPokemon = team[teamIndex]
        if (!targetPokemon) return newState

        const hpMax = getEffectiveHpMax(targetPokemon)
        let newHpCurrent: number;
        let newHpPercent: number;

        if (hpMode === "hp") {
            // --- HP MODE (HP IS KING) ---
            // 1. Determine absolute HP magnitude of change
            let deltaHp: number;
            if (delta.type === "HP_SET") {
                deltaHp = delta.unit === "hp" 
                    ? delta.amount 
                    : Math.round((delta.amount / 100) * hpMax) // To-target sets use rounding
            } else {
                deltaHp = delta.unit === "hp"
                    ? Math.trunc(delta.amount) // Already HP, floor it
                    : Math.trunc((delta.amount * hpMax) / 100) // Percent -> HP: POKEMON FLOOR RULE
            }

            // 2. Apply to current integer HP
            const currentHp = targetPokemon.hpCurrent ?? hpMax
            if (delta.type === "HP_SET") {
                newHpCurrent = Math.max(0, Math.min(hpMax, deltaHp))
            } else {
                newHpCurrent = Math.max(0, Math.min(hpMax, currentHp + deltaHp))
            }

            // 3. Percentage is a mere consequence for display
            newHpPercent = (newHpCurrent / hpMax) * 100
        } else {
            // --- PERCENT MODE (PERCENT IS KING) ---
            // 1. Determine absolute Percentage magnitude of change
            let deltaPct: number;
            if (delta.type === "HP_SET") {
                deltaPct = delta.unit === "percent"
                    ? delta.amount
                    : (delta.amount / hpMax) * 100
            } else {
                deltaPct = delta.unit === "percent"
                    ? delta.amount
                    : (delta.amount / hpMax) * 100
            }

            // 2. Apply to current floating-point Percent
            const currentPercent = targetPokemon.hpPercent ?? 100
            if (delta.type === "HP_SET") {
                newHpPercent = Math.max(0, Math.min(100, deltaPct))
            } else {
                newHpPercent = Math.max(0, Math.min(100, currentPercent + deltaPct))
            }

            // 3. Integer HP is a mere consequence for display/mechanics
            newHpCurrent = Math.round((newHpPercent * hpMax) / 100)
        }

        team[teamIndex] = { ...targetPokemon, hpPercent: newHpPercent, hpCurrent: newHpCurrent }

        // If the PokÃ©mon just fainted and was on the battlefield, remove it.
        if (newHpPercent === 0) {
            if (!delta.target.type || delta.target.type === "battlefield_slot") {
                const slots = delta.target.side === "my"
                    ? newState.activeSlots.myTeam
                    : newState.activeSlots.opponentTeam
                const battlefieldSlot = (delta.target as any).slotIndex
                if (battlefieldSlot !== undefined && battlefieldSlot < slots.length) {
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
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Resolve polymorphic target to team index
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        
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

      case "STATUS_DELTAS": {
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        // Resolve polymorphic target to team index
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        
        if (teamIndex === null) return newState
        
        const targetPokemon = { ...team[teamIndex] }
        
        if (targetPokemon) {
            for (const op of delta.operations) {
                switch (op.type) {
                    case "ADD":
                        if (op.status === "confusion" || op.status === "love") {
                            targetPokemon[op.status] = true
                        } else {
                            targetPokemon.status = op.status
                        }
                        break
                    case "REMOVE":
                        if (op.status === "confusion" || op.status === "love") {
                            targetPokemon[op.status] = false
                        } else {
                            targetPokemon.status = null
                        }
                        break
                    case "COUNTER_RELATIVE": {
                        const counterKey = op.status === "sleep" ? "sleepCounter" : "confusionCounter"
                        const currentValue = targetPokemon[counterKey] ?? 0
                        targetPokemon[counterKey] = currentValue + op.amount
                        break
                    }
                    case "COUNTER_TOGGLE": {
                        const showKey = op.status === "sleep" ? "showSleepCounter" : "showConfusionCounter"
                        const counterKey = op.status === "sleep" ? "sleepCounter" : "confusionCounter"
                        
                        targetPokemon[showKey] = op.show
                        
                        // Safety: if we toggle ON and it's undefined, init to 0. If OFF, reset to undefined.
                        if (op.show === true && targetPokemon[counterKey] === undefined) {
                            targetPokemon[counterKey] = 0
                        } else if (op.show === false) {
                            targetPokemon[counterKey] = undefined
                        }
                        break
                    }
                }
            }
            team[teamIndex] = targetPokemon
        }
        return newState
      }

      case "STATS_MODIFIERS_DELTAS": {
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        if (teamIndex === null) return newState
        
        const targetPokemon = { ...team[teamIndex] }
        if (!targetPokemon) return newState

        const currentModifiers = delta.setAllToZero 
            ? this.getStatsModifiersDefault()
            : { ...(targetPokemon.statsModifiers || this.getStatsModifiersDefault()) }
        
        for (const op of delta.operations) {
            const oldValue = currentModifiers[op.stat] ?? 0
            const newValue = oldValue + op.amount
            
            // Clamping
            const min = -6
            const max = op.stat === "crit" ? 4 : 6
            
            currentModifiers[op.stat] = Math.max(min, Math.min(max, newValue))
        }

        team[teamIndex] = { ...targetPokemon, statsModifiers: currentModifiers }
        return newState
      }

      case "OTHERS_EFFECT_DELTAS": {
        if (delta.target.type === "field") {
             // Battlefield tags
             let currentTags: CustomTagData[] = [];
             const bf = newState.battlefieldState;
             if (delta.target.target === "global") currentTags = bf.customTags;
             else if (delta.target.target === "my_side") currentTags = bf.playerSide.customTags;
             else if (delta.target.target === "opponent_side") currentTags = bf.opponentSide.customTags;
             
             const updatedTags = this.applyOtherOperations(currentTags, delta.operations);
             
             if (delta.target.target === "global") newState.battlefieldState.customTags = updatedTags;
             else if (delta.target.target === "my_side") newState.battlefieldState.playerSide.customTags = updatedTags;
             else if (delta.target.target === "opponent_side") newState.battlefieldState.opponentSide.customTags = updatedTags;
             
             return newState;
        }
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        if (teamIndex === null) return newState
        
        const targetPokemon = { ...team[teamIndex] }
        if (!targetPokemon) return newState
        
        targetPokemon.customTags = this.applyOtherOperations(targetPokemon.customTags || [], delta.operations);
        team[teamIndex] = targetPokemon;
        
        return newState;
      }

      case "MEGA_TERA_DELTAS": {
        if (delta.target.type === "field") return newState;
        
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        if (teamIndex === null) return newState
        
        const targetPokemon = { ...team[teamIndex] }
        if (!targetPokemon) return newState
        
        for (const op of delta.operations) {
            if (op.type === "SET_MEGA") {
                targetPokemon.isMega = op.value
            } else if (op.type === "SET_TERA") {
                targetPokemon.isTerastallized = op.value
            }
        }
        
        team[teamIndex] = targetPokemon;
        return newState;
      }

      case "ABILITY_CHANGE": {
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        if (teamIndex === null) return newState
        const targetPokemon = { ...team[teamIndex] }
        if (!targetPokemon) return newState

        targetPokemon.abilityName = delta.abilityName
        team[teamIndex] = targetPokemon
        return newState
      }

      case "ITEM_CHANGE": {
        if (delta.target.type === "field") return newState;
        const team = delta.target.side === "my" ? newState.myTeam : newState.enemyTeam
        const teamIndex = this.resolveTargetToTeamIndex(newState, delta.target)
        if (teamIndex === null) return newState
        const targetPokemon = { ...team[teamIndex] }
        if (!targetPokemon) return newState

        targetPokemon.heldItem = delta.heldItem
        targetPokemon.heldItemName = delta.heldItemName
        team[teamIndex] = targetPokemon
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
  static computeTurnSequence(initialState: BattleState, actions: any[], hpMode: "percent" | "hp" = "percent"): BattleState[] {
    const states: BattleState[] = []
    
    // State 0: Initial
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState
    
    // Normalize state
    if (!currentState.battlefieldState) {
        currentState.battlefieldState = { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } };
    }
    
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
            nextState = this.applyDelta(nextState, delta, hpMode)
        }
        for (const effect of (action.effects || [])) {
            for (const delta of effect.deltas) {
                nextState = this.applyDelta(nextState, delta, hpMode)
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

  static applyOtherOperations(tags: CustomTagData[], operations: OtherOperation[]): CustomTagData[] {
    let result = [...tags];
    for (const op of operations) {
      switch (op.type) {
        case "CREATE":
          // Avoid duplicate IDs if already present
          if (!result.find(t => t.id === op.id)) {
            result.push({ id: op.id, name: op.name, count: 0, showCount: false });
          }
          break;
        case "DELETE":
          result = result.filter(t => t.id !== op.id);
          break;
        case "RENAME":
          result = result.map(t => t.id === op.id ? { ...t, name: op.newName } : t);
          break;
        case "COUNTER_TOGGLE":
          result = result.map(t => t.id === op.id ? { ...t, showCount: op.show, count: op.show ? t.count : 0 } : t);
          break;
        case "COUNTER_RELATIVE":
          result = result.map(t => t.id === op.id ? { ...t, count: (t.count ?? 0) + op.amount } : t);
          break;
      }
    }
    return result;
  }
}
