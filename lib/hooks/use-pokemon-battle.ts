import { BattleState, TreeNode } from "@/lib/types"
import { useMemo } from "react"
import { BattleEngine } from "../logic/battle-engine"
import { useBattleSession } from "./features/use-battle-session"
import { useBattleTree } from "./features/use-battle-tree"
import { useTeamManager } from "./features/use-team-manager"

export function usePokemonBattle() {
  // 1. Session Management
  const {
      isLoaded,
      currentSession,
      currentSessionId,
      setCurrentSessionId,
      currentView,
      setCurrentView,
      sessions,
      createSession,
      setBattleType,
      updateInitialState,
      saveSession
  } = useBattleSession()

  // 2. Team Management
  const teamManager = useTeamManager({ currentSession, updateInitialState })

  // 3. Battle Tree Management
  const battleTree = useBattleTree({ 
      currentSession, 
      saveSession, 
      setCurrentView, 
      myTeam: teamManager.myTeam, 
      enemyTeam: teamManager.enemyTeam 
  })

  // 4. Computed State (Battle Engine)
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
    const nodesMap = new Map(currentSession.nodes.map((n: TreeNode) => [n.id, n]))
    return BattleEngine.computeState(currentSession.initialState, nodesMap, battleTree.selectedNodeId || "root")

  }, [currentSession, currentView, battleTree.selectedNodeId])


  const getAllPokemon = () => [...teamManager.myTeam, ...teamManager.enemyTeam]
  const getTeamCounterDisplay = (len: number) => len <= 6 ? `${len}/6` : `${len}/${len}`

  const resetBattleIfNeeded = () => {} // Placeholder if needed

  return {
    state: {
        currentView,
        battleType: currentSession?.battleType || "simple",
        myTeam: currentState.myTeam,
        enemyTeam: currentState.enemyTeam,
        nodes: new Map((currentSession?.nodes || []).map((n: TreeNode) => [n.id, n])),
        selectedNodeId: battleTree.selectedNodeId,
        battleStarted: (currentSession?.nodes.length || 0) > 0,
        newMyPokemonName: teamManager.newMyPokemonName,
        newOpponentPokemonName: teamManager.newOpponentPokemonName,
        editingPokemonId: teamManager.editingPokemonId,
        editingPokemonName: teamManager.editingPokemonName,
        activeStarters: currentState.activeStarters,
        getSlotForPokemon: teamManager.getSlotForPokemon,
        battlefieldState: currentState.battlefieldState,
        expandedPokemonIds: currentState.expandedPokemonIds,
        currentSession,
    },
    setters: {
        setCurrentView,
        setBattleType,
        setNewMyPokemonName: teamManager.setNewMyPokemonName,
        setNewOpponentPokemonName: teamManager.setNewOpponentPokemonName,
        setSelectedNodeId: battleTree.setSelectedNodeId,
    },
    actions: {
        addPokemon: teamManager.addPokemon,
        removePokemon: teamManager.removePokemon,
        setPokemonHealth: teamManager.setPokemonHealth,
        updatePokemonHealth: (id: string, isMy: boolean, change: number) => {}, 
        setPokemonStatus: teamManager.setPokemonStatus,
        updatePokemonName: teamManager.updatePokemonName,
        startEditingPokemon: teamManager.startEditingPokemon,
        cancelEditing: teamManager.cancelEditing,
        initializeBattle: battleTree.initializeBattle,
        addAction: battleTree.addAction,
        updateNode: battleTree.updateNode,
        deleteNode: battleTree.deleteNode,
        getAllPokemon,
        resetBattle: battleTree.resetBattle,
        resetBattleIfNeeded,
        getTeamCounterDisplay,
        updatePokemon: teamManager.updatePokemon,
        toggleHeldItem: teamManager.toggleHeldItem,
        toggleTerastallized: teamManager.toggleTerastallized,
        toggleMega: teamManager.toggleMega,
        isStarterPokemon: teamManager.isStarterPokemon,
        handleFlagClick: teamManager.handleFlagClick,
        getDefaultPokemonName: teamManager.getDefaultPokemonName,
        updateBattlefieldTags: teamManager.updateBattlefieldTags,
        updatePlayerSideTags: teamManager.updatePlayerSideTags,
        updateOpponentSideTags: teamManager.updateOpponentSideTags,
        togglePokemonExpansion: teamManager.togglePokemonExpansion,
        overwriteSession: saveSession
    }
  }
}
