"use client"


import { Button } from "@/components/ui/button"
import { PokemonStatus } from "@/lib/constants/logos-constants"
import { Pokemon } from "@/types/types"

import { BattlefieldZone } from "./battlefield-zone"
import { TeamSection } from "./team-section"


interface TeamsViewProps {
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  battleType: "simple" | "double"
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  getSlotForPokemon: (index: number, isMyTeam: boolean) => number | null
  editingPokemonId: string | null
  editingPokemonName: string
  onStartEditing: (pokemon: Pokemon) => void
  onUpdateName: (pokemonId: string, newName: string, isMyTeam: boolean) => void
  onCancelEditing: () => void
  onRemove: (id: string, isMyTeam: boolean) => void
  onUpdateHealth: (id: string, isMyTeam: boolean, newHP: number) => void
  onUpdateStatus: (
    id: string,
    isMyTeam: boolean,
    updates: {
      status?: PokemonStatus
      confusion?: boolean
      love?: boolean
      sleepCounter?: number
      confusionCounter?: number
      showSleepCounter?: boolean
      showConfusionCounter?: boolean
    },
  ) => void
  onUpdatePokemon: (updatedPokemon: Pokemon, isMyTeam: boolean) => void
  onToggleHeldItem: (pokemonId: string, isMyTeam: boolean) => void
  onToggleTerastallized: (pokemonId: string, isMyTeam: boolean) => void
  onToggleMega: (pokemonId: string, isMyTeam: boolean) => void
  onFlagClick: (index: number, isMyTeam: boolean) => void
  onAddPokemon: (teamType: "my" | "opponent") => void
  onBattleTypeChange: (type: "simple" | "double") => void
  onResetBattle: () => void
  getDefaultPokemonName: (team: Pokemon[], teamType: "my" | "opponent") => string
  getTeamCounterDisplay: (teamLength: number) => string
  isStarterPokemon: (pokemon: Pokemon, index: number, isMyTeam: boolean) => boolean
  battlefieldTags: string[]
  playerSideTags: string[]
  opponentSideTags: string[]
  onUpdateBattlefieldTags: (tags: string[]) => void
  onUpdatePlayerSideTags: (tags: string[]) => void
  onUpdateOpponentSideTags: (tags: string[]) => void
}

export function TeamsView({
  myTeam,
  enemyTeam,
  battleType,
  activeSlots,
  getSlotForPokemon,
  editingPokemonId,
  editingPokemonName,
  onStartEditing,
  onUpdateName,
  onCancelEditing,
  onRemove,
  onUpdateHealth,
  onUpdateStatus,
  onUpdatePokemon,
  onToggleHeldItem,
  onToggleTerastallized,
  onToggleMega,
  onFlagClick,
  onAddPokemon,
  onBattleTypeChange,
  onResetBattle,
  getDefaultPokemonName,
  getTeamCounterDisplay,
  isStarterPokemon,
  battlefieldTags,
  playerSideTags,
  opponentSideTags,
  onUpdateBattlefieldTags,
  onUpdatePlayerSideTags,
  onUpdateOpponentSideTags,
}: TeamsViewProps) {

  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="flex gap-2">
          <Button
            variant={battleType === "simple" ? "default" : "ghost"}
            size="lg"
            onClick={() => {
              onBattleTypeChange("simple")
              onResetBattle()
            }}
            className="rounded-md text-base"
          >
            Single battle
          </Button>
          <Button
            variant={battleType === "double" ? "default" : "ghost"}
            size="lg"
            onClick={() => {
              onBattleTypeChange("double")
              onResetBattle()
            }}
            className="rounded-md text-base"
          >
            Double battle
          </Button>
        </div>
      </div>

      <BattlefieldZone
        battlefieldTags={battlefieldTags}
        playerSideTags={playerSideTags}
        opponentSideTags={opponentSideTags}
        onUpdateBattlefieldTags={onUpdateBattlefieldTags}
        onUpdatePlayerSideTags={onUpdatePlayerSideTags}
        onUpdateOpponentSideTags={onUpdateOpponentSideTags}
      />

      <div className="grid md:grid-cols-2 gap-6 md:w-2/3 mx-auto">
        <TeamSection
          team={myTeam}
          title="Mon Équipe"
          isMyTeam={true}
          battleType={battleType}
          getSlotForPokemon={getSlotForPokemon}
          editingPokemonId={editingPokemonId}
          editingPokemonName={editingPokemonName}
          onStartEditing={onStartEditing}
          onUpdateName={onUpdateName}
          onCancelEditing={onCancelEditing}
          onRemove={onRemove}
          onUpdateHealth={onUpdateHealth}
          onUpdateStatus={onUpdateStatus}
          onUpdatePokemon={onUpdatePokemon}
          onToggleHeldItem={onToggleHeldItem}
          onToggleTerastallized={onToggleTerastallized}
          onToggleMega={onToggleMega}
          onFlagClick={onFlagClick}
          onAddPokemon={onAddPokemon}
          getDefaultPokemonName={getDefaultPokemonName}
          getTeamCounterDisplay={getTeamCounterDisplay}
          isStarterPokemon={isStarterPokemon}
        />

        <TeamSection
          team={enemyTeam}
          title="Équipe Adverse"
          isMyTeam={false}
          battleType={battleType}
          getSlotForPokemon={getSlotForPokemon}
          editingPokemonId={editingPokemonId}
          editingPokemonName={editingPokemonName}
          onStartEditing={onStartEditing}
          onUpdateName={onUpdateName}
          onCancelEditing={onCancelEditing}
          onRemove={onRemove}
          onUpdateHealth={onUpdateHealth}
          onUpdateStatus={onUpdateStatus}
          onUpdatePokemon={onUpdatePokemon}
          onToggleHeldItem={onToggleHeldItem}
          onToggleTerastallized={onToggleTerastallized}
          onToggleMega={onToggleMega}
          onFlagClick={onFlagClick}
          onAddPokemon={onAddPokemon}
          getDefaultPokemonName={getDefaultPokemonName}
          getTeamCounterDisplay={getTeamCounterDisplay}
          isStarterPokemon={isStarterPokemon}
        />
      </div>
    </>
  )
}
