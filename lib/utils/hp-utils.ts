/**
 * hp-utils.ts
 * Pure utility functions for the HP mode system.
 * No React dependencies. All functions are stateless.
 *
 * KEY INVARIANT:
 *   hpPercent === Math.max(0, Math.min(100, hpCurrent / hpMax * 100))
 *   This invariant must be maintained at all mutation sites.
 */

import { BattleState, Pokemon, SlotReference } from "@/types/types"

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

/**
 * Returns the effective hpMax for a Pokémon. Never returns 0.
 */
export function getEffectiveHpMax(pokemon: Pick<Pokemon, "hpMax">): number {
    return pokemon.hpMax && pokemon.hpMax > 0 ? pokemon.hpMax : 100
}

/**
 * Returns the effective hpCurrent for a Pokémon.
 * Falls back to hpMax (i.e. full HP) if not set.
 */
export function getEffectiveHpCurrent(pokemon: Pick<Pokemon, "hpCurrent" | "hpMax">): number {
    const max = getEffectiveHpMax(pokemon)
    if (pokemon.hpCurrent !== undefined) return pokemon.hpCurrent
    return max
}

// ---------------------------------------------------------------------------
// Core recalculation — always keeps the invariant
// ---------------------------------------------------------------------------

/**
 * Recalculates hpPercent from hpCurrent / hpMax.
 * Result is clamped to [0, 100].
 */
export function recalcHpPercent(hpCurrent: number, hpMax: number): number {
    if (hpMax <= 0) return 0
    return Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
}

/**
 * Recalculates hpCurrent from hpPercent (%) and hpMax.
 * Rounds to nearest integer.
 */
export function recalcHpCurrent(hpPercent: number, hpMax: number): number {
    if (hpMax <= 0) return 0
    return Math.round((hpPercent * hpMax) / 100)
}

// ---------------------------------------------------------------------------
// Delta conversion (used by BattleEngine + sanitizeTreeForModification)
// ---------------------------------------------------------------------------

/**
 * Converts an HP delta (absolute HP units) to a percentage delta.
 * The sign is preserved (positive = healing, negative = damage).
 * NO rounding — the engine clamps via hpPercent arithmetic.
 */
export function convertHpDeltaToPercent(hpAmount: number, hpMax: number): number {
    if (hpMax <= 0) return 0
    return (hpAmount / hpMax) * 100
}

/**
 * Converts a percentage delta to an HP delta.
 * Uses Math.floor for damage (Pokémon game rule: damage rounded DOWN).
 * Sign is preserved: negative amounts (damage) floor further negative → more damage never added.
 *
 * Example: 20% of 213 HP = 42.6 → 42 HP damage (not 43).
 */
export function convertPercentDeltaToHp(percentAmount: number, hpMax: number): number {
    if (hpMax <= 0) return 0
    const raw = (percentAmount * hpMax) / 100
    // Floor towards zero for the magnitude, preserving the sign.
    // damage (-20%) → raw = -42.6 → floor(-42.6) = -43 ← TOO MUCH. We want -42.
    // So we use Math.trunc (rounds toward zero) = -42 ✓
    // healing (+20%) → raw = 42.6 → Math.trunc = 42 ✓
    return Math.trunc(raw)
}

// ---------------------------------------------------------------------------
// Local toggle conversion (used by HpChangeEffect toggle button)
// ---------------------------------------------------------------------------

/**
 * Smart conversion when the user locally toggles the unit of an effect.
 * Always rounds DOWN (toward zero) to match Pokémon game conventions.
 * The returned value is the converted magnitude (always positive; sign is managed by caller).
 *
 * % → HP: floor(amount * hpMax / 100)
 * HP → %: amount / hpMax * 100 (keep decimals — % accepts floats)
 */
export function convertAmountLocalToggle(
    amount: number,
    fromUnit: "percent" | "hp",
    hpMax: number
): number {
    if (hpMax <= 0) return 0
    if (fromUnit === "percent") {
        // % → HP: Pokémon floor rule
        return Math.floor(Math.abs(amount) * hpMax / 100) * Math.sign(amount || 1)
    } else {
        // HP → %: keep decimals, no floor
        return (amount / hpMax) * 100
    }
}

// ---------------------------------------------------------------------------
// Pokemon mutation helpers (called by team-manager, health-bar, etc.)
// ---------------------------------------------------------------------------

/**
 * Creates an updated Pokémon after modifying hpPercent directly (percent mode).
 * Recalculates hpCurrent to maintain the invariant.
 */
export function updatePokemonHpPercent(pokemon: Pokemon, newHpPercent: number, rawHpExpression?: string): Pokemon {
    const hpMax = getEffectiveHpMax(pokemon)
    const clamped = Math.max(0, Math.min(100, newHpPercent))
    const hpCurrent = recalcHpCurrent(clamped, hpMax)
    return { ...pokemon, hpPercent: clamped, hpCurrent, rawHpExpression }
}

/**
 * Creates an updated Pokémon after modifying hpMax (PP-like logic: hpCurrent = hpMax).
 * Maintains the hpPercent invariant.
 * Refuses hpMax <= 0 (returns the original pokemon unchanged).
 */
export function updatePokemonHpMax(pokemon: Pokemon, newHpMax: number): Pokemon {
    if (newHpMax <= 0) return pokemon  // Guard: never allow 0
    const hpCurrent = newHpMax  // PP logic: updating max resets current to max
    const hpPercent = recalcHpPercent(hpCurrent, newHpMax)
    return { ...pokemon, hpMax: newHpMax, hpCurrent, hpPercent, rawHpExpression: undefined }
}

/**
 * Creates an updated Pokémon after modifying hpCurrent only.
 * hpMax is left unchanged (PP-like logic: updating current doesn't affect max).
 * Maintains the hpPercent invariant.
 */
export function updatePokemonHpCurrent(pokemon: Pokemon, newHpCurrent: number): Pokemon {
    const hpMax = getEffectiveHpMax(pokemon)
    const clamped = Math.max(0, Math.min(hpMax, newHpCurrent))
    const hpPercent = recalcHpPercent(clamped, hpMax)
    return { ...pokemon, hpCurrent: clamped, hpPercent, rawHpExpression: undefined }
}

// ---------------------------------------------------------------------------
// State resolver (used by HpChangeEffect and tree sanitizer)
// ---------------------------------------------------------------------------

/**
 * Resolves the hpMax of the Pokémon occupying a given battlefield slot from
 * a BattleState snapshot. Used by the tree sanitizer during HP→% conversion.
 * Returns 100 as fallback (safe default).
 */
export function resolveHpMaxFromState(
    state: BattleState,
    target: SlotReference
): number {
    const slots = target.side === "my"
        ? state.activeSlots?.myTeam
        : state.activeSlots?.opponentTeam
    const team = target.side === "my" ? state.myTeam : state.enemyTeam

    if (!slots || !team) return 100

    const teamIndex = slots[target.slotIndex]
    if (teamIndex === null || teamIndex === undefined) return 100

    const pokemon = team[teamIndex]
    if (!pokemon) return 100

    return getEffectiveHpMax(pokemon)
}
// ---------------------------------------------------------------------------
// Visualization helpers (used by tooltips/editors)
// ---------------------------------------------------------------------------

/**
 * Formats a KO risk (0 to 1) into a user-friendly string (percentage).
 * Handles extreme cases with < 0.1% and > 99.9% for clarity.
 */
export function formatKoRisk(koRisk: number): string {
    const rawPct = koRisk * 100;
    
    if (koRisk === 0) return "0";
    if (koRisk === 1) return "100";
    
    // Exact checks to avoid floating point issues
    if (rawPct < 0.1) return "< 0.1";
    if (rawPct > 99.9) return "> 99.9";
    
    return rawPct.toFixed(1);
}
