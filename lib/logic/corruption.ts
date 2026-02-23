import { CombatSession } from "@/types/types";
import { ModificationType } from "./tree-cleaner";
import { traverseTreeWithState } from "./tree-traversal";

type SlotReference = { side: "my" | "opponent"; slotIndex: number }

/**
 * Detects which nodes become invalid (corrupted) based on a specific modification.
 */
export function detectCorruption(
  originalSession: CombatSession,
  modification: { type: ModificationType; payload: any }
): string[] {
    const corruptedIds: string[] = []
    
    // Helper to add uniquely
    const markCorrupted = (nodeId: string) => {
        if (!corruptedIds.includes(nodeId)) {
            corruptedIds.push(nodeId)
        }
    }

    if (modification.type === "CHANGE_HP_MODE") {
        return [] // Never invalidates
    }

    if (modification.type === "CHANGE_DEPLOYMENT") {
        traverseTreeWithState(originalSession.nodes, originalSession.initialState, {
            onNodeStart: (node) => {
                if (node.turn === 0) {
                    const hasActionDeltas = node.turnData.actions.some(a => a.effects.some(e => e.deltas.length > 0))
                    const hasEndOfTurnDeltas = node.turnData.endOfTurnEffects.length > 0
                    if (hasActionDeltas || hasEndOfTurnDeltas) {
                        markCorrupted(node.id)
                        return false // Stop branch
                    }
                } else {
                    markCorrupted(node.id)
                    return false // Turn 1+ is always corrupted
                }
            }
        })
        return corruptedIds
    }

    if (modification.type === "DELETE_POKEMON") {
        const payload = modification.payload as { originalIndex: number, isMyTeam: boolean }

        // Determine which Pokemon ID is being deleted by looking at initialState
        const targetTeam = payload.isMyTeam ? originalSession.initialState.myTeam : originalSession.initialState.enemyTeam
        const deletedPokemonId = targetTeam[payload.originalIndex]?.id

        if (!deletedPokemonId) return []

        // Traverse the tree to precisely find any step where the deleted Pokemon is involved
        traverseTreeWithState(originalSession.nodes, originalSession.initialState, {
            onBeforeAction: (action, state, node) => {
                const checksCorruption = (ref?: SlotReference) => {
                    if (!ref) return false
                    const activeSlots = ref.side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam
                    const team = ref.side === "my" ? state.myTeam : state.enemyTeam
                    const activeIdx = activeSlots[ref.slotIndex]
                    if (activeIdx === null || activeIdx === undefined) return false
                    return team[activeIdx]?.id === deletedPokemonId
                }

                if (checksCorruption(action.actor) || checksCorruption(action.target)) {
                    markCorrupted(node.id)
                    return false
                }
            },
            onBeforeDelta: (delta, state, node) => {
                const checksCorruption = (ref?: SlotReference) => {
                    if (!ref) return false
                    const activeSlots = ref.side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam
                    const team = ref.side === "my" ? state.myTeam : state.enemyTeam
                    const activeIdx = activeSlots[ref.slotIndex]
                    if (activeIdx === null || activeIdx === undefined) return false
                    return team[activeIdx]?.id === deletedPokemonId
                }

                if (delta.type === "HP_RELATIVE" || delta.type === "PP_CHANGE") {
                    if (checksCorruption(delta.target as SlotReference)) {
                        markCorrupted(node.id)
                        return false
                    }
                }

                if (delta.type === "SWITCH") {
                    const team = delta.side === "my" ? state.myTeam : state.enemyTeam
                    const pFrom = team[delta.fromSlot]
                    const pTo = team[delta.toSlot]
                    if (pFrom?.id === deletedPokemonId || pTo?.id === deletedPokemonId) {
                        markCorrupted(node.id)
                        return false
                    }
                }
            }
        })
        
        return corruptedIds
    }

    return []
}
