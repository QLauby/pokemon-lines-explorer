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
  types?: import("@/lib/utils/colors-utils").PokemonType[]
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
          types: pokemon.types
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
          types: pokemon.types
        })
      }
    }
  })

  // Add field targets
  opts.push(
    {
      label: "Main",
      value: { type: "field", side: "my", target: "global", slotIndex: -1 },
      isAlly: true,
    },
    {
      label: "My Side",
      value: { type: "field", side: "my", target: "my_side", slotIndex: -1 },
      isAlly: true,
    },
    {
      label: "Opponent's Side",
      value: { type: "field", side: "opponent", target: "opponent_side", slotIndex: -1 },
      isAlly: false,
    }
  )

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
  action: TurnAction | undefined,
  effectType: EffectType,
  state: BattleState,
  actorObj?: { pokemon: { name: string, hpPercent?: number }, isAlly: boolean, teamIndex?: number }
): EffectOption[] {
  // Base list of targets from generateEffectOptions (contains both Pokemon and Field)
  const baseOptions = generateEffectOptions(state);

  // --- 1. TERRAIN EFFECTS ---
  // Only field targets are allowed
  if (effectType === "terrain") {
      return baseOptions.filter(opt => opt.value.type === "field");
  }

  // --- 2. POKEMON EFFECTS (HP, Status, Stats, Custom/Tags, Mega/Tera, Ability/Item) ---
  // Field targets are NOT allowed
  const pokemonOnlyOptions = baseOptions.filter(opt => opt.value.type !== "field");

  // End-of-turn context or missing action: just return active pokemon
  if (!action) {
      return pokemonOnlyOptions;
  }

  // --- 3. ACTION-SPECIFIC LOGIC ---
  
  // A. Status Change: Special case where you can target benched team members
  if (effectType === "status-change") {
      const actorSide = action.actor.side;
      const team = actorSide === "my" ? state.myTeam : state.enemyTeam;
      const activeIndices = (actorSide === "my" ? state.activeSlots?.myTeam : state.activeSlots?.opponentTeam) || [];
      
      const teamOptions: EffectOption[] = [];
      team.forEach((pokemon, idx) => {
          if (pokemon && pokemon.hpPercent > 0 && !activeIndices.includes(idx)) {
              teamOptions.push({
                  label: `[Team] ${pokemon.name}`,
                  value: { type: "team_index", side: actorSide, teamIndex: idx, slotIndex: -1 },
                  isAlly: actorSide === "my",
                  types: pokemon.types
              });
          }
      });

      const combined = [...pokemonOnlyOptions, ...teamOptions];

      // Prioritize Switch targets for Status
      if (action.type === "switch" || action.type === "switch-after-ko") {
          const switchOptions: EffectOption[] = [];
          
          // Out
          const outIdx = resolveOutTeamIndex(action, state, actorObj);
          if (outIdx !== -1 && team[outIdx]) {
              switchOptions.push({
                  label: `[Out] ${team[outIdx].name}`,
                  value: { type: "team_index", side: actorSide, teamIndex: outIdx, slotIndex: -1 },
                  isAlly: actorSide === "my",
                  types: team[outIdx].types
              });
          }

          // In
          if (action.target?.type === "battlefield_slot") {
              const inIdx = (action.target.side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam)[action.target.slotIndex];
              if (inIdx !== null && inIdx !== undefined) {
                  const inMon = (action.target.side === "my" ? state.myTeam : state.enemyTeam)[inIdx];
                  if (inMon) {
                      switchOptions.push({
                          label: `[In] ${inMon.name}`,
                          value: { type: "battlefield_slot", side: action.target.side, slotIndex: action.target.slotIndex },
                          isAlly: action.target.side === "my",
                          types: inMon.types
                      });
                  }
              }
          }

          const filtered = combined.filter(opt => !switchOptions.some(s => 
              s.value.type === opt.value.type && 
              (s.value as any).side === (opt.value as any).side && 
              ((s.value as any).slotIndex === (opt.value as any).slotIndex || (s.value as any).teamIndex === (opt.value as any).teamIndex)
          ));
          return [...switchOptions, ...filtered];
      }
      return combined;
  }

  // B. Other Pokémon effects (HP, Stats, Tags, Mega/Tera, Ability/Item) - Handle Switch priority
  if (action.type === "switch" || action.type === "switch-after-ko") {
      const actorSide = action.actor.side;
      const team = actorSide === "my" ? state.myTeam : state.enemyTeam;
      const switchOptions: EffectOption[] = [];
      
      const outIdx = resolveOutTeamIndex(action, state, actorObj);
      if (outIdx !== -1 && team[outIdx]) {
          switchOptions.push({
              label: `[Out] ${team[outIdx].name}`,
              value: { type: "team_index", side: actorSide, teamIndex: outIdx, slotIndex: -1 },
              isAlly: actorSide === "my",
              types: team[outIdx].types
          });
      }

      if (action.target?.type === "battlefield_slot") {
          const side = action.target.side;
          const slot = action.target.slotIndex;
          const inIdx = (side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam)[slot];
          if (inIdx !== null && inIdx !== undefined) {
              const inMon = (side === "my" ? state.myTeam : state.enemyTeam)[inIdx];
              if (inMon) {
                  switchOptions.push({
                      label: `[In] ${inMon.name}`,
                      value: { type: "battlefield_slot", side, slotIndex: slot },
                      isAlly: side === "my",
                      types: inMon.types
                  });
              }
          }
      }

      const rest = pokemonOnlyOptions.filter(opt => !switchOptions.some(o => 
          o.value.type === opt.value.type && 
          (o.value as any).side === (opt.value as any).side && 
          ((o.value as any).slotIndex === (opt.value as any).slotIndex || (o.value as any).teamIndex === (opt.value as any).teamIndex)
      ));
      return [...switchOptions, ...rest];
  }

  // C. Attack/Item priority (move target to top)
  if (action.target?.type === "battlefield_slot") {
      const t = action.target;
      const targetIdx = pokemonOnlyOptions.findIndex(o => o.value.side === t.side && (o.value as any).slotIndex === t.slotIndex);
      if (targetIdx !== -1) {
          const res = [...pokemonOnlyOptions];
          const [targetOpt] = res.splice(targetIdx, 1);
          return [targetOpt, ...res];
      }
  }

  return pokemonOnlyOptions;
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

  // Normalize state if missing battlefieldState
  if (!patchMy && !patchOpp && state.battlefieldState) return state

  const bfState = state.battlefieldState || { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } };

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
    battlefieldState: bfState,
  } as BattleState
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
    const statProfile = pokemon.statProfile

    return { hpPercent, hpMax, hpCurrent, statProfile }
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
    const statProfile = pokemon.statProfile

    return { hpPercent, hpMax, hpCurrent, statProfile }
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
