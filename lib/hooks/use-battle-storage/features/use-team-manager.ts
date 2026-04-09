import { updatePokemonHpPercent } from "@/lib/utils/hp-utils"
import { getPokemonDetails } from "@/lib/utils/pokedex-utils"
import { BattleState, CustomTagData, Pokemon } from "@/types/types"
import { useState } from "react"
import { BattleEngine } from "../../../logic/battle-engine"
import { DistributionEngine } from "../../../logic/distribution-engine"

interface UseTeamManagerProps {
  currentSession: any // Using specific type import in real code or implicit
  updateInitialState: (updates: Partial<BattleState>) => void
}

export function useTeamManager({ currentSession, updateInitialState }: UseTeamManagerProps) {
  // Forms State
  const [newMyPokemonName, setNewMyPokemonName] = useState("")
  const [newOpponentPokemonName, setNewOpponentPokemonName] = useState("")

  const [editingPokemonId, setEditingPokemonId] = useState<string | null>(null)
  const [editingPokemonName, setEditingPokemonName] = useState("")

  // Derived from currentSession (facade for easier access)
  const myTeam = currentSession?.initialState.myTeam || []
  const enemyTeam = currentSession?.initialState.enemyTeam || []
  const activeSlots = currentSession?.initialState.activeSlots || (currentSession?.initialState as any)?.activeStarters
  const battlefieldState = currentSession?.initialState.battlefieldState
  
  const getDefaultPokemonName = (team: Pokemon[], teamType: "my" | "opponent") => {
    if (teamType === "my") {
      return `Pokémon ${team.length + 1}`
    } else {
      return `Pokémon ${String.fromCharCode(65 + team.length)}`
    }
  }

  const addPokemon = (teamType: "my" | "opponent") => {
    const team = teamType === "my" ? myTeam : enemyTeam
    const inputValue = teamType === "my" ? newMyPokemonName : newOpponentPokemonName
    const setInputValue = teamType === "my" ? setNewMyPokemonName : setNewOpponentPokemonName

    const finalName = inputValue.trim() || getDefaultPokemonName(team, teamType)
    const dexData = getPokemonDetails(finalName)
    const initialTypes = dexData ? dexData.types.map((t: string) => t.toLowerCase()) : []
    const initialAbility = dexData ? dexData.abilities[0] : ""
    const initialItem = ""

    const newPokemon: Pokemon = {
      id: Date.now().toString(),
      name: finalName,
      types: initialTypes,
      teraType: undefined,
      heldItemName: initialItem,
      abilityName: initialAbility,
      hpPercent: 100,
      hpMax: 100,
      hpCurrent: 100,
      statProfile: {
        distribution: DistributionEngine.createInitialDistribution(100, 100)
      },
      attacks: [],
      status: null,
      confusion: false,
      love: false,
      heldItem: false,
      isTerastallized: false,
      isMega: false,
      customTags: [],
      statsModifiers: BattleEngine.getStatsModifiersDefault(),
    }

    if (teamType === "my") {
      updateInitialState({ myTeam: [...myTeam, newPokemon] })
    } else {
      updateInitialState({ enemyTeam: [...enemyTeam, newPokemon] })
    }
    setInputValue("")
  }

  const removePokemon = (id: string, isMyTeam: boolean) => {
    if (isMyTeam) {
      updateInitialState({ myTeam: myTeam.filter((p: Pokemon) => p.id !== id) })
    } else {
      updateInitialState({ enemyTeam: enemyTeam.filter((p: Pokemon) => p.id !== id) })
    }
  }

  const updatePokemon = (updatedPokemon: Pokemon, isMyTeam: boolean) => {
     const updateTeam = (team: Pokemon[]) =>
      team.map((pokemon) => (pokemon.id === updatedPokemon.id ? updatedPokemon : pokemon))

    if (isMyTeam) {
       updateInitialState({ myTeam: updateTeam(myTeam) })
    } else {
       updateInitialState({ enemyTeam: updateTeam(enemyTeam) })
    }
  }

  // --- Initial State Helper Wrappers (Routing to updateInitialState) ---
  const updatePokemonName = (pokemonId: string, newName: string, isMyTeam: boolean) => {
    const team = isMyTeam ? myTeam : enemyTeam
    const pokemon = team.find((p: Pokemon) => p.id === pokemonId)
    if (!pokemon) return

    const teamIndex = team.findIndex((p: Pokemon) => p.id === pokemonId)
    const finalName = newName.trim() || getDefaultPokemonName(team.slice(0, teamIndex), isMyTeam ? "my" : "opponent")
    
    updatePokemon({ ...pokemon, name: finalName }, isMyTeam)
    setEditingPokemonId(null)
    setEditingPokemonName("")
  }

  const setPokemonHealth = (id: string, isMyTeam: boolean, newHP: number) => {
     const team = isMyTeam ? myTeam : enemyTeam
     const pokemon = team.find((p: Pokemon) => p.id === id)
     if (pokemon) updatePokemon(updatePokemonHpPercent(pokemon, newHP), isMyTeam)
  }

  const setPokemonStatus = (id: string, isMyTeam: boolean, updates: any) => {
     const team = isMyTeam ? myTeam : enemyTeam
     const pokemon = team.find((p: Pokemon) => p.id === id)
     if (pokemon) updatePokemon({ ...pokemon, ...updates }, isMyTeam)
  }

  const toggleHeldItem = (pokemonId: string, isMyTeam: boolean) => {
      const team = isMyTeam ? myTeam : enemyTeam;
      const index = team.findIndex((p: Pokemon) => p.id === pokemonId);
      if (index === -1) return;
      
      const p = team[index];
      const defaultItemName = isMyTeam ? `Item ${index + 1}` : `Item ${String.fromCharCode(65 + index)}`
      
      let updated: Pokemon;
      if (!p.heldItem) {
          updated = { ...p, heldItem: true, heldItemName: p.heldItemName === "Mega Stone" ? defaultItemName : (p.heldItemName || defaultItemName), isMega: false };
      } else {
          if (p.heldItemName !== "Mega Stone") {
             updated = { ...p, heldItemName: "Mega Stone", isMega: false };
          } else {
             updated = { ...p, heldItem: false, isMega: false };
          }
      }
      updatePokemon(updated, isMyTeam);
  }

  const toggleTerastallized = (pokemonId: string, isMyTeam: boolean) => {
      const team = isMyTeam ? myTeam : enemyTeam;
      const p = team.find((p: Pokemon) => p.id === pokemonId);
      if (p) updatePokemon({ ...p, isTerastallized: !p.isTerastallized }, isMyTeam);
  }
  
  const toggleMega = (pokemonId: string, isMyTeam: boolean) => {
      const team = isMyTeam ? myTeam : enemyTeam;
      const p = team.find((p: Pokemon) => p.id === pokemonId);
      if (p) updatePokemon({ ...p, isMega: !p.isMega }, isMyTeam);
  }

   const handleFlagClick = (index: number, isMyTeam: boolean) => {
    const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
    const currentActiveSlots = [...activeSlots[teamKey]]
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    
    // Check if clicked pokemon is already active
    const isActive = currentActiveSlots.includes(index)

    const updates: Partial<BattleState> = {}
    const newActiveSlots = [...currentActiveSlots]

    // Initialize array if needed based on maxSlots
    while (newActiveSlots.length < maxSlots) {
        newActiveSlots.push(null)
    }

    if (maxSlots === 1) {
        // Single Battle: Always replace Slot 1 (Index 0)
        newActiveSlots[0] = index
    } else {
        // Double Battle
        if (isActive) {
             return;
        } else {
             // Not active: Replace Slot 2 (Index 1)
             newActiveSlots[1] = index
             
             // Ensure Slot 1 is set (defaults to 0 if null/empty and 0 isn't index)
             if (newActiveSlots[0] === null || newActiveSlots[0] === undefined) {
                 newActiveSlots[0] = (index === 0) ? 1 : 0 // Fallback
             }
        }
    }
    
    updates.activeSlots = { ...activeSlots, [teamKey]: newActiveSlots }
    updateInitialState(updates)
  }

  const updateBattlefieldTags = (tags: CustomTagData[]) => updateInitialState({ battlefieldState: { ...battlefieldState, customTags: tags } })
  const updatePlayerSideTags = (tags: CustomTagData[]) => updateInitialState({ battlefieldState: { ...battlefieldState, playerSide: { customTags: tags } } })
  const updateOpponentSideTags = (tags: CustomTagData[]) => updateInitialState({ battlefieldState: { ...battlefieldState, opponentSide: { customTags: tags } } })

  const getSlotForPokemon = (idx: number, isMyTeam: boolean) => {
    if (!activeSlots) return null
    const slots = isMyTeam ? activeSlots.myTeam : activeSlots.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    const slot = slots.slice(0, maxSlots).indexOf(idx)
    return slot !== -1 ? slot + 1 : null
  }

  const isPokemonActive = (p: Pokemon, idx: number, isMyTeam: boolean) => {
    if (!activeSlots) return false
    const slots = isMyTeam ? activeSlots.myTeam : activeSlots.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    return slots.slice(0, maxSlots).includes(idx)
  }

  const startEditingPokemon = (p: Pokemon) => { setEditingPokemonId(p.id); setEditingPokemonName(p.name); }
  const cancelEditing = () => { setEditingPokemonId(null); setEditingPokemonName(""); }

  const movePokemon = (id: string, isMyTeam: boolean, direction: "up" | "down") => {
    const team = isMyTeam ? myTeam : enemyTeam
    const index = team.findIndex((p: Pokemon) => p.id === id)
    if (index === -1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= team.length) return

    const newTeam = [...team]
    const temp = newTeam[index]
    newTeam[index] = newTeam[newIndex]
    newTeam[newIndex] = temp

    if (isMyTeam) {
      updateInitialState({ myTeam: newTeam })
    } else {
      updateInitialState({ enemyTeam: newTeam })
    }
  }

  const importPokemons = (pokemons: Omit<Pokemon, "id">[], mode: "replace" | "add", isMyTeam: boolean) => {
    const currentTeam = isMyTeam ? myTeam : enemyTeam;
    const withIds: Pokemon[] = pokemons.map((p) => {
      const max = p.hpMax && p.hpMax > 0 ? p.hpMax : 100;
      const cur = p.hpCurrent !== undefined ? p.hpCurrent : max;
      const pct = Math.max(0, Math.min(100, (cur / max) * 100));
      
      return {
        ...p,
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        hpMax: max,
        hpCurrent: cur,
        hpPercent: pct,
        statProfile: {
          distribution: DistributionEngine.createInitialDistribution(cur, max)
        },
        status: p.status || null,
        confusion: !!p.confusion,
        love: !!p.love,
        heldItem: !!p.heldItemName,
        isTerastallized: !!p.isTerastallized,
        isMega: !!p.isMega,
        customTags: p.customTags || [],
        statsModifiers: p.statsModifiers || BattleEngine.getStatsModifiersDefault(),
      };
    });

    let newTeam: Pokemon[];
    if (mode === "replace") {
      newTeam = withIds;
    } else {
      newTeam = [...currentTeam, ...withIds];
    }

    if (isMyTeam) {
      updateInitialState({ myTeam: newTeam });
    } else {
      updateInitialState({ enemyTeam: newTeam });
    }
  }

  return {
      newMyPokemonName, setNewMyPokemonName,
      newOpponentPokemonName, setNewOpponentPokemonName,
      editingPokemonId, setEditingPokemonId,
      editingPokemonName, setEditingPokemonName,
      
      // Data
      myTeam,
      enemyTeam,
      activeSlots,
      battlefieldState,

      // Actions
      addPokemon,
      removePokemon,
      updatePokemon,
      updatePokemonName,
      setPokemonHealth,
      setPokemonStatus,
      toggleHeldItem,
      toggleTerastallized,
      toggleMega,
      handleFlagClick,
      updateBattlefieldTags,
      updatePlayerSideTags,
      updateOpponentSideTags,
      togglePokemonExpansion: () => {}, // No-op now
      getSlotForPokemon,
      isStarterPokemon: isPokemonActive,
      startEditingPokemon,
      cancelEditing,
      getDefaultPokemonName,
      movePokemon,
      importPokemons,
  }
}
