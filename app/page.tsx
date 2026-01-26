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

  return (
    <CorruptionProvider session={state.currentSession}>
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
    const { updatePendingParams, pendingSession, isCorrupted } = useCorruptionHandler()

    const handleTryChangeBattleType = (type: 'simple' | 'double') => {
        if (type === state.battleType) return
    
        const hasHistory = state.nodes.size > 1 
    
        if (!hasHistory) {
          setters.setBattleType(type)
        } else {
          // Corruption detected
          updatePendingParams({ battleType: type })
          setters.setCurrentView('combat')
        }
    }



    const handleCommitCorruption = (newSession: CombatSession) => {
        actions.overwriteSession(newSession)
    }

    const handleCancelCorruption = () => {
        setters.setCurrentView('teams')
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
              activeStarters={state.activeStarters}
              getSlotForPokemon={state.getSlotForPokemon}
              editingPokemonId={state.editingPokemonId}
              editingPokemonName={state.editingPokemonName}
              onStartEditing={actions.startEditingPokemon}
              onUpdateName={actions.updatePokemonName}
              onCancelEditing={actions.cancelEditing}
              onRemove={actions.removePokemon}
              onUpdateHealth={actions.setPokemonHealth}
              onUpdateStatus={actions.setPokemonStatus}
              onUpdatePokemon={actions.updatePokemon}
              onToggleHeldItem={actions.toggleHeldItem}
              onToggleTerastallized={actions.toggleTerastallized}
              onToggleMega={actions.toggleMega}
              onFlagClick={actions.handleFlagClick}
              onAddPokemon={actions.addPokemon}
              onInitializeBattle={actions.initializeBattle}
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
              expandedPokemonIds={state.expandedPokemonIds}
              onToggleExpansion={actions.togglePokemonExpansion}
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
                activeStarters={state.activeStarters}
                currentSession={state.currentSession!}
                onCommit={handleCommitCorruption}
                onCancel={handleCancelCorruption}
              />
            )
          )}
        </div>
      )
}
