import { StarBadgeIcon } from "@/assets/badges/star-badge";
import MegaColored from "@/assets/logos/mega/mega-colored.svg";
import { CircularButton } from "@/components/shared/circular-button";
import { Counter } from "@/components/shared/counter";
import { EditableText } from "@/components/shared/editable-text";
import { TypeLiseret } from "@/components/shared/type-liseret";
import { Button } from "@/components/ui/button";
import { THEME } from "@/lib/constants/color-constants";
import { POKEMON_LOGOS } from "@/lib/constants/logos-constants";
import { cn } from "@/lib/utils/cn";
import { PokemonType } from "@/lib/utils/colors-utils";
import { Pokemon } from "@/types/types";
import { ChevronDown, ChevronUp, Minus, Plus, Swords, Trash2 } from "lucide-react";
import Image from "next/image";

export const MegaColoredIcon = ({ size, className }: { size?: number; className?: string }) => (
  <Image
    src={MegaColored}
    width={size}
    height={size}
    className={className}
    alt="Mega Evolution"
  />
);

export const MegaUniIcon = ({ size, className }: { size?: number; className?: string }) => (
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

interface PokemonCardHeaderProps {
    pokemon: Pokemon
    isMyTeam: boolean
    teamIndex: number
    isStarter?: boolean
    battleType: "simple" | "double"
    defaultName: string
    handleNameChange: (newName: string) => void
    activeStatusInfos: any[]
    onUpdateStatus: (id: string, isMyTeam: boolean, updates: any) => void
    onToggleHeldItem: (id: string, isMyTeam: boolean) => void
    onToggleMega: (id: string, isMyTeam: boolean) => void
    onToggleTerastallized: (id: string, isMyTeam: boolean) => void
    onFlagClick: (index: number, isMyTeam: boolean) => void
    onMovePokemon?: (id: string, isMyTeam: boolean, direction: "up" | "down") => void
    onRemove: (id: string, isMyTeam: boolean) => void
    getSlotForPokemon: (index: number, isMyTeam: boolean) => number | null
    isExpanded: boolean
    handleToggle: () => void
    readOnly?: boolean
    isFirst?: boolean
    isLast?: boolean
    teraType?: PokemonType | null
    isSleepCounterMounting?: boolean
    isConfusionCounterMounting?: boolean
    handleSleepCounterChange: (newValue: string) => void
    handleConfusionCounterChange: (newValue: string) => void
    handleToggleSleepCounter: () => void
    handleToggleConfusionCounter: () => void
}

export function PokemonCardHeader({
    pokemon,
    isMyTeam,
    teamIndex,
    isStarter,
    battleType,
    defaultName,
    handleNameChange,
    activeStatusInfos,
    onUpdateStatus,
    onToggleHeldItem,
    onToggleMega,
    onToggleTerastallized,
    onFlagClick,
    onMovePokemon,
    onRemove,
    getSlotForPokemon,
    isExpanded,
    handleToggle,
    readOnly,
    isFirst,
    isLast,
    teraType,
    isSleepCounterMounting,
    isConfusionCounterMounting,
    handleSleepCounterChange,
    handleConfusionCounterChange,
    handleToggleSleepCounter,
    handleToggleConfusionCounter
}: PokemonCardHeaderProps) {
    const types = pokemon.types || []

    return (
        <>
        <div className="absolute top-1 right-1 z-20">
          <CircularButton
            isActive={false}
            onClick={handleToggle}
            icon={!isExpanded ? ChevronDown : ChevronUp}
            activeColor="bg-transparent"
            inactiveColor={cn(
              "bg-transparent",
              isStarter 
                ? (isMyTeam ? "text-[var(--status-ally)]" : "text-[var(--status-opponent)]") 
                : "text-[var(--header-expand-icon)] hover:text-[var(--header-expand-icon-hover)]"
            )}
            style={{
                "--status-ally": THEME.common.ally,
                "--status-opponent": THEME.common.opponent,
                "--header-expand-icon": THEME.pokemon_card.header.expand_icon,
                "--header-expand-icon-hover": THEME.pokemon_card.header.expand_icon_hover,
            } as React.CSSProperties}
            title={!isExpanded ? "Expand card" : "Collapse card"}
            variant="filled"
            diameter={15}
            iconRatio={0.8}
            readOnly={false}
          />
        </div>

        <div className="flex justify-between items-center text-sm py-0.5">
          <div className="flex-1 mr-2 h-6 flex items-center min-w-0">
            {!readOnly && (
               <div className="flex flex-col space-y-0.5 mr-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 p-0 rounded-sm" 
                    style={{ backgroundColor: "transparent" }}
                    disabled={isFirst}
                    onClick={() => onMovePokemon?.(pokemon.id, isMyTeam, "up")}
                  >
                    <ChevronUp className={cn("h-4 w-4 transition-colors")} style={{ color: isFirst ? "transparent" : THEME.pokemon_card.header.move_icon }} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 p-0 rounded-sm" 
                    style={{ backgroundColor: "transparent" }}
                    disabled={isLast}
                    onClick={() => onMovePokemon?.(pokemon.id, isMyTeam, "down")}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-colors")} style={{ color: isLast ? "transparent" : THEME.pokemon_card.header.move_icon }} />
                  </Button>
               </div>
            )}
            <TypeLiseret types={pokemon.types} className="w-1 h-full mr-1.5" />
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
                  <div 
                    key={status.type} 
                    className={cn(
                      "flex items-center",
                      (status.type === "sleep" && !pokemon.showSleepCounter) || (status.type === "confusion" && !pokemon.showConfusionCounter) ? "mr-2" : ""
                    )}
                  >
                    <div className="relative inline-flex items-center">
                      <CircularButton
                        isActive={true}
                        onClick={() => {
                          if (status.type === "confusion") {
                            onUpdateStatus(pokemon.id, isMyTeam, { confusion: false, confusionCounter: 0, showConfusionCounter: false })
                          } else if (status.type === "love") {
                            onUpdateStatus(pokemon.id, isMyTeam, { love: false })
                          } else {
                            onUpdateStatus(pokemon.id, isMyTeam, { status: null, sleepCounter: 0, showSleepCounter: false })
                          }
                        }}
                        icon={status.icon}
                        activeColor={status.activeColor}
                        title={`Remove ${status.title} status`}
                        variant="filled"
                        diameter={20}
                        iconRatio={0.7}
                        readOnly={readOnly}
                      />
                      {(status.type === "sleep" || status.type === "confusion") && (
                        <div className="absolute -bottom-1 -right-2">
                          <CircularButton
                            isActive={false}
                            onClick={status.type === "sleep" ? handleToggleSleepCounter : handleToggleConfusionCounter}
                            icon={(status.type === "sleep" ? pokemon.showSleepCounter : pokemon.showConfusionCounter) ? Minus : Plus}
                            activeColor="bg-transparent"
                            inactiveColor="bg-transparent"
                            style={{ backgroundColor: THEME.pokemon_card.status.toggle_plus, color: THEME.pokemon_card.status.toggle_text }}
                            title={(status.type === "sleep" ? pokemon.showSleepCounter : pokemon.showConfusionCounter) ? "Hide counter" : "Show counter"}
                            diameter={10}
                            iconRatio={0.8}
                            variant="filled"
                            readOnly={readOnly}
                          />
                        </div>
                      )}
                    </div>
                    {/* Counters for Sleep and Confusion (Synced) */}
                    {status.type === "sleep" && pokemon.showSleepCounter && (
                      <div
                        className={`flex items-center ml-2 transition-all duration-300 ease-in-out ${
                          isSleepCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
                        }`}
                      >
                        <Counter
                          value={(pokemon.sleepCounter || 0).toString()}
                          onChange={handleSleepCounterChange}
                          min={0}
                          max={4}
                          doubleClickStep={2}
                          autoSelectOnClick={true}
                          defaultValue="0"
                          placeholder="0"
                          autoWidth={true}
                          rounded={false}
                          mode="text"
                          visualMode="default"
                          mainColor={THEME.pokemon_card.status.counter_text}
                          className="w-4 h-4 text-xs"
                        />
                      </div>
                    )}
                    {status.type === "confusion" && pokemon.showConfusionCounter && (
                      <div
                        className={`flex items-center ml-2 transition-all duration-300 ease-in-out ${
                          isConfusionCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
                        }`}
                      >
                        <Counter
                          value={(pokemon.confusionCounter || 0).toString()}
                          onChange={handleConfusionCounterChange}
                          min={0}
                          max={4}
                          doubleClickStep={2}
                          autoSelectOnClick={true}
                          defaultValue="0"
                          placeholder="0"
                          autoWidth={true}
                          rounded={false}
                          mode="text"
                          visualMode="default"
                          mainColor={THEME.pokemon_card.status.counter_text}
                          className="w-4 h-4 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pokemon.hpPercent === 0 && (
              <span 
                className="text-white font-black px-1 py-[1px] rounded-[2px] text-[8px] leading-none select-none tracking-tight shrink-0"
                style={{ backgroundColor: THEME.ko.bordeaux }}
              >
                KO
              </span>
            )}
            
            {teraType && (
              <div
               className={cn(
                 "transition-transform",
                 !readOnly && "cursor-pointer hover:scale-110 active:scale-95",
                 readOnly && "cursor-default"
               )}
               onClick={() => !readOnly && onToggleTerastallized(pokemon.id, isMyTeam)}
               title={pokemon.isTerastallized ? "Terastallization active" : "Activate Terastallization"}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <StarBadgeIcon
                    className={cn(
                      "absolute inset-0 w-full h-full transition-all",
                      !pokemon.isTerastallized && "grayscale opacity-40"
                    )}
                    style={{ color: pokemon.isTerastallized ? THEME.pokemon_types[teraType] : THEME.pokemon_card.header.tera_inactive }}
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
                inactiveColor="bg-transparent"
                style={{ 
                    borderColor: THEME.pokemon_card.header.mega_inactive,
                    color: THEME.pokemon_card.header.mega_inactive,
                    backgroundColor: THEME.common.white 
                }}
                title={pokemon.isMega ? "Mega-Evolution active" : "Activate Mega-Evolution"}
                variant="outlined"
                diameter={24}
                iconRatio={0.8}
                readOnly={readOnly}
              />
            )}

            <div className={`relative ${battleType === "simple" && !isStarter ? "hidden" : ""}`}>
              <CircularButton
                isActive={isStarter || false}
                onClick={() => onFlagClick(teamIndex, isMyTeam)}
                icon={Swords}
                activeColor="bg-transparent"
                style={{ 
                    backgroundColor: "transparent",
                    color: isStarter 
                        ? (isMyTeam ? THEME.common.ally : THEME.common.opponent) 
                        : THEME.pokemon_card.header.move_icon,
                    borderColor: isStarter
                        ? (isMyTeam ? THEME.common.ally : THEME.common.opponent)
                        : THEME.pokemon_card.header.move_icon
                } as React.CSSProperties}
                title={isStarter ? "In combat" : "Click to select as starter"}
                variant="outlined"
                diameter={Math.round(24 * 1)}
                iconRatio={0.7}
                readOnly={readOnly}
              />
              {isStarter && battleType !== "simple" && (
                <div 
                    className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white"
                    )}
                    style={{ backgroundColor: isMyTeam ? THEME.common.ally_text : THEME.common.opponent_text, color: THEME.common.white }}
                >
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
        </>
    )
}
