import { CombatSession } from "@/types/types";
import { ModificationType } from "./tree-cleaner";
import { traverseTreeWithState } from "./tree-traversal";

type SlotReference = { side: "my" | "opponent"; slotIndex: number }

/**
 * Helpers to check if any node has actual strategic content (actions, effects).
 */
export function isTreeSignificant(nodes: any[]): boolean {
    if (!nodes || nodes.length === 0) return false;
    
    // A tree is only significant if at least one node has actual USER-ENTERED content
    return nodes.some(node => {
        // Actions are significant if they have a move selected, a target OR manual deltas
        const hasActions = (node.turnData?.actions || []).some((a: any) => 
            a.metadata?.attackName || 
            a.metadata?.itemName ||
            a.target || // Even if no move, selecting a target is an intent
            (a.actionDeltas || []).length > 0 || 
            (a.effects || []).some((e: any) => (e.deltas || []).length > 0)
        );
        
        const hasEffects = (node.turnData?.endOfTurnEffects || []).some((e: any) => (e.deltas || []).length > 0);
        const hasPostActions = (node.turnData?.postTurnActions || []).some((a: any) => 
            a.metadata?.attackName || 
            a.metadata?.itemName ||
            a.target ||
            (a.actionDeltas || []).length > 0 || 
            (a.effects || []).some((e: any) => (e.deltas || []).length > 0)
        );
        
        return hasActions || hasEffects || hasPostActions;
    });
}

/**
 * Detects which nodes become invalid (corrupted) based on a specific modification.
 */
export function detectCorruption(
  originalSession: CombatSession,
  modification: { type: ModificationType; payload: any }
): string[] {
    // If the entire tree has no data (even if 10 nodes exist), it's safe to modify roster/slots (silently)
    if (!isTreeSignificant(originalSession.nodes)) {
        return [];
    }

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
                    // Turn 0: Any action with a move or target is corrupted if deployment changes
                    const hasStrategicIntent = (node.turnData.actions || []).some(a => 
                        a.metadata?.attackName || 
                        a.metadata?.itemName ||
                        a.target || 
                        (a.actionDeltas || []).length > 0 || 
                        (a.effects || []).some(e => (e.deltas || []).length > 0)
                    )
                    const hasEndOfTurnDeltas = (node.turnData.endOfTurnEffects || []).some(e => (e.deltas || []).length > 0)
                    const hasPostTurnActions = (node.turnData.postTurnActions || []).length > 0

                    if (hasStrategicIntent || hasEndOfTurnDeltas || hasPostTurnActions) {
                        markCorrupted(node.id)
                        return false // Stop branch
                    }
                } else {
                    // Turn 1+ is corrupted if it has ANY content (checked by global guard anyway)
                    markCorrupted(node.id)
                    return false 
                }
            }
        })
        return corruptedIds
    }

    if (modification.type === "DELETE_POKEMON") {
        const { id: deletedPokemonId } = modification.payload as { id: string, isMyTeam: boolean }
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

    if (modification.type === "REORDER_POKEMON") {
        const { oldIndex, newIndex, isMyTeam } = modification.payload as { isMyTeam: boolean, oldIndex: number, newIndex: number }
        const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
        const activeSlots = (originalSession.initialState.activeSlots as any)[teamKey]
        
        // Changing active starters in non-empty tree invalidates combat start
        const impactsStarter = (activeSlots || []).includes(oldIndex) || (activeSlots || []).includes(newIndex)
        if (impactsStarter) {
            return ["root"]
        }
        
        return [] 
    }

    return []
}
