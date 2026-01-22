"use client"

import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { PokemonStatus } from "@/lib/logos"
import { Pokemon } from "@/lib/types"
import { PokemonCard } from "./pokemon-card"


interface TeamSectionProps {
  team: Pokemon[]
  title: string
  isMyTeam: boolean
  battleType: "simple" | "double"
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
  getDefaultPokemonName: (team: Pokemon[], teamType: "my" | "opponent") => string
  getTeamCounterDisplay: (teamLength: number) => string
  isStarterPokemon: (pokemon: Pokemon, index: number, isMyTeam: boolean) => boolean
  expandedPokemonIds?: string[]
  onToggleExpansion?: (id: string) => void
}


export function TeamSection({
  team,
  title,
  isMyTeam,
  battleType,
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
  getDefaultPokemonName,
  getTeamCounterDisplay,
  isStarterPokemon,
  expandedPokemonIds,
  onToggleExpansion,
}: TeamSectionProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 leading-7 text-xl">
          {title}
          <Badge variant="secondary">{getTeamCounterDisplay(team.length)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {team.map((pokemon, teamIndex) => (
          <PokemonCard
            key={pokemon.id}
            pokemon={pokemon}
            teamIndex={teamIndex}
            isMyTeam={isMyTeam}
            battleType={battleType}
            isStarter={isStarterPokemon(pokemon, teamIndex, isMyTeam)}
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
            getSlotForPokemon={getSlotForPokemon}
            getDefaultPokemonName={getDefaultPokemonName}
            isExpanded={expandedPokemonIds?.includes(pokemon.id)}
            onToggleExpansion={() => onToggleExpansion?.(pokemon.id)}
          />

        ))}

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPokemon(isMyTeam ? "my" : "opponent")}
            className="h-8 text-sm w-full bg-transparent cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un pokémon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
