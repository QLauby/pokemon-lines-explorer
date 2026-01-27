import { BattleState, Pokemon } from "@/types/types"
import { useState } from "react"
import { BattleEngine } from "../../../logic/battle-engine"

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
  const activeStarters = currentSession?.initialState.activeStarters
  const battlefieldState = currentSession?.initialState.battlefieldState
  const expandedPokemonIds = currentSession?.initialState.expandedPokemonIds
  
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
    const defaultItemName = teamType === "my" ? `Item ${team.length + 1}` : `Item ${String.fromCharCode(65 + team.length)}`
    const defaultAbilityName = teamType === "my" ? `Ability ${team.length + 1}` : `Ability ${String.fromCharCode(65 + team.length)}`

    const newPokemon: Pokemon = {
      id: Date.now().toString(),
      name: finalName,
      types: [],
      teraType: undefined,
      heldItemName: defaultItemName,
      abilityName: defaultAbilityName,
      hpPercent: 100,
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
     if (pokemon) updatePokemon({ ...pokemon, hpPercent: newHP }, isMyTeam)
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
    const currentStarters = [...activeStarters[teamKey]]
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    
    // Check if clicked pokemon is already active
    const isActive = currentStarters.includes(index)

    const updates: Partial<BattleState> = {}
    const newStarters = [...currentStarters]

    // Initialize array if needed based on maxSlots
    while (newStarters.length < maxSlots) {
        newStarters.push(null)
    }

    if (maxSlots === 1) {
        // Single Battle: Always replace Slot 1 (Index 0)
        newStarters[0] = index
    } else {
        // Double Battle
        if (isActive) {
             // If clicking an already active one (e.g. Slot 1), do nothing or swap? 
             // User instruction: "Cliquer sur le badge... d'un pokemon qui n'est PAS au combat déselectionne le deuxieme"
             // Implies we only act if NOT active. 
             // If user clicks Slot 1, maybe they want to swap Slot 1? Let's assume No-Op for now based on strict reading.
             return;
        } else {
             // Not active: Replace Slot 2 (Index 1)
             newStarters[1] = index
             
             // Ensure Slot 1 is set (defaults to 0 if null/empty and 0 isn't index)
             if (newStarters[0] === null || newStarters[0] === undefined) {
                 newStarters[0] = (index === 0) ? 1 : 0 // Fallback
             }
        }
    }
    
    updates.activeStarters = { ...activeStarters, [teamKey]: newStarters }
    updateInitialState(updates)
  }

  const updateBattlefieldTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, customTags: tags } })
  const updatePlayerSideTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, playerSide: { customTags: tags } } })
  const updateOpponentSideTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, opponentSide: { customTags: tags } } })

  const togglePokemonExpansion = (id: string) => {
    const currentExpanded = expandedPokemonIds || []
    const isExpanded = currentExpanded.includes(id)
    const newExpanded = isExpanded 
      ? currentExpanded.filter((pid: string) => pid !== id)
      : [...currentExpanded, id]
    
    updateInitialState({ expandedPokemonIds: newExpanded })
  }

  const getSlotForPokemon = (idx: number, isMyTeam: boolean) => {
    if (!activeStarters) return null
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    const slot = starters.slice(0, maxSlots).indexOf(idx)
    return slot !== -1 ? slot + 1 : null
  }

  const isStarterPokemon = (p: Pokemon, idx: number, isMyTeam: boolean) => {
    if (!activeStarters) return false
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    return starters.slice(0, maxSlots).includes(idx)
  }

  const startEditingPokemon = (p: Pokemon) => { setEditingPokemonId(p.id); setEditingPokemonName(p.name); }
  const cancelEditing = () => { setEditingPokemonId(null); setEditingPokemonName(""); }

  return {
      newMyPokemonName, setNewMyPokemonName,
      newOpponentPokemonName, setNewOpponentPokemonName,
      editingPokemonId, setEditingPokemonId,
      editingPokemonName, setEditingPokemonName,
      
      // Data
      myTeam,
      enemyTeam,
      activeStarters,
      battlefieldState,
      expandedPokemonIds,

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
      togglePokemonExpansion,
      getSlotForPokemon,
      isStarterPokemon,
      startEditingPokemon,
      cancelEditing,
      getDefaultPokemonName
  }
}
