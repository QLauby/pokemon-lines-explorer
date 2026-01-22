import { BattleDelta, BattleState, Pokemon, TreeNode } from "@/lib/types"
import { useEffect, useMemo, useRef, useState } from "react"
import { BattleEngine } from "../logic/battle-engine"
import { useBattleStorage } from "./use-battle-storage"

const VERTICAL_SPACING = 45

export function usePokemonBattle() {
  const { sessions, isLoaded, saveSession, createSession } = useBattleStorage()
  
  // UI State
  const [currentView, setCurrentView] = useState<"teams" | "combat">("teams")
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [scrollX, setScrollX] = useState(0)

  // Forms State
  const [newMyPokemonName, setNewMyPokemonName] = useState("")
  const [newOpponentPokemonName, setNewOpponentPokemonName] = useState("")

  
  // Changes for the next action (Delta Builder)
  const [pendingDeltas, setPendingDeltas] = useState<BattleDelta[]>([])
  const [hpChangesInputs, setHpChangesInputs] = useState<{ pokemonId: string; value: number; isHealing: boolean }[]>([])

  const [editingPokemonId, setEditingPokemonId] = useState<string | null>(null)
  const [editingPokemonName, setEditingPokemonName] = useState("")

  const nodeOrder = useRef(1)

  // Initialize or Select Default Session
  useEffect(() => {
    if (isLoaded) {
      if (sessions.length === 0) {
        const session = createSession("Combat 1")
        setCurrentSessionId(session.id)
      } else if (!currentSessionId) {
        // Default to the first one or most recent
        setCurrentSessionId(sessions[0].id)
      }
    }
  }, [isLoaded, sessions, currentSessionId, createSession])

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId), 
    [sessions, currentSessionId]
  )

  // Auto-select node on initial load or session change
  useEffect(() => {
     if (!currentSession || currentSession.nodes.length === 0) return;

     // Check if the current selectedNodeId is valid for this session
     const isIdValid = currentSession.nodes.some(n => n.id === selectedNodeId);

     if (!selectedNodeId || !isIdValid) {
         // Priority 1: Restore last selection from session
         if (currentSession.lastSelectedNodeId && currentSession.nodes.some(n => n.id === currentSession.lastSelectedNodeId)) {
             setSelectedNodeId(currentSession.lastSelectedNodeId);
         } 
         // Priority 2: Pick the last node (root or latest action)
         else {
             const lastNode = currentSession.nodes[currentSession.nodes.length - 1];
             setSelectedNodeId(lastNode.id);
         }
     }
  }, [currentSessionId, currentSession?.nodes.length]) // Only trigger on session switch or node count change

  // Persist selectedNodeId when it changes manually
  useEffect(() => {
      if (currentSession && selectedNodeId) {
          // Only save if different from what's in the session to avoid cycles
          if (currentSession.lastSelectedNodeId !== selectedNodeId) {
              // Verify it's a node of this session before saving
              if (currentSession.nodes.some(n => n.id === selectedNodeId)) {
                  saveSession({ ...currentSession, lastSelectedNodeId: selectedNodeId })
              }
          }
      }
  }, [selectedNodeId]) // Only depend on the ID changing

  // Computed State for the Current View
  const currentState: BattleState = useMemo(() => {
    if (!currentSession) {
      return {
        myTeam: [],
        enemyTeam: [],
        activeStarters: { myTeam: [0, 1], opponentTeam: [0, 1] },
        battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } },
        expandedPokemonIds: []
      }
    }

    if (currentView === "teams") {
      return currentSession.initialState
    }

    // Convert nodes array to Map for Engine
    const nodesMap = new Map(currentSession.nodes.map(n => [n.id, n]))
    return BattleEngine.computeState(currentSession.initialState, nodesMap, selectedNodeId || "root")

  }, [currentSession, currentView, selectedNodeId])


  // Helpers related to State
  const { myTeam, enemyTeam, activeStarters, battlefieldState, expandedPokemonIds } = currentState

  // --- ACTIONS ---

  // 1. Initial State Modifications (Team View)
  const updateInitialState = (updates: Partial<BattleState>) => {
    if (!currentSession) return
    const newSession = {
      ...currentSession,
      initialState: { ...currentSession.initialState, ...updates }
    }
    saveSession(newSession)
  }

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
      updateInitialState({ myTeam: myTeam.filter((p) => p.id !== id) })
    } else {
      updateInitialState({ enemyTeam: enemyTeam.filter((p) => p.id !== id) })
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
    const pokemon = team.find((p) => p.id === pokemonId)
    if (!pokemon) return

    const teamIndex = team.findIndex((p) => p.id === pokemonId)
    const finalName = newName.trim() || getDefaultPokemonName(team.slice(0, teamIndex), isMyTeam ? "my" : "opponent")
    
    updatePokemon({ ...pokemon, name: finalName }, isMyTeam)
    setEditingPokemonId(null)
    setEditingPokemonName("")
  }

  const setPokemonHealth = (id: string, isMyTeam: boolean, newHP: number) => {
     const team = isMyTeam ? myTeam : enemyTeam
     const pokemon = team.find(p => p.id === id)
     if (pokemon) updatePokemon({ ...pokemon, hpPercent: newHP }, isMyTeam)
  }

  const setPokemonStatus = (id: string, isMyTeam: boolean, updates: any) => {
     const team = isMyTeam ? myTeam : enemyTeam
     const pokemon = team.find(p => p.id === id)
     if (pokemon) updatePokemon({ ...pokemon, ...updates }, isMyTeam)
  }

  const toggleHeldItem = (pokemonId: string, isMyTeam: boolean) => {
      const team = isMyTeam ? myTeam : enemyTeam;
      const index = team.findIndex(p => p.id === pokemonId);
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
      const p = team.find(p => p.id === pokemonId);
      if (p) updatePokemon({ ...p, isTerastallized: !p.isTerastallized }, isMyTeam);
  }
  
  const toggleMega = (pokemonId: string, isMyTeam: boolean) => {
      const team = isMyTeam ? myTeam : enemyTeam;
      const p = team.find(p => p.id === pokemonId);
      if (p) updatePokemon({ ...p, isMega: !p.isMega }, isMyTeam);
  }

   const handleFlagClick = (index: number, isMyTeam: boolean) => {
    const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
    const currentStarters = [...activeStarters[teamKey]]
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    const team = isMyTeam ? myTeam : enemyTeam

    let indexLeaving: number | null = null
    const existingSlot = currentStarters.slice(0, maxSlots).indexOf(index)

    if (existingSlot !== -1) {
      indexLeaving = index
      currentStarters[existingSlot] = null
    } else {
      if (currentStarters[0] === null) {
        currentStarters[0] = index
      } else if (maxSlots > 1 && currentStarters[1] === null) {
        currentStarters[1] = index
      } else {
         if (maxSlots === 1) {
          indexLeaving = currentStarters[0]
          currentStarters[0] = index
         } else {
          indexLeaving = currentStarters[1]
          currentStarters[1] = index
         }
      }
    }
    
    const updates: Partial<BattleState> = { activeStarters: { ...activeStarters, [teamKey]: currentStarters } }

    if (indexLeaving !== null) {
        const pokemonLeaving = team[indexLeaving]
        if (pokemonLeaving) {
             const cleaned = {
                 ...pokemonLeaving,
                 love: false,
                 confusion: false,
                 confusionCounter: 0,
                 showConfusionCounter: false
             }
             const newTeam = [...team]
             newTeam[indexLeaving] = cleaned
             
             if (isMyTeam) updates.myTeam = newTeam
             else updates.enemyTeam = newTeam
        }
    }

    updateInitialState(updates)
  }

  const updateBattlefieldTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, customTags: tags } })
  const updatePlayerSideTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, playerSide: { customTags: tags } } })
  const updateOpponentSideTags = (tags: string[]) => updateInitialState({ battlefieldState: { ...battlefieldState, opponentSide: { customTags: tags } } })

  const togglePokemonExpansion = (id: string) => {
    const currentExpanded = expandedPokemonIds || []
    const isExpanded = currentExpanded.includes(id)
    const newExpanded = isExpanded 
      ? currentExpanded.filter(pid => pid !== id)
      : [...currentExpanded, id]
    
    updateInitialState({ expandedPokemonIds: newExpanded })
  }


  const setBattleType = (type: "simple" | "double") => {
      if(currentSession) saveSession({ ...currentSession, battleType: type })
  }

  // --- BATTLE ACTIONS (Deltas) ---

  const initializeBattle = () => {
    if (!currentSession) return
    if (myTeam.length === 0 && enemyTeam.length === 0) return

    // Create root node if not exists
    if (!currentSession.nodes.some(n => n.id === "root")) {
        const rootNode: TreeNode = {
            id: "root",
            description: "État Initial",
            probability: 100,
            cumulativeProbability: 100,
            deltas: [], 
            children: [],
            parentId: undefined,
            createdAt: Date.now(),
            turn: 0,
            branchIndex: 0,
            x: 45,
            y: 45
        }
        saveSession({ ...currentSession, nodes: [rootNode] })
        setSelectedNodeId("root")
    }

    setCurrentView("combat")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Helper to re-calculate Tree Layout (x, y)
  // This needs to be adapted to work with the flattened array
  const recalculateTreeLayout = (nodes: TreeNode[]): TreeNode[] => {

      const nodesMap = new Map(nodes.map(n => [n.id, n]));
       
      const branchMap = new Map<number, number>();
      const uniqueBranches = nodes.filter(n => n.branchIndex !== 0);
      const uniqueBranchIndices = Array.from(new Set(uniqueBranches.map(n => n.branchIndex)));
      
      // Sort branches logic here if needed...
      uniqueBranchIndices.forEach((idx, i) => branchMap.set(idx, i + 1));

      // Update Y positions
      const updated = nodes.map(node => {
          const yPos = node.branchIndex === 0 ? 45 : 45 + (branchMap.get(node.branchIndex) || 0) * VERTICAL_SPACING;
          return { ...node, y: yPos };
      });
      return updated;
  }

  const addAction = () => {
    if (!selectedNodeId || !currentSession) return
    
    const parentNode = currentSession.nodes.find(n => n.id === selectedNodeId)
    if (!parentNode) return

    // Construct Deltas from Inputs
    const deltas: BattleDelta[] = []
    
    // HP Deltas
    hpChangesInputs.forEach(input => {
        if (input.value !== 0 && input.pokemonId) {
             const finalAmount = input.value * (input.isHealing ? 1 : -1)
             deltas.push({
                type: "HP_RELATIVE",
                targetId: input.pokemonId,
                amount: finalAmount
            })
        }
    })

    const nodeId = Date.now().toString()
    
    // Logic for Position (simplified from original)
    const newTurn = parentNode.turn + 1
    const HORIZONTAL_SPACING = 70
    const x = 45 + newTurn * HORIZONTAL_SPACING
    
    // Branch logic
    const childIndex = parentNode.children.length
    let branchIndex = parentNode.branchIndex
    let y = parentNode.y
    
    if (childIndex > 0) {
        // New branch
        const usedBranches = new Set(currentSession.nodes.map(n => n.branchIndex))
        let newBranch = 1
        while (usedBranches.has(newBranch)) newBranch++;
        branchIndex = newBranch
        y = 0 // Will be recalculated
    }

    const newNode: TreeNode = {
        id: nodeId,
        description: "", 
        probability: 100,
        cumulativeProbability: parentNode.cumulativeProbability, // 100% probability implies same cumulative
        deltas: deltas,
        children: [],
        parentId: selectedNodeId,
        createdAt: Date.now(),
        turn: newTurn,
        branchIndex: branchIndex,
        x,
        y // Temp
    }

    // Update Parent
    const updatedParent = { ...parentNode, children: [...parentNode.children, nodeId] }
    
    // Add to list
    let newNodesList = currentSession.nodes.map(n => n.id === selectedNodeId ? updatedParent : n)
    newNodesList.push(newNode)
    
    // Recalculate Layout
    newNodesList = recalculateTreeLayout(newNodesList)
    
    // Save
    saveSession({ ...currentSession, nodes: newNodesList })
    
    // Cleanup
    setSelectedNodeId(nodeId)
    setHpChangesInputs([])
  }

  const resetBattle = () => {
      if (currentSession) {
          saveSession({ ...currentSession, nodes: [], lastSelectedNodeId: undefined })
          setSelectedNodeId("")
          setCurrentView("teams")
      }
  }
  
  const resetBattleIfNeeded = () => {
  }

  // --- View Helpers ---
  const handleScroll = (direction: "left" | "right") => {
    const scrollAmount = 70
    setScrollX(prev => direction === "left" ? Math.max(0, prev - scrollAmount) : prev + scrollAmount)
  }

  const getAllPokemon = () => [...myTeam, ...enemyTeam]

  // UI helpers
  const startEditingPokemon = (p: Pokemon) => { setEditingPokemonId(p.id); setEditingPokemonName(p.name); }
  const cancelEditing = () => { setEditingPokemonId(null); setEditingPokemonName(""); }
  const getTeamCounterDisplay = (len: number) => len <= 6 ? `${len}/6` : `${len}/${len}`
  const isStarterPokemon = (p: Pokemon, idx: number, isMyTeam: boolean) => {
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    return starters.slice(0, maxSlots).includes(idx)
  }
  const getSlotForPokemon = (idx: number, isMyTeam: boolean) => {
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = currentSession?.battleType === "simple" ? 1 : 2
    const slot = starters.slice(0, maxSlots).indexOf(idx)
    return slot !== -1 ? slot + 1 : null
  }

  return {
    state: {
        currentView,
        battleType: currentSession?.battleType || "simple",
        myTeam,
        enemyTeam,
        nodes: new Map((currentSession?.nodes || []).map(n => [n.id, n])), // BattleView expects Map
        selectedNodeId,
        battleStarted: (currentSession?.nodes.length || 0) > 0,
        scrollX,
        newMyPokemonName,
        newOpponentPokemonName,
        hpChanges: hpChangesInputs,
        editingPokemonId,
        editingPokemonName,
        activeStarters,
        getSlotForPokemon,
        battlefieldState,
        expandedPokemonIds,
        currentSession,
    },
    setters: {
        setCurrentView,
        setBattleType,
        setNewMyPokemonName,
        setNewOpponentPokemonName,
        setHpChanges: setHpChangesInputs,
        setSelectedNodeId,
    },
    actions: {
        addPokemon,
        removePokemon,
        setPokemonHealth, // Used in Team View
        updatePokemonHealth: (id: string, isMy: boolean, change: number) => {}, // Deprecated or mapped to setPokemonHealth? The UI calls this for +/- buttons
        setPokemonStatus,
        updatePokemonName,
        startEditingPokemon,
        cancelEditing,
        initializeBattle,
        addAction,
        getAllPokemon,
        handleScroll,
        resetBattle,
        resetBattleIfNeeded,
        getTeamCounterDisplay,
        updatePokemon,
        toggleHeldItem,
        toggleTerastallized,
        toggleMega,
        isStarterPokemon,
        handleFlagClick,
        getDefaultPokemonName,
        updateBattlefieldTags,
        updatePlayerSideTags,
        updateOpponentSideTags,
        togglePokemonExpansion,
    }
  }
}
