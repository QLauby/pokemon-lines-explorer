import { THEME } from "@/lib/constants/color-constants"
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
  hpMode?: "percent" | "hp"
}

export function PokemonCardDisplay({ 
  pokemon, 
  mode, 
  isMyTeam, 
  className,
  hpMode = "percent" 
}: PokemonCardDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(mode === "deployed")
  const isKO = pokemon.hpPercent === 0
  const hpMax = pokemon.hpMax ?? 100
  const hpCurrent = pokemon.hpCurrent ?? Math.round(pokemon.hpPercent * hpMax / 100)

  return (
    <div 
      className={cn(
        "rounded-lg shadow-sm border overflow-hidden select-none relative", 
        isKO ? "text-slate-600 grayscale-[0.5]" : "bg-white",
        className
      )}
      style={isKO ? { borderColor: THEME.ko.bordeaux, backgroundColor: THEME.ko.bg } : undefined}
    >
      <div className="absolute top-1 right-1 z-10">
          <CircularButton
            isActive={false}
            onClick={() => setIsExpanded(!isExpanded)}
            icon={!isExpanded ? ChevronDown : ChevronUp}
            activeColor="bg-transparent"
            inactiveColor={cn(
                "bg-transparent",
                isKO ? "text-slate-500 hover:text-slate-700" : "text-slate-400 hover:text-slate-600"
            )}
            title={!isExpanded ? "Déployer la carte" : "Réduire la carte"}
            variant="filled"
            diameter={15}
            iconRatio={0.8}
            readOnly={false}
          />
      </div>

      <div className="p-1.5 flex flex-col min-w-0 space-y-1.5">
        <div className="flex flex-col min-w-0">
            <div className="pr-5">
                <PokemonCardDisplayHeader pokemon={pokemon} />
            </div>
            <PokemonCardDisplayMeta pokemon={pokemon} />
        </div>

        <div className="space-y-1">
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
              hpMode={hpMode}
              hpMax={hpMax}
              hpCurrent={hpCurrent}
              showText={true} 
              height={4} 
          />
        </div>

        {(() => {
          const hasStats = pokemon.statsModifiers && Object.values(pokemon.statsModifiers).some(val => val !== 0)
          const hasAttacks = pokemon.attacks && pokemon.attacks.length > 0
          const hasContent = hasStats || hasAttacks

          if (isExpanded && hasContent) {
            return (
              <div className="space-y-1.5">
                  <PokemonCardDisplayStats pokemon={pokemon} />
                  <PokemonCardDisplayAttacks pokemon={pokemon} />
              </div>
            )
          }
          return null
        })()}
      </div>
    </div>
  )
}
