
"use client"

import { KO_BG_COLOR, KO_BORDEAUX } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils/cn"
import { Pokemon } from "@/types/types"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { CircularButton } from "../../shared/circular-button"
import { CustomTagsManager } from "../../shared/custom-tags-manager"
import { PokemonCardDisplayAttacks } from "./sub-components/attacks"
import { PokemonCardDisplayHeader } from "./sub-components/header"
import { HealthBarDisplay } from "./sub-components/health-bar-display"
import { PokemonCardDisplayMeta } from "./sub-components/meta"
import { PokemonCardDisplayStats } from "./sub-components/stats"
import { PokemonCardDisplayStatus } from "./sub-components/status"

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
  const isKO = pokemon.hpPercent === 0

  return (
    <div 
      className={cn(
        "rounded-lg shadow-sm border overflow-hidden select-none relative", 
        isKO ? "text-gray-600 grayscale-[0.5]" : "bg-white",
        className
      )}
      style={isKO ? { borderColor: KO_BORDEAUX, backgroundColor: KO_BG_COLOR } : undefined}
    >
      <div className="absolute top-1 right-1 z-10">
          <CircularButton
            isActive={false}
            onClick={() => setIsExpanded(!isExpanded)}
            icon={!isExpanded ? ChevronDown : ChevronUp}
            activeColor="bg-transparent"
            inactiveColor={cn(
                "bg-transparent",
                isKO ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-600"
            )}
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
        {!isKO && <PokemonCardDisplayStatus pokemon={pokemon} />}

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
