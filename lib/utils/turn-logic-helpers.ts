/**
 * turn-logic-helpers.ts
 * Pure utility functions for the Turn Editor system.
 * These functions are stateless and have no React dependencies.
 */

import { BattleState, EffectType, PokemonHpInfo, SlotReference, TurnAction } from "@/types/types";

export type EffectOption = {
  label: string
  value: SlotReference
  isAlly: boolean
}

export type ActivePokemonEntry = {
  pokemon: NonNullable<BattleState["myTeam"][number]>
  isAlly: boolean
  slotIndex: number
  teamIndex: number
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
      .map((idx, battlefieldSlot) => {
        if (idx === null || idx === undefined) return null;
        const pokemon = state.myTeam[idx]
        if (!pokemon) return null
        return { pokemon, isAlly: true, slotIndex: battlefieldSlot, teamIndex: idx }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),

    ...enemyActiveIndices
      .map((idx, battlefieldSlot) => {
        if (idx === null || idx === undefined) return null;
        const pokemon = state.enemyTeam[idx]
        if (!pokemon) return null
        return { pokemon, isAlly: false, slotIndex: battlefieldSlot, teamIndex: idx }
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
          value: { type: "battlefield_slot", side: "my", slotIndex: battlefieldSlot },
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
          value: { type: "battlefield_slot", side: "opponent", slotIndex: battlefieldSlot },
          isAlly: false,
        })
      }
    }
  })

  return opts
}

/**
 * Resolves the team index of the pokemon switching out (the actor)
 * for a switch action, using various safety fallbacks.
 */
function resolveOutTeamIndex(
    action: TurnAction,
    state: BattleState,
    actorObj?: { pokemon: { name: string }, teamIndex?: number }
): number {
    const actorSide = action.actor.side;
    const team = actorSide === "my" ? state.myTeam : state.enemyTeam;
    const actorSlot = "slotIndex" in action.actor ? action.actor.slotIndex : 0;
    
    if (actorObj?.teamIndex !== undefined) return actorObj.teamIndex;
    if (actorObj?.pokemon.name) return team.findIndex(p => p.name === actorObj.pokemon.name);
    
    const activeSlots = actorSide === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam;
    return activeSlots[actorSlot as number] ?? -1;
}

/**
 * Generates dynamic target choices based on context (Turn Action vs End-of-Turn)
 * and the chosen EffectType.
 */
export function getDynamicEffectTargets(
  action: TurnAction | undefined, // undefined if it's an EndOfTurn effect
  effectType: EffectType,
  state: BattleState,
  actorObj?: { pokemon: { name: string, hpPercent?: number }, isAlly: boolean, teamIndex?: number }
): EffectOption[] {
  // Base list of targets: Every active pokemon on the field.
  const baseOptions = generateEffectOptions(state);

  if (!action) {
    // End-of-turn effects: for now, just the battlefield options
    return baseOptions;
  }

  // TARGETING: stats-modifier
  if (effectType === "stats-modifier") {
    if (action.type === "switch" || action.type === "switch-after-ko") {
      const options: EffectOption[] = [];
      const actorSide = action.actor.side;
      const team = actorSide === "my" ? state.myTeam : state.enemyTeam;
      
      // 1. The Switch-Out Pokemon (The Actor) - HIGH PRIORITY
      const outTeamIndex = resolveOutTeamIndex(action, state, actorObj);
      
      if (outTeamIndex !== -1 && team[outTeamIndex]) {
          const mon = team[outTeamIndex];
          if (mon.hpPercent > 0) {
              options.push({
                  label: `[Out] ${mon.name}`,
                  value: { type: "team_index", side: actorSide, teamIndex: outTeamIndex, slotIndex: -1 },
                  isAlly: actorSide === "my"
              });
          }
      }

      // 2. The Switch-In Pokemon
      const switchInTarget = action.target;
      if (switchInTarget && switchInTarget.type === "battlefield_slot") {
          const side = switchInTarget.side;
          const slot = switchInTarget.slotIndex;
          const activeSlots = side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam;
          const currentInIndex = activeSlots[slot];
          
          if (currentInIndex !== null && currentInIndex !== undefined) {
              const inMon = (side === "my" ? state.myTeam : state.enemyTeam)[currentInIndex];
              if (inMon && inMon.hpPercent > 0) {
                  options.push({
                      label: `[In] ${inMon.name}`,
                      value: { type: "battlefield_slot", side: side, slotIndex: slot },
                      isAlly: side === "my"
                  });
              }
          }
      }

      // 3. Other active pokemon
      const otherActive = baseOptions.filter(opt => {
          // Exclude the [In] pokemon since we already added it
          if (switchInTarget && opt.value.side === switchInTarget.side && (opt.value as any).slotIndex === (switchInTarget as any).slotIndex) return false;
          return true;
      });

      return [...options, ...otherActive];
    }

    // Default stats-modifier (Attack/Item): prioritize target
    const target = action.target;
    if (target && target.type === "battlefield_slot") {
      const targetSide = target.side;
      const targetSlot = target.slotIndex;
      
      const targetIndex = baseOptions.findIndex(opt => 
        opt.value.side === targetSide && (opt.value as any).slotIndex === targetSlot
      );
      
      if (targetIndex !== -1) {
        const [targetOpt] = baseOptions.splice(targetIndex, 1);
        return [targetOpt, ...baseOptions];
      }
    }
    return baseOptions;
  }

  // If this is a status change applied via an ATTACK action:
  if (action.type === "attack" && effectType === "status-change") {
      const casterTeam = action.actor.side === "my" ? state.myTeam : state.enemyTeam;
      const casterActiveSlots = action.actor.side === "my" ? state.activeSlots?.myTeam : state.activeSlots?.opponentTeam;
      const activeIndices = casterActiveSlots || [];
      const teamOptions: EffectOption[] = [];
      
      casterTeam.forEach((pokemon, teamIndex) => {
          if (pokemon && pokemon.hpPercent > 0 && !activeIndices.includes(teamIndex)) {
              teamOptions.push({
                  label: `[Team] ${pokemon.name}`,
                  value: { type: "team_index", side: action.actor.side, teamIndex, slotIndex: -1 },
                  isAlly: action.actor.side === "my"
              });
          }
      });
      
      return [...baseOptions, ...teamOptions];
  }

  // If this is a status change applied via a SWITCH:
  if ((action.type === "switch" || action.type === "switch-after-ko") && effectType === "status-change") {
      const switchInTarget = action.target; 
      const options: EffectOption[] = [];

      // 1. The Switch-In Pokemon (highest priority, should be first)
      if (switchInTarget && switchInTarget.type !== "field" && switchInTarget.type !== "team_index") {
          const side = switchInTarget.side;
          const slot = (switchInTarget as any).slotIndex;
          const activeSlots = side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam;
          const team = side === "my" ? state.myTeam : state.enemyTeam;
          
          let switchInIndex = switchInTarget.type === "battlefield_slot" ? activeSlots[slot] : null;

          if (switchInTarget && side && slot !== undefined) {
             const mon = team[slot];
             if (mon && mon.hpPercent > 0) {
                 options.push({
                     label: `[In] ${mon.name}`,
                     value: { type: "battlefield_slot", side: action.actor.side, slotIndex: "slotIndex" in action.actor ? action.actor.slotIndex : 0 },
                     isAlly: action.actor.side === "my"
                 });
             }
          }
      }

      // 2. The Switch-Out Pokemon (the actor)
      const actorSide = action.actor.side;
      const team = actorSide === "my" ? state.myTeam : state.enemyTeam;
      const outTeamIndex = resolveOutTeamIndex(action, state, actorObj);
      
      if (outTeamIndex !== -1 && team[outTeamIndex]) {
          const mon = team[outTeamIndex];
          if (mon.hpPercent > 0) {
              options.push({
                  label: `[Out] ${mon.name}`,
                  value: { type: "team_index", side: actorSide, teamIndex: outTeamIndex, slotIndex: -1 },
                  isAlly: actorSide === "my"
              });
          }
      }

      // 3. Other base options (the rest of the active battlefield)
      const actorSlot = "slotIndex" in action.actor ? action.actor.slotIndex : 0;
      const otherActive = baseOptions.filter(opt => {
         if (opt.value.type === "battlefield_slot" && opt.value.side === actorSide && (opt.value as any).slotIndex === actorSlot) return false;
         return true;
      });

      return [...options, ...otherActive];
  }

  // Default behaviour
  return baseOptions;
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

/**
 * Resolves a Pokémon from the BattleState based on side and slot index.
 * Returns the full Pokemon object or undefined if the slot is empty.
 */
export function getPokemonFromState(
    state: BattleState,
    side: "my" | "opponent",
    slotIndex: number
): NonNullable<BattleState["myTeam"][number]> | undefined {
    const isMySide = side === "my"
    const slots = isMySide ? state.activeSlots?.myTeam : state.activeSlots?.opponentTeam
    const team = isMySide ? state.myTeam : state.enemyTeam
    
    if (!slots || !team) return undefined

    const teamIndex = slots[slotIndex]
    if (teamIndex === null || teamIndex === undefined) return undefined
    
    return team[teamIndex]
}

/**
 * Resolves the HP info of a Pokémon directly from its team index.
 * Useful for handling bench targets (team_index).
 */
export function getPokemonHpByTeamIndexFromState(
    state: BattleState,
    side: "my" | "opponent",
    teamIndex: number
): PokemonHpInfo | undefined {
    const team = side === "my" ? state.myTeam : state.enemyTeam
    if (!team) return undefined

    const pokemon = team[teamIndex]
    if (!pokemon) return undefined

    const hpMax = pokemon.hpMax ?? 100
    const hpPercent = pokemon.hpPercent
    const hpCurrent = pokemon.hpCurrent ?? Math.round(hpPercent * hpMax / 100)

    return { hpPercent, hpMax, hpCurrent }
}

/**
 * Resolves a Pokémon directly from its team index.
 * Useful for handling bench targets (team_index).
 */
export function getPokemonByTeamIndexFromState(
    state: BattleState,
    side: "my" | "opponent",
    teamIndex: number
): NonNullable<BattleState["myTeam"][number]> | undefined {
    const team = side === "my" ? state.myTeam : state.enemyTeam
    if (!team) return undefined

    return team[teamIndex]
}
