import { CombatSession } from "@/types/types"

/**
 * Detects which nodes become invalid (corrupted) based on changes to the session parameters.
 * 
 * @param originalSession The current valid session state.
 * @param newParams The proposed changes to the session.
 * @returns An array of node IDs that are considered corrupted.
 */
export function detectCorruption(
  originalSession: CombatSession,
  newParams: Partial<CombatSession>
): string[] {
  // If the battle type changes
  if (newParams.battleType && newParams.battleType !== originalSession.battleType) {
    return originalSession.nodes
        .filter((node) => {
            if (node.turn > 0) return true
            
            // Check if Turn 0 is "dirty" (has user modifications)
            const hasDeltas = node.turnData.actions.some(a => a.deltas.length > 0)
            const hasEndOfTurnDeltas = node.turnData.endOfTurnDeltas.length > 0
            
            return hasDeltas || hasEndOfTurnDeltas
        })
        .map((node) => node.id)
  }
  return []
}
