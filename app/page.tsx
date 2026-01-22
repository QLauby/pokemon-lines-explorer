"use client"

import { CombatView } from "@/components/battle/battle-view"
import { AppHeader } from "@/components/layout/app-header"
import { TeamsView } from "@/components/pokemons/teams-view"
import { usePokemonBattle } from "@/lib/hooks/use-pokemon-battle"

export default function PokemonNuzlockeLines() {
  const { state, setters, actions } = usePokemonBattle()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader
        currentView={state.currentView}
        battleType={state.battleType}
        battleStarted={state.battleStarted}
        onViewChange={setters.setCurrentView}
        onBattleTypeChange={setters.setBattleType}
        onResetBattle={actions.resetBattleIfNeeded}
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
          onBattleTypeChange={setters.setBattleType}
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
            scrollX={state.scrollX}
            actionDescription={state.actionDescription}
            actionProbability={state.actionProbability}
            hpChanges={state.hpChanges}
            onSelectedNodeChange={setters.setSelectedNodeId}
            onScrollChange={actions.handleScroll}
            onResetBattle={actions.resetBattle}
            onActionDescriptionChange={setters.setActionDescription}
            onActionProbabilityChange={setters.setActionProbability}
            onHpChangesChange={setters.setHpChanges}
            onAddAction={actions.addAction}
            myTeam={state.myTeam}
            enemyTeam={state.enemyTeam}
            currentSession={state.currentSession!}
          />
        )
      )}
    </div>
  )
}
