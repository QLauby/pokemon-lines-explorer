/**
 * turn-logic-helpers.ts
 * Pure utility functions for the Turn Editor system.
 * These functions are stateless and have no React dependencies.
 */

import { BattleState, PokemonHpInfo } from "@/types/types";

export type EffectOption = {
  label: string
  value: { side: "my" | "opponent"; slotIndex: number }
  isAlly: boolean
}

export type ActivePokemonEntry = {
  pokemon: NonNullable<BattleState["myTeam"][number]>
  isAlly: boolean
  slotIndex: number
}

/**
 * Builds the list of currently active Pokémon from a given BattleState snapshot.
 * Respects the battlefield slot limit (1 for simple, 2 for double).
 */
export function getActivePokemonFromState(
  state: BattleState,
  battleFormat: "simple" | "double" = "simple"
): ActivePokemonEntry[] {
  const activeSlots = state.activeSlots || { myTeam: [0], opponentTeam: [0] }
  const limit = battleFormat === "double" ? 2 : 1

  const myActiveIndices = (activeSlots.myTeam || []).slice(0, limit)
  const enemyActiveIndices = (activeSlots.opponentTeam || []).slice(0, limit)

  return [
    ...myActiveIndices
      .filter((idx): idx is number => idx !== null && idx !== undefined)
      .map(idx => {
        const pokemon = state.myTeam[idx]
        if (!pokemon) return null
        return { pokemon, isAlly: true, slotIndex: idx }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),

    ...enemyActiveIndices
      .filter((idx): idx is number => idx !== null && idx !== undefined)
      .map(idx => {
        const pokemon = state.enemyTeam[idx]
        if (!pokemon) return null
        return { pokemon, isAlly: false, slotIndex: idx }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
  ]
}

/**
 * Generates the list of selectable effect targets from a BattleState snapshot.
 * Only includes Pokémon that are active on the battlefield and have HP > 0.
 */
export function generateEffectOptions(state: BattleState): EffectOption[] {
  const opts: EffectOption[] = []

  state.activeSlots?.myTeam?.forEach((teamIndex, battlefieldSlot) => {
    if (teamIndex !== null && teamIndex !== undefined && state.myTeam[teamIndex]) {
      const pokemon = state.myTeam[teamIndex]
      if (pokemon.hpPercent > 0) {
        opts.push({
          label: pokemon.name,
          value: { side: "my", slotIndex: battlefieldSlot },
          isAlly: true,
        })
      }
    }
  })

  state.activeSlots?.opponentTeam?.forEach((teamIndex, battlefieldSlot) => {
    if (teamIndex !== null && teamIndex !== undefined && state.enemyTeam[teamIndex]) {
      const pokemon = state.enemyTeam[teamIndex]
      if (pokemon.hpPercent > 0) {
        opts.push({
          label: pokemon.name,
          value: { side: "opponent", slotIndex: battlefieldSlot },
          isAlly: false,
        })
      }
    }
  })

  return opts
}

/**
 * Patches a BattleState to ensure activeSlots has the correct number of slots
 * for the given battle format. Adds or trims slots as needed.
 */
export function patchSimulationState(
  state: BattleState,
  battleFormat: "simple" | "double"
): BattleState {
  const neededSlots = battleFormat === "double" ? 2 : 1
  const currentMy = state.activeSlots?.myTeam || []
  const currentOpp = state.activeSlots?.opponentTeam || []

  const patchMy = currentMy.length !== neededSlots
  const patchOpp = currentOpp.length !== neededSlots

  if (!patchMy && !patchOpp) return state

  return {
    ...state,
    activeSlots: {
      myTeam: patchMy
        ? currentMy
            .slice(0, neededSlots)
            .concat(
              Array.from(
                { length: Math.max(0, neededSlots - currentMy.length) },
                (_, i) => currentMy.length + i
              )
            )
        : currentMy,
      opponentTeam: patchOpp
        ? currentOpp
            .slice(0, neededSlots)
            .concat(
              Array.from(
                { length: Math.max(0, neededSlots - currentOpp.length) },
                (_, i) => currentOpp.length + i
              )
            )
        : currentOpp,
    },
  }
}

/**
 * Builds the default BattleState from active Pokémon and team lists,
 * used when no initialBattleState is provided (Set Next Turn mode).
 */
export function buildFallbackSimulationState(
  activePokemon: { pokemon: { id: string } | undefined; isAlly: boolean }[],
  myTeam: { id: string }[],
  enemyTeam: { id: string }[],
  battleFormat: "simple" | "double"
): BattleState {
  const slotsCount = battleFormat === "double" ? 2 : 1

  const myActiveIndices = activePokemon
    .filter(p => p.isAlly)
    .map(ap => myTeam.findIndex(p => p.id === ap.pokemon?.id))
    .filter(idx => idx !== -1)

  const enemyActiveIndices = activePokemon
    .filter(p => !p.isAlly)
    .map(ap => enemyTeam.findIndex(p => p.id === ap.pokemon?.id))
    .filter(idx => idx !== -1)

  return {
    myTeam: JSON.parse(JSON.stringify(myTeam)),
    enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
    activeSlots: {
      myTeam:
        myActiveIndices.length > 0
          ? myActiveIndices
          : Array.from({ length: slotsCount }, (_, i) => i),
      opponentTeam:
        enemyActiveIndices.length > 0
          ? enemyActiveIndices
          : Array.from({ length: slotsCount }, (_, i) => i),
    },
    battlefieldState: {
      customTags: [],
      playerSide: { customTags: [] },
      opponentSide: { customTags: [] },
    },
  } as unknown as BattleState
}



/**
 * Resolves the HP info of a Pokémon from the BattleState based on side and slot index.
 * Returns {hpPercent, hpMax, hpCurrent} — or undefined if the slot is empty.
 */
export function getPokemonHpFromState(
    state: BattleState,
    side: "my" | "opponent",
    slotIndex: number
): PokemonHpInfo | undefined {
    const isMySide = side === "my"
    const slots = isMySide ? state.activeSlots?.myTeam : state.activeSlots?.opponentTeam
    const team = isMySide ? state.myTeam : state.enemyTeam
    
    if (!slots || !team) return undefined

    const teamIndex = slots[slotIndex]
    if (teamIndex === null || teamIndex === undefined) return undefined
    
    const pokemon = team[teamIndex]
    if (!pokemon) return undefined

    const hpMax = pokemon.hpMax ?? 100
    const hpPercent = pokemon.hpPercent
    const hpCurrent = pokemon.hpCurrent ?? Math.round(hpPercent * hpMax / 100)

    return { hpPercent, hpMax, hpCurrent }
}
