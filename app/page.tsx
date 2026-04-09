"use client"

import { CombatView } from "@/components/battle/battle-view"
import { AppHeader } from "@/components/layout/app-header"
import BattleSessionMenu from "@/components/layout/session-menu/battle-session-menu"
import { TeamsView } from "@/components/pokemons/teams-view"
import { CorruptionProvider, useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { usePokemonBattle } from "@/lib/hooks/use-pokemon-battle"
import { updatePokemonHpPercent } from "@/lib/utils/hp-utils"
import { BattleState, CombatSession, Pokemon, TreeNode } from "@/types/types"
import { useState } from "react"



// Wrapper component to provide the context
export default function PokemonNuzlockeLines() {
  const { state, setters, actions } = usePokemonBattle()

  if (!state.currentSession) return <div>Loading...</div>

  // Wrapper for corruption provider to apply partial updates
  const handleUpdateSession = (updates: Partial<CombatSession>) => {
      if (!state.currentSession) return
      const newSession = { ...state.currentSession, ...updates }
      actions.overwriteSession(newSession)
  }

  return (
    <CorruptionProvider session={state.currentSession} onUpdateSession={handleUpdateSession}>
        <InnerContent state={state} setters={setters} actions={actions} />
    </CorruptionProvider>
  )
}

// Inner component to use the context
function InnerContent({ 
    state, 
    setters, 
    actions 
}: { 
    state: ReturnType<typeof usePokemonBattle>['state'], 
    setters: ReturnType<typeof usePokemonBattle>['setters'], 
    actions: ReturnType<typeof usePokemonBattle>['actions'] 
}) {
    const { requestModification, isCorrupted } = useCorruptionHandler()
    const [isSessionsMenuOpen, setIsSessionsMenuOpen] = useState(false)

    // Destructure all needed session actions from setters/actions/state
    const {
        sessions,
        currentSession,
    } = state

    // We need to extend the usePokemonBattle return to expose these if not already there
    // For now I'll assume they are available if I pass them through usePokemonBattle

    const handleTryChangeBattleType = (type: 'simple' | 'double') => {
        if (type === state.battleType) return
        if (!state.currentSession) return
        
        // Compute new active slots based on battle type
        const limit = type === 'double' ? 2 : 1
        const currentStarters = state.activeSlots || { myTeam: [0, 1], opponentTeam: [0, 1] }
        const newActiveSlots = {
            myTeam: currentStarters.myTeam.slice(0, limit),
            opponentTeam: currentStarters.opponentTeam.slice(0, limit)
        }
        
        // Ensure we have enough indices if expanding to double
        while (newActiveSlots.myTeam.length < limit) newActiveSlots.myTeam.push(newActiveSlots.myTeam.length)
        while (newActiveSlots.opponentTeam.length < limit) newActiveSlots.opponentTeam.push(newActiveSlots.opponentTeam.length)
        
        const isPending = requestModification('CHANGE_DEPLOYMENT', { newActiveSlots, newBattleType: type })
        if (isPending) {
             setters.setCurrentView('combat')
        }
    }

    const handleTryChangeHpMode = (mode: 'percent' | 'hp' | 'rolls') => {
        if (mode === state.hpMode) return
        // Routes through the corruption pipeline:
        requestModification('CHANGE_HP_MODE', { newHpMode: mode })
    }

    const handleRemovePokemon = (id: string, isMyTeam: boolean) => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam
        const originalIndex = team.findIndex(p => p.id === id)
        if (originalIndex === -1) return
    
        const isPending = requestModification('DELETE_POKEMON', { id, isMyTeam, originalIndex })
        if (isPending) {
             setters.setCurrentView('combat')
        }
    }

    const handleFlagClick = (index: number, isMyTeam: boolean) => {
        // Copied logic from useTeamManager to calculate new state BEFORE applying
        const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
        // @ts-ignore
        const currentActiveSlots = [...(state.activeSlots[teamKey] || [])]
        const maxSlots = state.battleType === "simple" ? 1 : 2
        
        // Check if clicked pokemon is already active
        const isActive = currentActiveSlots.includes(index)
    
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
                 return; // No-op if already active
            } else {
                 // Not active: Replace Slot 2 (Index 1)
                 newActiveSlots[1] = index
                 
                 // Ensure Slot 1 is set (defaults to 0 if null/empty and 0 isn't index)
                 if (newActiveSlots[0] === null || newActiveSlots[0] === undefined) {
                     newActiveSlots[0] = (index === 0) ? 1 : 0 // Fallback
                 }
            }
        }

        // Compute new active slots for the entire deployment
        const otherTeamKey = isMyTeam ? "opponentTeam" : "myTeam"
        const newActiveSlotsObject = {
            [teamKey]: newActiveSlots,
            [otherTeamKey]: state.activeSlots[otherTeamKey] || []
        }
        
        const isPending = requestModification('CHANGE_DEPLOYMENT', { 
            newActiveSlots: newActiveSlotsObject,
            newBattleType: state.battleType // Maintain current type for drag-drop flags
        })
        
        if (isPending) {
            setters.setCurrentView('combat')
        }
    }

    const handleMovePokemon = (id: string, isMyTeam: boolean, direction: 'up' | 'down') => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam
        const oldIndex = team.findIndex(p => p.id === id)
        if (oldIndex === -1) return

        const newIndex = direction === 'up' ? oldIndex - 1 : oldIndex + 1
        if (newIndex < 0 || newIndex >= team.length) return

        const isPending = requestModification('REORDER_POKEMON', { isMyTeam, oldIndex, newIndex })
        if (isPending) {
            setters.setCurrentView('combat')
        }
    }

    /**
     * Intercepts arbitrary Pokemon updates from team preview (HP, stats, items, etc.).
     * If any downstream node's KO trigger flips, routes through the corruption pipeline.
     * Otherwise applies the change immediately.
     */
    const handleTryUpdatePokemon = (updatedPokemon: Pokemon, isMyTeam: boolean) => {
        if (!state.currentSession) return

        const teamSide = isMyTeam ? 'myTeam' : 'enemyTeam'
        const currentTeam = state.currentSession.initialState[teamSide as 'myTeam' | 'enemyTeam']

        // Build the new initialState with updated Pokemon
        const newInitialState: BattleState = {
            ...state.currentSession.initialState,
            [teamSide]: currentTeam.map((p: any) => p.id === updatedPokemon.id ? updatedPokemon : p)
        }

        const isPending = requestModification('CHANGE_HP_AT_CHECKPOINT', {
            scope: 'initial',
            newInitialState,
            hpMode: state.hpMode
        })

        if (isPending) setters.setCurrentView('combat')
    }

    const handleTryUpdateStatus = (id: string, isMyTeam: boolean, updates: any) => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam
        const pokemon = team.find(p => p.id === id)
        if (pokemon) handleTryUpdatePokemon({ ...pokemon, ...updates }, isMyTeam)
    }

    const handleTryToggleHeldItem = (pokemonId: string, isMyTeam: boolean) => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam;
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
        handleTryUpdatePokemon(updated, isMyTeam);
    }

    const handleTryToggleTerastallized = (pokemonId: string, isMyTeam: boolean) => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam;
        const p = team.find(p => p.id === pokemonId);
        if (p) handleTryUpdatePokemon({ ...p, isTerastallized: !p.isTerastallized }, isMyTeam);
    }
    
    const handleTryToggleMega = (pokemonId: string, isMyTeam: boolean) => {
        const team = isMyTeam ? state.myTeam : state.enemyTeam;
        const p = team.find(p => p.id === pokemonId);
        if (p) handleTryUpdatePokemon({ ...p, isMega: !p.isMega }, isMyTeam);
    }

    /**
     * Intercepts node updates from the turn editor.
     * Only checks for KO corruption when:
     *   - the turnData is actually modified
     *   - the node has children (no children = no downstream to corrupt)
     * Short-circuits safely for all other update types (probability, description).
     */
    const handleTryUpdateNode = (nodeId: string, updates: Partial<TreeNode>) => {
        // Short-circuit 1: no turnData modified → apply directly, no corruption possible
        if (!updates.turnData) {
            actions.updateNode(nodeId, updates)
            return
        }

        // Short-circuit 2: node is a leaf → no descendants → apply directly
        const currentNode = state.nodes.get(nodeId)
        if (!currentNode?.children?.length) {
            actions.updateNode(nodeId, updates)
            return
        }


        const isPending = requestModification('CHANGE_HP_AT_CHECKPOINT', {
            scope: 'node',
            nodeId,
            newTurnData: updates.turnData,
            nodeUpdates: updates,
            hpMode: state.hpMode
        })

        if (isPending) {
            // Corruption banner shown, combat view is already active
        }
        // If !isPending: applyModification already applied nodeUpdates via onUpdateSession
    }

    return (
        <>
          <BattleSessionMenu 
            isOpen={isSessionsMenuOpen}
            onClose={() => setIsSessionsMenuOpen(false)}
            sessions={state.sessions}
            currentSessionId={state.currentSessionId}
            setCurrentSessionId={setters.setCurrentSessionId}
            createSession={actions.createSession}
            deleteSession={actions.deleteSession}
            duplicateSession={actions.duplicateSession}
            updateSessionName={actions.updateSessionName}
            updateSessionsOrder={actions.updateSessionsOrder}
          />
          <div className="flex-grow flex flex-col px-10 pt-6 pb-6 gap-6">
            <AppHeader
              currentView={state.currentView}
              battleType={state.battleType}
              hpMode={state.hpMode}
              battleStarted={state.battleStarted}
              onViewChange={setters.setCurrentView}
              onBattleTypeChange={handleTryChangeBattleType}
              onHpModeChange={handleTryChangeHpMode}
              onResetBattle={actions.resetBattleIfNeeded}
              onOpenSessions={() => setIsSessionsMenuOpen(true)}
              navigationDisabled={isCorrupted}
            />
      
            <div className="flex-grow flex flex-col">
              {state.currentView === "teams" ? (
                <div className="md:w-2/3 mx-auto flex-grow flex flex-col justify-center">
                  <TeamsView
                    myTeam={state.myTeam}
                    enemyTeam={state.enemyTeam}
                    battleType={state.battleType}
                    activeSlots={state.activeSlots}
                    getSlotForPokemon={state.getSlotForPokemon}
                    editingPokemonId={state.editingPokemonId}
                    editingPokemonName={state.editingPokemonName}
                    onStartEditing={actions.startEditingPokemon}
                    onUpdateName={actions.updatePokemonName}
                    onCancelEditing={actions.cancelEditing}
                    onRemove={handleRemovePokemon}
                    onUpdateHealth={actions.setPokemonHealth}
                    onUpdateStatus={handleTryUpdateStatus}
                    onUpdatePokemon={handleTryUpdatePokemon}
                    onToggleHeldItem={handleTryToggleHeldItem}
                    onToggleTerastallized={handleTryToggleTerastallized}
                    onToggleMega={handleTryToggleMega}
                    onFlagClick={handleFlagClick}
                    onAddPokemon={actions.addPokemon}
                    onMovePokemon={handleMovePokemon}
                    onBattleTypeChange={handleTryChangeBattleType} 
                    onResetBattle={actions.resetBattleIfNeeded}
                    getDefaultPokemonName={actions.getDefaultPokemonName}
                    getTeamCounterDisplay={actions.getTeamCounterDisplay}
                    isStarterPokemon={actions.isStarterPokemon}
                    battlefieldTags={state.battlefieldState.customTags}
                    playerSideTags={state.battlefieldState.playerSide.customTags}
                    opponentSideTags={state.battlefieldState.opponentSide.customTags}
                    onUpdateBattlefieldTags={actions.updateBattlefieldTags}
                    onUpdatePlayerSideTags={actions.updatePlayerSideTags}
                    onUpdateOpponentSideTags={actions.updateOpponentSideTags}
                    hpMode={state.hpMode}
                    onImportPokemon={actions.importPokemons}
                    newMyPokemonName={state.newMyPokemonName}
                    newOpponentPokemonName={state.newOpponentPokemonName}
                    setNewMyPokemonName={setters.setNewMyPokemonName}
                    setNewOpponentPokemonName={setters.setNewOpponentPokemonName}
                  />
                </div>
              ) : (
                state.battleStarted && (
                  <div className="w-full flex-grow">
                    <CombatView
                      nodes={state.nodes}
                      selectedNodeId={state.selectedNodeId}
                      onSelectedNodeChange={setters.setSelectedNodeId}
                      onResetBattle={actions.resetBattle}
                      onAddAction={actions.addAction}
                      onUpdateNode={handleTryUpdateNode}
                      onDeleteNode={actions.deleteNode}
                      myTeam={state.myTeam}
                      enemyTeam={state.enemyTeam}
                      activeSlots={state.activeSlots}
                      currentSession={state.currentSession!}
                      onCommit={() => {}} // Legacy prop, safe to ignore
                      onCancel={() => {}} // Legacy prop, safe to ignore
                      readOnly={isCorrupted}
                    />
                  </div>
                )
              )}
            </div>
          </div>
      </>
    )
}
