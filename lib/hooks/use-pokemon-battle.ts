import { BattleState, TreeNode } from "@/types/types"
import { useMemo } from "react"
import { BattleEngine } from "../logic/battle-engine"
import { useBattleSession } from "./use-battle-storage/features/use-battle-session"
import { useBattleTree } from "./use-battle-storage/features/use-battle-tree"
import { useTeamManager } from "./use-battle-storage/features/use-team-manager"

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
        activeSlots: { myTeam: [0, 1], opponentTeam: [0, 1] },
        battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } },
      }
    }

    if (currentView === "teams") {
      return currentSession.initialState
    }

    // Convert nodes array to Map for Engine
    const nodesMap = new Map(currentSession.nodes.map((n: TreeNode) => [n.id, n]))
    
    // helper: generate order array [active..., inactive...]
    const getOrder = (team: any[], starters: (number | null)[]) => {
         const activeIndices = starters.filter(i => i !== null && i !== undefined && i < team.length && i >= 0) as number[];
         const activeSet = new Set(activeIndices);
         const inactiveIndices = team.map((_, i) => i).filter(i => !activeSet.has(i));
         return [...activeIndices, ...inactiveIndices];
    }

    const activeSlots = currentSession.initialState.activeSlots || (currentSession.initialState as any).activeStarters || { myTeam: [0, 1], opponentTeam: [0, 1] }

    const myOrder = getOrder(currentSession.initialState.myTeam, activeSlots.myTeam);
    const enemyOrder = getOrder(currentSession.initialState.enemyTeam, activeSlots.opponentTeam);

    // Prepare state for engine (active mons at 0, 1)
    const engineInitialState = {
        ...currentSession.initialState,
        myTeam: myOrder.map(i => currentSession.initialState.myTeam[i]),
        enemyTeam: enemyOrder.map(i => currentSession.initialState.enemyTeam[i]),
        activeSlots: { myTeam: [0, 1], opponentTeam: [0, 1] } // Mock consistent starters for engine
    }

    const engineResult = BattleEngine.computeState(engineInitialState, nodesMap, battleTree.selectedNodeId || "root")

    // Restore original order
    const restoreTeam = (computedTeam: any[], order: number[]) => {
        const restored = new Array(computedTeam.length);
        order.forEach((originalIndex, computedIndex) => {
            restored[originalIndex] = computedTeam[computedIndex];
        });
        return restored;
    }

    return {
        ...engineResult,
        myTeam: restoreTeam(engineResult.myTeam, myOrder),
        enemyTeam: restoreTeam(engineResult.enemyTeam, enemyOrder),
        activeSlots: activeSlots // Restore original starters
    }

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
        activeSlots: currentState.activeSlots,
        getSlotForPokemon: teamManager.getSlotForPokemon,
        battlefieldState: currentState.battlefieldState,
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
        overwriteSession: saveSession
    }
  }
}
