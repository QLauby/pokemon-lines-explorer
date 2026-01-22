"use client"

import { StarBadgeIcon } from "@/assets/badges/star-badge"
import MegaColored from "@/assets/logos/mega/mega-colored.svg"
import { pokemonTypeColors } from "@/lib/colors"
import { getStatusInfo, POKEMON_LOGOS } from "@/lib/logos"
import { Pokemon } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Eye, Shield, ShoppingBag, Sparkles, Sword, Target, Wind } from "lucide-react"
import Image from "next/image"
import { CircularButton } from "../shared/circular-button"
import { CustomTagsManager } from "../shared/custom-tags-manager"
import { HealthBarDisplay } from "./health-bar-display"

const MegaColoredIcon = ({ size, className }: { size?: number; className?: string }) => (
  <Image
    src={MegaColored}
    width={size}
    height={size}
    className={className}
    alt="Mega Evolution"
  />
);

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
  
  const types = pokemon.types || []
  const nameLiseretBackground = pokemon.isTerastallized && pokemon.teraType 
    ? pokemonTypeColors[pokemon.teraType]
    : types.length === 1 
      ? pokemonTypeColors[types[0]] 
      : types.length > 1
        ? `linear-gradient(135deg, ${pokemonTypeColors[types[0]]} 50%, ${pokemonTypeColors[types[1]]} 50%)`
        : "#ccc"

  const statusInfos = []
  if (pokemon.status) {
    const info = getStatusInfo(pokemon.status)
    if (info) statusInfos.push(info)
  }
  if (pokemon.confusion) {
    const info = getStatusInfo("confusion")
    if (info) statusInfos.push(info)
  }
  if (pokemon.love) {
    const info = getStatusInfo("love")
    if (info) statusInfos.push(info)
  }

  // Helper for Stats
  const renderStat = (label: string, value: number, icon: any) => {
    if (value === 0) return null
    return (
      <div className="flex items-center gap-1 text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">
        <span className={value > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
            {value > 0 ? "+" : ""}{value}
        </span>
        <span className="text-gray-500 uppercase">{label}</span>
      </div>
    )
  }

  const defaultName = pokemon.name || "Pokémon"

  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm border overflow-hidden select-none", 
        className
      )}
    >
      <div className="px-1.5 py-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between gap-1 h-3.5">
             <div className="flex items-center gap-1 min-w-0 h-full">
                {types.length > 0 && (
                  <div 
                    className="w-1 h-full rounded-full shrink-0" 
                    style={{ 
                      background: types.length === 1 
                        ? pokemonTypeColors[types[0]] 
                        : `linear-gradient(180deg, ${pokemonTypeColors[types[0]]} 50%, ${pokemonTypeColors[types[1]]} 50%)`
                    }}
                  />
                )}
                <span className="font-bold text-[11px] truncate h-full flex items-center" title={pokemon.name}>
                   {pokemon.name}
                </span>
             </div>
             <div className="flex items-center gap-0.5 shrink-0 h-full">
                {pokemon.isTerastallized && pokemon.teraType && (
                    <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
                      <StarBadgeIcon
                        className="absolute inset-0 w-full h-full"
                        style={{ color: pokemonTypeColors[pokemon.teraType] }}
                      />
                      <div className="relative z-10 flex items-center justify-center w-full h-full scale-[0.65]">
                        <Image
                          src={POKEMON_LOGOS[pokemon.teraType]}
                          alt={pokemon.teraType}
                          width={6}
                          height={6}
                          className="brightness-0 invert opacity-100"
                        />
                      </div>
                    </div>
                )}
                {pokemon.isMega && (
                    <CircularButton
                      isActive={true}
                      onClick={() => {}}
                      icon={MegaColoredIcon}
                      activeColor="bg-transparent"
                      title="Méga-Évolution active"
                      variant="outlined"
                      diameter={13}
                      iconRatio={0.9}
                      readOnly={true}
                    />
                )}
             </div>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-gray-400 truncate leading-tight mt-0.5">
             {pokemon.abilityName && (
                <span className="truncate text-gray-500">{pokemon.abilityName}</span>
             )}
             {pokemon.abilityName && pokemon.heldItem && (
                <span className="shrink-0 opacity-50">•</span>
             )}
             {pokemon.heldItem && (
                <div className="flex items-center gap-1 min-w-0">
                   {pokemon.heldItemName === "Mega Stone" ? (
                      <MegaColoredIcon size={9} className="shrink-0" />
                   ) : (
                      <ShoppingBag className="w-2.2 h-2.2 shrink-0 opacity-70" />
                   )}
                   <span className="truncate text-gray-500">{pokemon.heldItemName || "Objet"}</span>
                </div>
             )}
          </div>
      </div>

      <div className="px-1.5 space-y-1">
        {statusInfos.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
               {statusInfos.map(info => {
                   const counter = 
                      info.type === "sleep" ? pokemon.sleepCounter : 
                      info.type === "confusion" ? pokemon.confusionCounter : 
                      undefined;

                   return (
                      <div key={info.title} className="flex items-center">
                          <CircularButton
                              isActive={true}
                              onClick={() => {}}
                              icon={info.icon}
                              activeColor={info.activeColor}
                              title={info.title}
                              variant="filled"
                              diameter={14}
                              iconRatio={0.7}
                              readOnly={true}
                          />
                          {counter !== undefined && counter > 0 && (
                              <div className="flex items-center">
                                  <div 
                                      className="font-medium text-gray-400 select-none flex items-center justify-center translate-y-[-0.5px]" 
                                      style={{ fontSize: 8.5, height: 14.16, width: "8px" }}
                                  >
                                      :
                                  </div>
                                  <div 
                                      className="font-medium text-gray-900 select-none flex items-center justify-center translate-y-[-0.5px]"
                                      style={{ fontSize: 8.5, height: 14.16 }}
                                  >
                                      {counter}
                                  </div>
                              </div>
                          )}
                      </div>
                   )
               })}
            </div>
        )}

        {mode === "deployed" && pokemon.customTags && pokemon.customTags.length > 0 && (
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

      {mode === "deployed" && (
        <div className="px-1.5 pb-1.5 space-y-1.5">
            
            {pokemon.statsModifiers && (() => {
                const sm = pokemon.statsModifiers!;
                return (
                    <div className="flex flex-wrap gap-0.5">
                        {renderStat("Att", sm.att, Sword)}
                        {renderStat("Def", sm.def, Shield)}
                        {renderStat("SpA", sm.spa, Sparkles)}
                        {renderStat("SpD", sm.spd, Shield)}
                        {renderStat("Spe", sm.spe, Wind)}
                        {renderStat("Acc", sm.acc, Target)}
                        {renderStat("Eva", sm.ev, Eye)}
                        {renderStat("Crit", sm.crit, Target)}
                    </div>
                );
            })()}

            {pokemon.attacks.length > 0 && (
                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t">
                    {pokemon.attacks.map((attack, idx) => (
                        <div key={idx} className="flex items-center bg-gray-50 rounded px-1 py-0.5 box-border min-h-[28px]">
                            <div className="flex flex-col min-w-0 leading-none">
                                <div className="flex items-center gap-1 h-3">
                                    {attack.type && (
                                         <div 
                                            className="w-0.5 h-full rounded-full shrink-0" 
                                            style={{ backgroundColor: pokemonTypeColors[attack.type] }}
                                         />
                                    )}
                                    <span className="text-[9px] font-medium truncate" title={attack.name}>{attack.name}</span>
                                </div>
                                <div className="text-[7.5px] text-gray-500 pl-[6px]">
                                    {attack.currentPP}/{attack.maxPP} PP
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  )
}
