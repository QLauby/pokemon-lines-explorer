"use client"

import { CombatView } from "@/components/battle/battle-view"
import { AppHeader } from "@/components/layout/app-header"
import { TeamsView } from "@/components/pokemons/teams-view"
import { CorruptionProvider, useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { usePokemonBattle } from "@/lib/hooks/use-pokemon-battle"
import { CombatSession } from "@/types/types"



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
        
        const isPending = requestModification('CHANGE_DEPLOYMENT', { newActiveSlots })
        if (isPending) {
             setters.setCurrentView('combat')
        }
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
            newActiveSlots: newActiveSlotsObject
        })
        
        if (isPending) {
            setters.setCurrentView('combat')
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
          <AppHeader
            currentView={state.currentView}
            battleType={state.battleType}
            battleStarted={state.battleStarted}
            onViewChange={setters.setCurrentView}
            onBattleTypeChange={handleTryChangeBattleType}
            onResetBattle={actions.resetBattleIfNeeded}
            navigationDisabled={isCorrupted}
          />
    
          {state.currentView === "teams" ? (
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
              onRemove={handleRemovePokemon} // Use intercepted handler
              onUpdateHealth={actions.setPokemonHealth}
              onUpdateStatus={actions.setPokemonStatus}
              onUpdatePokemon={actions.updatePokemon}
              onToggleHeldItem={actions.toggleHeldItem}
              onToggleTerastallized={actions.toggleTerastallized}
              onToggleMega={actions.toggleMega}
              onFlagClick={handleFlagClick}
              onAddPokemon={actions.addPokemon}
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
            />
    
          ) : (
            state.battleStarted && (
              <CombatView
                nodes={state.nodes}
                selectedNodeId={state.selectedNodeId}
                onSelectedNodeChange={setters.setSelectedNodeId}
                onResetBattle={actions.resetBattle}
                onAddAction={actions.addAction}
                onUpdateNode={actions.updateNode}
                onDeleteNode={actions.deleteNode}
                myTeam={state.myTeam}
                enemyTeam={state.enemyTeam}
                activeSlots={state.activeSlots}
                currentSession={state.currentSession!}
                onCommit={() => {}} // Legacy prop, safe to ignore
                onCancel={() => {}} // Legacy prop, safe to ignore
                readOnly={isCorrupted}
              />
            )
          )}
        </div>
      )
}
