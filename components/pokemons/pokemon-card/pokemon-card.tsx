"use client"

import { THEME } from "@/lib/constants/color-constants";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

import { CustomTagsManager } from "@/components/shared/custom-tags-manager";
import { PokemonStatus, getStatusInfo } from "@/lib/constants/logos-constants";
import { PokemonType } from "@/lib/utils/colors-utils";
import { CustomTagData, Pokemon, StatsModifiers } from "@/types/types";
import { AttackManager } from "./sub-components/attack-manager";
import { HealthBar } from "./sub-components/health-bar";
import { PokemonCardAbilityItem } from "./sub-components/pokemon-card-ability-item";
import { PokemonCardHeader } from "./sub-components/pokemon-card-header";
import { PokemonCardTypes } from "./sub-components/pokemon-card-types";
import { StatsModifiersDisplay } from "./sub-components/stats-modifiers";
import { StatusSelector } from "./sub-components/status-selector";


interface PokemonCardProps {
  pokemon: Pokemon
  teamIndex: number
  isMyTeam: boolean
  battleType: "simple" | "double"
  isStarter: boolean
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
  onMovePokemon?: (id: string, isMyTeam: boolean, direction: "up" | "down") => void
  getSlotForPokemon: (index: number, isMyTeam: boolean) => number | null
  getDefaultPokemonName: (team: Pokemon[], teamType: "my" | "opponent") => string
  readOnly?: boolean
  isExpanded?: boolean
  isFirst?: boolean
  isLast?: boolean
  onToggleExpansion?: () => void
  hpMode?: "percent" | "hp"
}

export function PokemonCard({
  pokemon,
  teamIndex,
  isMyTeam,
  battleType,
  isStarter,
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
  onMovePokemon,
  getSlotForPokemon,
  getDefaultPokemonName,
  readOnly = false,
  isExpanded = false,
  isFirst = false,
  isLast = false,
  onToggleExpansion,
  hpMode = "percent",
}: PokemonCardProps) {
  // Use passed prop if available, otherwise local state (fallback)
  const [localExpanded, setLocalExpanded] = useState(false)
  const isCardExpanded = onToggleExpansion ? isExpanded : localExpanded
  const handleToggle = onToggleExpansion || (() => setLocalExpanded(!localExpanded))
  const isKO = pokemon.hpPercent === 0

  // State for counter animations
  const [isSleepCounterMounting, setIsSleepCounterMounting] = useState(pokemon.showSleepCounter || false)
  const [isConfusionCounterMounting, setIsConfusionCounterMounting] = useState(pokemon.showConfusionCounter || false)

  // Synchronize mounting state for animations
  if (pokemon.showSleepCounter !== isSleepCounterMounting) {
    setTimeout(() => setIsSleepCounterMounting(pokemon.showSleepCounter || false), 10)
  }
  if (pokemon.showConfusionCounter !== isConfusionCounterMounting) {
    setTimeout(() => setIsConfusionCounterMounting(pokemon.showConfusionCounter || false), 10)
  }

  const handleUpdateCustomTags = (newTags: CustomTagData[]) => {
    const updatedPokemon: Pokemon = { ...pokemon, customTags: newTags }
    onUpdatePokemon(updatedPokemon, isMyTeam)
  }

  const handleUpdateStatsModifiers = (updates: Partial<StatsModifiers>) => {
    const updatedPokemon: Pokemon = {
      ...pokemon,
      statsModifiers: {
        ...(pokemon.statsModifiers || {
          att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0
        }),
        ...updates
      }
    }
    onUpdatePokemon(updatedPokemon, isMyTeam)
  }

  const defaultName = isMyTeam 
    ? `Pokémon ${teamIndex + 1}` 
    : `Pokémon ${String.fromCharCode(65 + teamIndex)}`
  const defaultItemName = isMyTeam 
    ? `Item ${teamIndex + 1}` 
    : `Item ${String.fromCharCode(65 + teamIndex)}`
  const defaultAbilityName = isMyTeam 
    ? `Ability ${teamIndex + 1}` 
    : `Ability ${String.fromCharCode(65 + teamIndex)}`

  const handleNameChange = (newName: string) => {
    const finalName = newName.trim() || defaultName
    onUpdateName(pokemon.id, finalName, isMyTeam)
  }

  const activeStatusInfos = []
  if (pokemon.status) {
    const info = getStatusInfo(pokemon.status)
    if (info) activeStatusInfos.push(info)
  }
  // Volatile statuses are removed when withdrawn (compact mode in battle)
  const showVolatile = !readOnly || isCardExpanded
  
  if (showVolatile && pokemon.confusion) {
    const info = getStatusInfo("confusion")
    if (info) activeStatusInfos.push(info)
  }
  if (showVolatile && pokemon.love) {
    const info = getStatusInfo("love")
    if (info) activeStatusInfos.push(info)
  }

  const handleTypeChange = (index: 0 | 1, newType: PokemonType | null) => {
    const currentTypes = pokemon.types || []
    let newTypes: PokemonType[] = [...currentTypes]

    if (index === 0) {
        if (newType === null) {
             if (newTypes[1]) {
                 newTypes = [newTypes[1]]
             } else {
                 newTypes = []
             }
        } else {
             newTypes[0] = newType
        }
    } else {
        if (newType === null) {
            // Remove second type
            if (newTypes.length > 1) {
                newTypes.pop()
            }
        } else {
            if (!newTypes[0]) {
                newTypes = [newType]
            } else {
                newTypes[1] = newType
            }
            // Ensure no duplicates? Maybe not required but good practice.
            if (newTypes[0] === newTypes[1]) {
                newTypes = [newTypes[0]]
            }
        }
    }
    onUpdatePokemon({ ...pokemon, types: newTypes }, isMyTeam)
  }

  const handleTeraChange = (newType: PokemonType | null) => {
    onUpdatePokemon({ 
      ...pokemon, 
      teraType: newType || undefined, 
      isTerastallized: false 
    }, isMyTeam)
  }

  const handleItemNameChange = (newName: string) => {
      const isNewMega = newName === "Mega Stone"
      const isOldMega = pokemon.heldItemName === "Mega Stone"
      
      let updates: Partial<Pokemon> = { heldItemName: newName }
      if (isNewMega !== isOldMega) {
          updates.isMega = false
      }
      onUpdatePokemon({ ...pokemon, ...updates }, isMyTeam)
  }

  const handleAbilityNameChange = (newName: string) => {
      onUpdatePokemon({ ...pokemon, abilityName: newName }, isMyTeam)
  }

  const types = pokemon.types || []
  const teraType = pokemon.teraType || null

  const handleSleepCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdateStatus(pokemon.id, isMyTeam, { sleepCounter: numValue })
  }

  const handleConfusionCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdateStatus(pokemon.id, isMyTeam, { confusionCounter: numValue })
  }

  const handleToggleSleepCounter = () => {
    onUpdateStatus(pokemon.id, isMyTeam, { 
      showSleepCounter: !pokemon.showSleepCounter,
      sleepCounter: !pokemon.showSleepCounter ? 0 : pokemon.sleepCounter
    })
  }

  const handleToggleConfusionCounter = () => {
    onUpdateStatus(pokemon.id, isMyTeam, { 
      showConfusionCounter: !pokemon.showConfusionCounter,
      confusionCounter: !pokemon.showConfusionCounter ? 0 : pokemon.confusionCounter
    })
  }

  return (
    <div
      className={cn(
        "relative flex flex-col pt-3 pb-3 px-3 border rounded-lg transition-all duration-300",
        isKO ? "grayscale-[0.5]" : "bg-white",
        !isKO && (isStarter ? "border-2" : "border")
      )}
      style={{
          borderColor: isKO ? THEME.ko.bordeaux : (isStarter ? (isMyTeam ? THEME.common.ally : THEME.common.opponent) : THEME.battlefield.main_border),
          backgroundColor: isKO ? THEME.ko.bg : "white"
      }}
    >
        <PokemonCardHeader 
            pokemon={pokemon}
            isMyTeam={isMyTeam}
            teamIndex={teamIndex}
            isStarter={isStarter}
            battleType={battleType}
            defaultName={defaultName}
            handleNameChange={handleNameChange}
            activeStatusInfos={activeStatusInfos}
            onUpdateStatus={onUpdateStatus}
            onToggleHeldItem={onToggleHeldItem}
            onToggleMega={onToggleMega}
            onToggleTerastallized={onToggleTerastallized}
            onFlagClick={onFlagClick}
            onMovePokemon={onMovePokemon}
            onRemove={onRemove}
            getSlotForPokemon={getSlotForPokemon}
            isExpanded={isCardExpanded}
            handleToggle={handleToggle}
            readOnly={readOnly}
            isFirst={isFirst}
            isLast={isLast}
            teraType={teraType}
            isSleepCounterMounting={isSleepCounterMounting}
            isConfusionCounterMounting={isConfusionCounterMounting}
            handleSleepCounterChange={handleSleepCounterChange}
            handleConfusionCounterChange={handleConfusionCounterChange}
            handleToggleSleepCounter={handleToggleSleepCounter}
            handleToggleConfusionCounter={handleToggleConfusionCounter}
        />

         {isCardExpanded && !readOnly && (
           <PokemonCardTypes 
             types={types}
             teraType={teraType}
             handleTypeChange={handleTypeChange}
             handleTeraChange={handleTeraChange}
           />
        )}

        <PokemonCardAbilityItem 
            pokemon={pokemon}
            defaultAbilityName={defaultAbilityName}
            defaultItemName={defaultItemName}
            handleAbilityNameChange={handleAbilityNameChange}
            handleItemNameChange={handleItemNameChange}
            onToggleHeldItem={onToggleHeldItem}
            isMyTeam={isMyTeam}
            readOnly={readOnly}
            isCardExpanded={isCardExpanded}
        />
        
        {isCardExpanded && !readOnly && (
          <div className="py-2.5">
            <StatusSelector pokemon={pokemon} isMyTeam={isMyTeam} onUpdate={onUpdateStatus} />
          </div>
        )}
        {isCardExpanded && (
          <div className="py-1">
            <CustomTagsManager tags={pokemon.customTags || []} onUpdateTags={handleUpdateCustomTags} fontSize={10} readOnly={readOnly} />
          </div>
        )}
        
        <div className="py-1.5">
          <HealthBar
            pokemon={pokemon}
            isMyTeam={isMyTeam}
            onHpChange={(updated, side) => onUpdatePokemon(updated, side)}
            hpMode={hpMode}
            editable={!readOnly}
          />
        </div>
        
        {isCardExpanded && (
          <div className="py-2">
            <StatsModifiersDisplay 
                modifiers={pokemon.statsModifiers || { att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0 }}
                onUpdate={handleUpdateStatsModifiers}
                readOnly={readOnly}
            />
          </div>
        )}
        {isCardExpanded && (
          <div className="pt-1">
            <AttackManager
              pokemon={pokemon}
              onUpdate={(updatedPokemon) => onUpdatePokemon(updatedPokemon, isMyTeam)}
              isMyTeam={isMyTeam}
              readOnly={readOnly}
            />
          </div>
        )}
    </div>
  )
}
