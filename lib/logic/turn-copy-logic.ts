import { BattleDelta, BattleState, TreeNode, TurnAction, TurnData } from "@/types/types"
import { BattleEngine } from "./battle-engine"

/**
 * Returns a canonical key identifying which Pokemon are on the field.
 * Used to check compatibility between different turns.
 */
export function getBattlefieldKey(state: BattleState): string {
  const myActive = state.activeSlots.myTeam.map(idx => idx !== null ? state.myTeam[idx]?.id || "empty" : "empty").join("|")
  const enemyActive = state.activeSlots.opponentTeam.map(idx => idx !== null ? state.enemyTeam[idx]?.id || "empty" : "empty").join("|")
  return `my:${myActive}#enemy:${enemyActive}`
}

/**
 * Finds all nodes whose starting state (parent's end state) matches the target state.
 */
export function findCompatibleNodes(
  targetInitialState: BattleState,
  allNodes: TreeNode[],
  initialBattleState: BattleState,
  nodesMap: Map<string, TreeNode>,
  excludeNodeId?: string
): TreeNode[] {
  const targetKey = getBattlefieldKey(targetInitialState)
  
  return allNodes.filter(node => {
    // Root has no parent state to compare as a "starting point" for a turn copy
    if (node.turn === 0) return false
    // Exclude the node being updated
    if (excludeNodeId && node.id === excludeNodeId) return false
    
    // Compute state AT THE START of this node (result of parent)
    const startState = BattleEngine.computeState(initialBattleState, nodesMap, node.parentId || "root")
    return getBattlefieldKey(startState) === targetKey
  })
}

/**
 * Sorts compatible nodes by priority:
 * 1. Current branch (descending by turn)
 * 2. Other branches (by proximity of branchIndex, descending by turn)
 */
export function sortCompatibleNodes(
    nodes: TreeNode[],
    currentBranchIndex: number
): TreeNode[] {
    return [...nodes].sort((a, b) => {
        // Rule 1: Same branch has priority
        if (a.branchIndex === currentBranchIndex && b.branchIndex !== currentBranchIndex) return -1
        if (a.branchIndex !== currentBranchIndex && b.branchIndex === currentBranchIndex) return 1
        
        // Rule 2: If both are same/different branch, sort by branch proximity
        if (a.branchIndex !== b.branchIndex) {
            const distA = Math.abs(a.branchIndex - currentBranchIndex)
            const distB = Math.abs(b.branchIndex - currentBranchIndex)
            if (distA !== distB) return distA - distB
            return a.branchIndex - b.branchIndex
        }

        // Rule 3: Within same branch, newest first (highest turn)
        return b.turn - a.turn
    })
}

/**
 * Performs a "Smart Copy" of TurnData:
 * - Validates that actors are still alive in the target context.
 * - Removes actions of fainted Pokemon.
 * - Invalidate switches to fainted Pokemon.
 * - Prevents double status or invalid tag creation.
 */
export function smartCopyTurnData(
    sourceTurnData: TurnData,
    initialState: BattleState
): TurnData {
    // Deep copy initial state: two versions
    // - `initialStateSnapshot` for checking actor alive at turn start (never mutated)
    // - `currentState` for progressive simulation (for effect validation)
    const initialStateSnapshot = JSON.parse(JSON.stringify(initialState)) as BattleState
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState
    
    const cleanActions: TurnAction[] = []
    
    // 1. Filter Actions
    for (const action of sourceTurnData.actions) {
        // Resolve actor index — always check against the INITIAL snapshot
        // so that mid-turn KOs don't silently remove the KO'd Pokemon's own action.
        // useKoFusion is responsible for handling that fusion/restoration logic.
        const actorIndex = BattleEngine.resolveTargetToTeamIndex(initialStateSnapshot, action.actor)
        const team = action.actor.side === "my" ? initialStateSnapshot.myTeam : initialStateSnapshot.enemyTeam
        const actor = actorIndex !== null ? team[actorIndex] : null
        
        // RULE: Actor must be alive at the START of the turn to take action
        if (!actor || actor.hpPercent <= 0) continue

        
        const cleanAction = JSON.parse(JSON.stringify(action)) as TurnAction
        
        // Validate Action Deltas (Switches mainly)
        if (cleanAction.actionDeltas) {
            cleanAction.actionDeltas = cleanAction.actionDeltas.map(delta => {
                if (delta.type === "SWITCH") {
                    const sideTeam = delta.side === "my" ? currentState.myTeam : currentState.enemyTeam
                    const toPoke = delta.toSlot !== -1 ? sideTeam[delta.toSlot] : null
                    // RULE: Cannot switch to a fainted Pokemon
                    if (toPoke && toPoke.hpPercent <= 0) {
                        return { ...delta, toSlot: -1 } 
                    }
                }
                return delta
            })
        }
        
        // Validate Effects
        for (const effect of cleanAction.effects) {
            effect.deltas = effect.deltas.filter(delta => {
                // RULE: Status ADD check
                if (delta.type === "STATUS_DELTAS") {
                    const targetIdx = BattleEngine.resolveTargetToTeamIndex(currentState, delta.target)
                    const targetTeam = delta.target.side === "my" ? currentState.myTeam : currentState.enemyTeam
                    const target = targetIdx !== null ? targetTeam[targetIdx] : null
                    
                    if (!target) return true
                    
                    delta.operations = delta.operations.filter(op => {
                        if (op.type === "ADD") {
                            if (op.status === "confusion" || op.status === "love") {
                                return !target[op.status]
                            } else {
                                // Rule: Most status (burn, par, etc) are mutually exclusive
                                return !target.status
                            }
                        }
                        return true
                    })
                    return delta.operations.length > 0
                }
                
                // RULE: Ability/Item redundant check
                if (delta.type === "ABILITY_CHANGE" || delta.type === "ITEM_CHANGE") {
                    const tIdx = BattleEngine.resolveTargetToTeamIndex(currentState, delta.target)
                    const tTeam = delta.target.side === "my" ? currentState.myTeam : currentState.enemyTeam
                    const t = tIdx !== null ? tTeam[tIdx] : null
                    if (!t) return true
                    
                    if (delta.type === "ABILITY_CHANGE" && t.abilityName === delta.abilityName) return false
                    if (delta.type === "ITEM_CHANGE" && t.heldItemName === delta.heldItemName) return false
                }

                return true
            })
        }
        
        // Apply cleaned action to the simulation state for the next action
        for (const delta of cleanAction.actionDeltas || []) {
            currentState = BattleEngine.applyDelta(currentState, delta)
        }
        for (const effect of cleanAction.effects || []) {
            for (const delta of effect.deltas) {
                currentState = BattleEngine.applyDelta(currentState, delta)
            }
        }
        
        cleanActions.push(cleanAction)
    }

    // 2. Filter End of Turn Effects
    const cleanEot = sourceTurnData.endOfTurnEffects.map(effect => {
        const cleanEffect = JSON.parse(JSON.stringify(effect))
        // Basic filtering for EOT if needed (e.g. redundant tags)
        cleanEffect.deltas = cleanEffect.deltas.filter((delta: BattleDelta) => {
             if (delta.type === "OTHERS_EFFECT_DELTAS") {
                 // Idempotency: Engine handles it, but we can avoid clutter
                 return delta.operations.length > 0
             }
             return true
        })
        return cleanEffect
    })

    // 3. Filter Post Turn Actions (Switch after KO)
    const cleanPostActions: TurnAction[] = []
    if (sourceTurnData.postTurnActions) {
        for (const action of sourceTurnData.postTurnActions) {
            // Switch after KO logic: Verify slot is actually empty (KOed)
            const actorSide = action.actor.side
            const slotIdx = action.actor.slotIndex
            if (actorSide !== undefined && slotIdx !== undefined) {
                const slots = actorSide === "my" ? currentState.activeSlots.myTeam : currentState.activeSlots.opponentTeam
                const currentPokeIndex = slots[slotIdx]
                if (currentPokeIndex !== null) {
                    const team = actorSide === "my" ? currentState.myTeam : currentState.enemyTeam
                    if (team[currentPokeIndex] && team[currentPokeIndex].hpPercent > 0) {
                        // Slot is NOT empty or Poke is alive, skip this post-KO switch
                        continue
                    }
                }
            }

            const cleanAction = JSON.parse(JSON.stringify(action)) as TurnAction
            // Validate targeting fainted pokes for switch
            cleanAction.actionDeltas = (cleanAction.actionDeltas || []).map(delta => {
                if (delta.type === "SWITCH") {
                    const sideTeam = delta.side === "my" ? currentState.myTeam : currentState.enemyTeam
                    const toPoke = delta.toSlot !== -1 ? sideTeam[delta.toSlot] : null
                    if (toPoke && toPoke.hpPercent <= 0) return { ...delta, toSlot: -1 }
                }
                return delta
            })
            
            cleanPostActions.push(cleanAction)
            
            // Apply to simulation
            for (const delta of cleanAction.actionDeltas || []) {
                 currentState = BattleEngine.applyDelta(currentState, delta)
            }
        }
    }

    return {
        actions: cleanActions,
        endOfTurnEffects: cleanEot,
        postTurnActions: cleanPostActions
    }
}
