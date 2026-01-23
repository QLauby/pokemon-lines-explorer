
"use client"

import { Pokemon } from "@/lib/types"
import { cn } from "@/lib/utils/cn"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { CircularButton } from "../shared/circular-button"
import { CustomTagsManager } from "../shared/custom-tags-manager"
import { PokemonCardDisplayAttacks } from "./pokemon-card-display/attacks"
import { PokemonCardDisplayHeader } from "./pokemon-card-display/header"
import { HealthBarDisplay } from "./pokemon-card-display/health-bar-display"
import { PokemonCardDisplayMeta } from "./pokemon-card-display/meta"
import { PokemonCardDisplayStats } from "./pokemon-card-display/stats"
import { PokemonCardDisplayStatus } from "./pokemon-card-display/status"

interface PokemonCardDisplayProps {
  pokemon: Pokemon
  mode: "deployed" | "compact"
  isMyTeam: boolean
  className?: string
}

export function PokemonCardDisplay({ 
  pokemon, 
  mode, 
  isMyTeam, 
  className 
}: PokemonCardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(mode === "deployed")
  
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm border overflow-hidden select-none relative", 
        className
      )}
    >
      <div className="absolute top-1 right-1 z-10">
          <CircularButton
            isActive={false}
            onClick={() => setIsExpanded(!isExpanded)}
            icon={!isExpanded ? ChevronDown : ChevronUp}
            activeColor="bg-transparent"
            inactiveColor="bg-transparent text-gray-400 hover:text-gray-600"
            title={!isExpanded ? "Déployer la carte" : "Réduire la carte"}
            variant="filled"
            diameter={15}
            iconRatio={0.8}
            readOnly={false}
          />
      </div>

      <div className="px-1.5 py-1 flex flex-col min-w-0 pr-5">
          <PokemonCardDisplayHeader pokemon={pokemon} />
          <PokemonCardDisplayMeta pokemon={pokemon} />
      </div>

      <div className="px-1.5 space-y-1">
        <PokemonCardDisplayStatus pokemon={pokemon} />

        {isExpanded && pokemon.customTags && pokemon.customTags.length > 0 && (
            <div className="flex flex-wrap items-center">
                <CustomTagsManager 
                    tags={pokemon.customTags}
                    onUpdateTags={() => {}}
                    fontSize={8.5}
                    label={null}
                    readOnly={true}
                />
            </div>
        )}

        <HealthBarDisplay 
            hpPercent={pokemon.hpPercent} 
            showText={true} 
            height={4} 
        />
      </div>

      {isExpanded && (
        <div className="px-1.5 pb-1.5 space-y-1.5">
            <PokemonCardDisplayStats pokemon={pokemon} />
            <PokemonCardDisplayAttacks pokemon={pokemon} />
        </div>
      )}
    </div>
  )
}
