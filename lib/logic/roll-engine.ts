/**
 * roll-engine.ts
 *
 * Processes discrete damage rolls for the HP convolution engine.
 */

import { RollProfile } from "@/types/types";

// ─── Public result types ─────────────────────────────────────────────────────

export type RollEngineResult =
  | { ok: true; profile: RollProfile }
  | { ok: true; profile: null }        // fixed damage (no variance)
  | { ok: false; error: RollEngineError }

export type RollEngineError =
  | "INVALID_ORDER"      // min > max
  | "INVALID_PAIR"       // no rolls detected
  | "ZERO_DAMAGE"        // all rolls are 0

/**
 * Extracts a list of integers from a string. 
 * Handles common competitive formats like:
 * - (12, 12, 13...)
 * - 12 - 12 - 13
 */
export function parseRolls(input: string): number[] {
  const matches = input.match(/\d+/g)
  if (!matches) return []
  return matches.map(Number)
}

/**
 * Build a RollProfile from a raw list of rolls.
 */
export function buildRollProfileFromRolls(rolls: number[]): RollEngineResult {
  if (rolls.length === 0) {
    return { ok: true, profile: null }
  }

  const sortedRolls = [...rolls].sort((a, b) => a - b)
  const mean = sortedRolls.reduce((s, r) => s + r, 0) / sortedRolls.length
  
  // Variance is kept for legacy compatibility but is not used in DistributionEngine
  const variance = sortedRolls.reduce((s, r) => s + (r - mean) ** 2, 0) / sortedRolls.length

  return {
    ok: true,
    profile: {
      rolls: sortedRolls,
    },
  }
}

// ─── Error messages for UI display ───────────────────────────────────────────

export function getRollEngineErrorMessage(error: RollEngineError): string {
  switch (error) {
    case "INVALID_ORDER":
      return "The min damage must be less than or equal to the max damage."
    case "INVALID_PAIR":
      return "Invalid format. Please paste the damage rolls (ex: 12, 12, 13...)."
    case "ZERO_DAMAGE":
      return "Damage cannot be zero."
  }
}
