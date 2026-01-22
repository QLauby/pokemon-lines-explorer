"use client"

import { ChevronDown, ChevronUp, ShoppingBag, Swords, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { StarBadgeIcon } from "@/assets/badges/star-badge";
import MegaColored from "@/assets/logos/mega/mega-colored.svg";
import { PokemonType, pokemonTypeColors } from "@/lib/colors";
import { getStatusInfo, POKEMON_LOGOS, PokemonStatus } from "@/lib/logos";
import { Pokemon, StatsModifiers } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { CircularButton } from "../shared/circular-button";
import { CustomTagsManager } from "../shared/custom-tags-manager";
import { EditableText } from "../shared/editable-text";
import { AttackManager } from "./attack-manager";
import { HealthBar } from "./health-bar";
import { PokemonTypeDropdown } from "./pokemon-type-dropdown";
import { StatsModifiersDisplay } from "./stats-modifiers";
import { StatusSelector } from "./status-selector";

const MegaColoredIcon = ({ size, className }: { size?: number; className?: string }) => (
  <Image
    src={MegaColored}
    width={size}
    height={size}
    className={className}
    alt="Mega Evolution"
  />
);

const MegaUniIcon = ({ size, className }: { size?: number; className?: string }) => (
  <svg 
    viewBox="0 0 1000 1000" 
    width={size} 
    height={size} 
    className={cn(className, "grayscale opacity-50")}
  >
    <g transform="translate(-1731.5 -611)">
      <path 
        d="M2189.72 1287.47 2200.98 1302.92C2232.97 1351.02 2242.58 1381.01 2252.44 1445.14 2303 1427.12 2353.47 1399.79 2392.01 1369.39L2403.18 1359.18 2365.94 1349.86C2324.17 1338.31 2280.34 1323.99 2237.09 1307.28ZM1974.62 1027.3 1974.86 1035.42C1980.17 1060.98 1991.14 1081.6 2006 1100.67L2023.07 1119.69 2034.66 1126.07C2153.05 1187.98 2298.74 1245.8 2430.66 1285.25L2457.16 1292.69 2470.69 1264.92 2478.93 1237.5 2467.31 1233.88C2331.24 1189.89 2122.4 1101.97 1996.3 1038.46ZM2032.79 887.962 2021.47 899.327C2015.27 906.16 2008.9 913.941 2002.91 922.804L1994.73 937.911 2002.58 942.994C2097.04 1001.84 2269.74 1083.37 2431.79 1134.04L2475.53 1146.4 2466.87 1127.66C2455.46 1108 2441.51 1091.04 2431.79 1080.37 2429.49 1077.84 2425.76 1074.07 2420.91 1069.31L2420.46 1068.87 2407.79 1064.3C2306.39 1026.25 2116.95 937.661 2036.77 890.414ZM2211.22 776.754C2194.46 781.703 2163.03 796.688 2130.6 815.44L2100.4 834.549 2134.64 855.105C2159.06 868.989 2183.95 882.304 2209.06 894.681L2279.83 926.388 2266.32 909.584C2229.56 858.981 2227.94 838.401 2211.22 776.754ZM2281.57 657.502C2279.68 737.942 2283.72 786.391 2324 854.134 2364.29 921.878 2477.64 1004.78 2523.28 1063.96 2565.33 1118.49 2583.26 1186.3 2579.71 1222.52 2569.95 1322.17 2541.37 1352.22 2471.34 1409.24 2401.3 1466.26 2278.77 1524.62 2159.49 1564.63 2166 1521.13 2182.03 1438.63 2136.04 1370.14 2059.62 1256.34 1981.3 1217.73 1939.06 1155.54 1896.82 1093.34 1879.08 1033.2 1882.62 996.982 1892.39 897.333 1955.12 838.712 1991 810.259 2094.93 724.779 2206.38 681.746 2281.57 657.502Z" 
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
        fillRule="evenodd"
      />
    </g>
  </svg>
);


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
    },
  ) => void
  onUpdatePokemon: (updatedPokemon: Pokemon, isMyTeam: boolean) => void
  onToggleHeldItem: (pokemonId: string, isMyTeam: boolean) => void
  onToggleTerastallized: (pokemonId: string, isMyTeam: boolean) => void
  onToggleMega: (pokemonId: string, isMyTeam: boolean) => void
  onFlagClick: (index: number, isMyTeam: boolean) => void
  getSlotForPokemon: (index: number, isMyTeam: boolean) => number | null
  getDefaultPokemonName: (team: Pokemon[], teamType: "my" | "opponent") => string
  readOnly?: boolean
  defaultCollapsed?: boolean
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
  getSlotForPokemon,
  getDefaultPokemonName,
  readOnly = false,
  defaultCollapsed = true,
}: PokemonCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const handleUpdateCustomTags = (newTags: string[]) => {
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
  const showVolatile = !readOnly || !isCollapsed
  
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
  const teraType = pokemon.teraType || null // Allow null/undefined to show None

  return (
    <div
      className={cn(
        "relative flex flex-col pt-3 pb-3 px-3 border rounded-lg transition-all duration-300",
        isStarter ? (isMyTeam ? "border-blue-500 border-2" : "border-red-500 border-2") : "border-gray-200"
      )}
    >
        {/* Toggle Collapse Button */}
        <div className="absolute top-1 right-1 z-20">
          <CircularButton
            isActive={false}
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? ChevronDown : ChevronUp}
            activeColor="bg-transparent"
            inactiveColor={cn(
              "bg-transparent",
              isStarter 
                ? (isMyTeam ? "text-blue-500" : "text-red-500") 
                : "text-gray-400 hover:text-gray-600"
            )}
            title={isCollapsed ? "Déployer la carte" : "Réduire la carte"}
            variant="filled"
            diameter={15}
            iconRatio={0.8}
            readOnly={false} // Always interactable for folding/unfolding
          />
        </div>
        {/* Row 1: Name, Status selector (battle), Trash */}
        <div className="flex justify-between items-center text-sm py-0.5">
          <div className="flex-1 mr-2 h-6 flex items-center min-w-0">
            {types.length > 0 && (
              <div 
                className="w-1 h-full mr-1.5 rounded-full shrink-0" 
                style={{ 
                  background: types.length === 1 
                    ? pokemonTypeColors[types[0]] 
                    : `linear-gradient(135deg, ${pokemonTypeColors[types[0]]} 50%, ${pokemonTypeColors[types[1]]} 50%)`
                }}
                title={types.join(' / ')}
              />
            )}
            <EditableText
              value={pokemon.name || defaultName}
              placeholder={defaultName}
              defaultValue={defaultName}
              onChange={handleNameChange}
              autoWidth={false}
              width="100%"
              fontSize={14.4}
              fontSizeRatio={0.6}
              className="font-semibold"
              readOnly={readOnly}
            />
          </div>
          <div className="flex items-center gap-1">
            {activeStatusInfos.length > 0 && (
              <div className="flex items-center gap-1 mr-1">
                {activeStatusInfos.map((status) => (
                  <CircularButton
                    key={status.type}
                    isActive={true}
                    onClick={() => {
                      if (status.type === "confusion") {
                        onUpdateStatus(pokemon.id, isMyTeam, { confusion: false, confusionCounter: 0 })
                      } else if (status.type === "love") {
                        onUpdateStatus(pokemon.id, isMyTeam, { love: false })
                      } else {
                        onUpdateStatus(pokemon.id, isMyTeam, { status: null, sleepCounter: 0 })
                      }
                    }}
                    icon={status.icon}
                    activeColor={status.activeColor}
                    title={`Retirer le statut ${status.title}`}
                    variant="filled"
                    diameter={20}
                    iconRatio={0.7}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}

            {teraType && (
              <div
               className={cn(
                 "transition-transform",
                 !readOnly && "cursor-pointer hover:scale-110 active:scale-95",
                 readOnly && "cursor-default"
               )}
               onClick={() => !readOnly && onToggleTerastallized(pokemon.id, isMyTeam)}
               title={pokemon.isTerastallized ? "Teracristallisation active" : "Activer la Teracristallisation"}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <StarBadgeIcon
                    className={cn(
                      "absolute inset-0 w-full h-full transition-all",
                      !pokemon.isTerastallized && "grayscale opacity-40"
                    )}
                    style={{ color: pokemon.isTerastallized ? pokemonTypeColors[teraType] : "#94a3b8" }}
                  />
                  <div className="relative z-10 flex items-center justify-center w-full h-full scale-[0.65] transition-all">
                    <Image
                      src={POKEMON_LOGOS[teraType]}
                      alt={teraType}
                      width={12}
                      height={12}
                      className="brightness-0 invert opacity-100"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {pokemon.heldItem && pokemon.heldItemName === "Mega Stone" && (
              <CircularButton
                isActive={pokemon.isMega || false}
                onClick={() => onToggleMega(pokemon.id, isMyTeam)}
                icon={pokemon.isMega ? MegaColoredIcon : MegaUniIcon}
                activeColor="bg-transparent"
                inactiveColor="bg-white text-slate-400 hover:bg-gray-50"
                title={pokemon.isMega ? "Méga-Évolution active" : "Activer la Méga-Évolution"}
                variant="outlined"
                diameter={24}
                iconRatio={0.8}
                readOnly={readOnly}
              />
            )}

            <div className="relative">
              <CircularButton
                isActive={isStarter}
                onClick={() => onFlagClick(teamIndex, isMyTeam)}
                icon={Swords}
                activeColor={isMyTeam ? "bg-blue-500 text-white" : "bg-red-500 text-white"}
                title={isStarter ? "Au combat" : "Cliquer pour sélectionner comme starter"}
                variant="outlined"
                diameter={Math.round(24 * 1)}
                iconRatio={0.7}
                readOnly={readOnly}
              />
              {isStarter && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white",
                  isMyTeam ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                )}>
                  {getSlotForPokemon(teamIndex, isMyTeam)}
                </div>
              )}
            </div>
            {!readOnly && (
            <Button variant="ghost" size="sm" onClick={() => onRemove(pokemon.id, isMyTeam)} className="cursor-pointer h-8 w-8 p-0 ml-1">
              <Trash2 className="h-4 w-4" />
            </Button>
            )}
          </div>
        </div>

         {!isCollapsed && !readOnly && (
          <div className="flex items-center gap-1 flex-wrap min-h-[32px] py-1">
               <span className="text-xs text-gray-600 mr-1">Types :</span>
               <PokemonTypeDropdown 
                 selectedType={types[0] || null} 
                 onSelect={(t) => handleTypeChange(0, t)} 
                 includeNull 
                 buttonClassName="h-6 px-1 gap-1 rounded-full min-w-[28px]"
                 size={24}
               />
               <PokemonTypeDropdown 
                 selectedType={types[1] || null} 
                 onSelect={(t) => handleTypeChange(1, t)} 
                 includeNull 
                 buttonClassName="h-6 px-1 gap-1 rounded-full min-w-[28px]"
                 size={24}
               />

               <span className="text-xs text-gray-600 mr-1 ml-2">Tera :</span>
               <PokemonTypeDropdown 
                 selectedType={teraType} 
                 onSelect={handleTeraChange} 
                 includeNull 
                 variant="tera" 
                 buttonClassName="h-6 px-1 gap-1 rounded-full min-w-[28px]"
                 size={24}
               />
          </div>
        )}

        {/* Row 3: Ability, Item */}
        <div className={cn("grid grid-cols-2 gap-2 items-center min-h-[32px]", isCollapsed ? "py-1" : "py-0.5")}>
             {/* Ability Section */}
             <div className="flex items-center min-w-0">
                 <span className="text-xs text-gray-600 mr-1 shrink-0">Ability :</span>
                 <div className="flex-1 min-w-0">
                     <EditableText
                        value={pokemon.abilityName || defaultAbilityName}
                        placeholder={defaultAbilityName}
                        defaultValue={defaultAbilityName}
                        onChange={handleAbilityNameChange}
                        autoWidth={false}
                        width="100%"
                        fontSize={12}
                        fontSizeRatio={0.6}
                        readOnly={readOnly}
                     />
                 </div>
             </div>

             {/* Item Section */}
             <div className="flex items-center min-w-0">
                <div className="shrink-0 mr-2">
                    <CircularButton
                        isActive={pokemon.heldItem}
                        onClick={() => onToggleHeldItem(pokemon.id, isMyTeam)}
                        icon={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? MegaColoredIcon : ShoppingBag}
                        activeColor={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? "bg-transparent" : "bg-amber-700 text-white"}
                        title={pokemon.heldItem ? (pokemon.heldItemName === "Mega Stone" ? "Méga-Gemme" : "Objet tenu") : "Aucun objet"}
                        variant="outlined"
                        diameter={Math.round(24 * 0.9)}
                        iconRatio={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? 0.7 : 0.6}
                        readOnly={readOnly}
                    />
                </div>
                {pokemon.heldItem && (
                     <div className="flex-1 min-w-0">
                         <EditableText
                            value={pokemon.heldItemName || defaultItemName}
                            placeholder={defaultItemName}
                            defaultValue={defaultItemName}
                            onChange={handleItemNameChange}
                            autoWidth={false}
                            width="100%"
                            fontSize={12}
                            fontSizeRatio={0.6}
                            readOnly={readOnly}
                          />
                     </div>
                )}
            </div>
        </div>

        {!isCollapsed && !readOnly && (
          <div className="py-1">
            <StatusSelector pokemon={pokemon} isMyTeam={isMyTeam} onUpdate={onUpdateStatus} />
          </div>
        )}
        {!isCollapsed && (
          <div className="py-1">
            <CustomTagsManager tags={pokemon.customTags || []} onUpdateTags={handleUpdateCustomTags} fontSize={10} readOnly={readOnly} />
          </div>
        )}
        
        <div className="py-1.5">
          <HealthBar pokemon={pokemon} isMyTeam={isMyTeam} onUpdate={onUpdateHealth} editable={true} />
        </div>
        
        {!isCollapsed && (
          <div className="py-2">
            <StatsModifiersDisplay 
                modifiers={pokemon.statsModifiers || { att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0 }}
                onUpdate={handleUpdateStatsModifiers}
                readOnly={readOnly}
            />
          </div>
        )}
        {!isCollapsed && (
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
