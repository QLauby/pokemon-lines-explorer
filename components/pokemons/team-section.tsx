"use client"

import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportDialog } from "@/components/shared/import-dialog"

import { THEME } from "@/lib/constants/color-constants"
import { PokemonStatus } from "@/lib/constants/logos-constants"
import { Pokemon } from "@/types/types"
import { PokemonCard } from "./pokemon-card/pokemon-card"


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
  onMovePokemon: (id: string, isMyTeam: boolean, direction: "up" | "down") => void
  getDefaultPokemonName: (team: Pokemon[], teamType: "my" | "opponent") => string
  getTeamCounterDisplay: (teamLength: number) => string
  isStarterPokemon: (pokemon: Pokemon, index: number, isMyTeam: boolean) => boolean
  hpMode?: "percent" | "hp"
  onImportPokemon: (pokemons: Omit<Pokemon, "id">[], mode: "replace" | "add", isMyTeam: boolean) => void
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
  onMovePokemon,
  getDefaultPokemonName,
  getTeamCounterDisplay,
  isStarterPokemon,
  hpMode = "percent",
  onImportPokemon,
}: TeamSectionProps) {

  return (
    <Card 
      style={{ 
          backgroundColor: isMyTeam ? THEME.common.ally_bg + "33" : THEME.common.opponent_bg + "33",
          borderColor: isMyTeam ? THEME.common.ally_bg + "80" : THEME.common.opponent_bg + "80"
      }}
      className="shadow-sm transition-all hover:shadow-md border rounded-xl"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-2 leading-7 text-xl font-bold"
            style={{ color: isMyTeam ? THEME.common.ally_text : THEME.common.opponent_text }}
          >
            {title}
            <Badge 
              variant="secondary" 
              className="font-bold bg-white/50"
              style={{ color: isMyTeam ? THEME.common.ally_text : THEME.common.opponent_text }}
            >
              {getTeamCounterDisplay(team.length)}
            </Badge>
          </CardTitle>
          <ImportDialog
            isMyTeam={isMyTeam}
            hpMode={hpMode}
            currentTeamSize={team.length}
            onImport={(pokemons, mode) => onImportPokemon(pokemons, mode, isMyTeam)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {team.map((pokemon, originalIndex) => {
             return (
              <PokemonCard
                key={pokemon.id}
                pokemon={pokemon}
                teamIndex={originalIndex}
                isMyTeam={isMyTeam}
                battleType={battleType}
                isStarter={isStarterPokemon(pokemon, originalIndex, isMyTeam)}
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
                onMovePokemon={onMovePokemon}
                getSlotForPokemon={getSlotForPokemon}
                getDefaultPokemonName={getDefaultPokemonName}
                hpMode={hpMode}
                isFirst={originalIndex === 0}
                isLast={originalIndex === team.length - 1}
              />
            )
          })}

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPokemon(isMyTeam ? "my" : "opponent")}
            className="h-9 text-xs w-full bg-white/40 hover:bg-white/60 border-2 cursor-pointer transition-all"
            style={{ 
                color: isMyTeam ? THEME.common.ally_text : THEME.common.opponent_text,
                borderColor: isMyTeam ? THEME.common.ally_bg : THEME.common.opponent_bg
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pokemon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
