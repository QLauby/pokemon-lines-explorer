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
  // Si le type de combat change
  if (newParams.battleType && newParams.battleType !== originalSession.battleType) {
    return originalSession.nodes
      .filter((node) => node.turn > 0)
      .map((node) => node.id)
  }
  return []
}
