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
      deleteSession,
      duplicateSession,
      updateSessionName,
      updateSessionsOrder,
      setBattleType,
      setHpMode,
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

    const nodesMap = new Map(currentSession.nodes.map((n: TreeNode) => [n.id, n]))
    const battleType = currentSession.battleType || "simple"
    const hpMode = (currentSession.hpMode ?? "percent") as "percent" | "hp" | "rolls"

    // Storage is already normalized, but we still need to compute the engine's internal order
    // to place active pokemons at indices 0, 1 for the simulation loop.
    const activeSlots = currentSession.initialState.activeSlots;
    const myStarters = (activeSlots.myTeam || []) as number[];
    const enemyStarters = (activeSlots.opponentTeam || []) as number[];

    const getOrder = (team: any[], starters: number[]) => {
         const activeSet = new Set(starters);
         const inactiveIndices = team.map((_, i) => i).filter(i => !activeSet.has(i));
         return [...starters, ...inactiveIndices];
    }

    const myOrder = getOrder(currentSession.initialState.myTeam, myStarters);
    const enemyOrder = getOrder(currentSession.initialState.enemyTeam, enemyStarters);

    // Prepare state for engine (active mons MUST be at indices 0, 1 for it to work)
    const engineInitialState = {
        ...currentSession.initialState,
        myTeam: myOrder.map(i => currentSession.initialState.myTeam[i]),
        enemyTeam: enemyOrder.map(i => currentSession.initialState.enemyTeam[i]),
        activeSlots: { 
            myTeam: myStarters.length > 0 ? myStarters.map((_, i) => i) : [], 
            opponentTeam: enemyStarters.length > 0 ? enemyStarters.map((_, i) => i) : [] 
        }
    }

    const engineResult = BattleEngine.computeState(engineInitialState, nodesMap, battleTree.selectedNodeId || "root", hpMode, battleType)

    // Restore original roster order for UI consistency
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
        activeSlots: { myTeam: myStarters, opponentTeam: enemyStarters }
    }

  }, [currentSession, currentView, battleTree.selectedNodeId])


  const getTeamCounterDisplay = (len: number) => `${len}/${Math.max(6, len)}`

  return {
    state: {
        currentView,
        battleType: currentSession?.battleType || "simple",
        hpMode: (currentSession?.hpMode ?? "percent") as "percent" | "hp" | "rolls",
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
        getSlotForPokemon: (idx: number, isMyTeam: boolean) => {
            const slots = (isMyTeam ? currentState.activeSlots.myTeam : currentState.activeSlots.opponentTeam) as number[];
            const slotIdx = slots.indexOf(idx);
            return slotIdx !== -1 ? slotIdx + 1 : null;
        },
        battlefieldState: currentState.battlefieldState,
        currentSession,
        sessions,
        currentSessionId,
    },
    setters: {
        setCurrentView,
        setBattleType,
        setHpMode,
        setNewMyPokemonName: teamManager.setNewMyPokemonName,
        setNewOpponentPokemonName: teamManager.setNewOpponentPokemonName,
        setSelectedNodeId: battleTree.setSelectedNodeId,
        setCurrentSessionId,
    },
    actions: {
        ...teamManager, // Keep all team management actions
        getTeamCounterDisplay,
        overwriteSession: saveSession,
        createSession,
        deleteSession,
        duplicateSession,
        updateSessionName,
        updateSessionsOrder,
        addAction: battleTree.addAction,
        updateNode: battleTree.updateNode,
        deleteNode: battleTree.deleteNode,
        resetBattle: battleTree.resetBattle,
        resetBattleIfNeeded: () => {},
        isStarterPokemon: (p: any, idx: number, isMyTeam: boolean) => {
            const slots = (isMyTeam ? currentState.activeSlots.myTeam : currentState.activeSlots.opponentTeam) as number[];
            return slots.includes(idx);
        },
        handleFlagClick: (index: number, isMyTeam: boolean) => {
            if (!currentSession) return;
            
            // Rule: Index 0 is ALWAYS active and non-toggable
            if (index === 0) return;
            
            const battleFormat = currentSession.battleType || "simple";
            if (battleFormat === "simple") return; // No toggling in simple mode

            // Double: Toggling Slot 2
            const teamKey = isMyTeam ? "myTeam" : "opponentTeam";
            const slots = [...((currentSession.initialState.activeSlots as any)?.[teamKey] || [0])];
            
            // Set as the new slot 2.
            slots[1] = index;
            
            updateInitialState({ activeSlots: { ...currentSession.initialState.activeSlots, [teamKey]: slots } as any });
        }
    }
  }
}
