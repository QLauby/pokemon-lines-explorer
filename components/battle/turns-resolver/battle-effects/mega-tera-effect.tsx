"use client"

import { StarBadgeIcon } from "@/assets/badges/star-badge"
import MegaColored from "@/assets/logos/mega/mega-colored.svg"
import { CircularButton } from "@/components/shared/circular-button"
import { THEME } from "@/lib/constants/color-constants"
import { POKEMON_LOGOS } from "@/lib/constants/logos-constants"
import { cn } from "@/lib/utils/cn"
import { Effect, MegaTeraOperation, Pokemon } from "@/types/types"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

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
    className={className}
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

interface MegaTeraEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    initialPokemon?: Pokemon
}

export function MegaTeraEffect({
    effect,
    onUpdate,
    readOnly,
    initialPokemon
}: MegaTeraEffectProps) {
    const delta = effect.deltas[0]

    if (!delta || delta.type !== "MEGA_TERA_DELTAS") {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    if (!initialPokemon) return null

    // Compute state AFTER the operations for visualization
    const afterPokemon = { ...initialPokemon }
    for (const op of delta.operations) {
        if (op.type === "SET_MEGA") {
            afterPokemon.isMega = op.value
        } else if (op.type === "SET_TERA") {
            afterPokemon.isTerastallized = op.value
        }
    }

    const handleToggle = (type: "SET_MEGA" | "SET_TERA", currentValue: boolean) => {
        if (readOnly) return

        const newOps: MegaTeraOperation[] = [...delta.operations]
        const existingIdx = newOps.findIndex(op => op.type === type)
        
        const newValue = !currentValue
        
        if (existingIdx !== -1) {
            newOps[existingIdx] = { type, value: newValue }
        } else {
            newOps.push({ type, value: newValue })
        }

        // Clean up: if newValue is same as initial, we can remove the operation
        const finalOps = newOps.filter(op => {
            if (op.type === "SET_MEGA") return op.value !== !!initialPokemon.isMega
            if (op.type === "SET_TERA") return op.value !== !!initialPokemon.isTerastallized
            return true
        })

        onUpdate({
            ...effect,
            deltas: [{ ...delta, operations: finalOps }]
        })
    }

    const renderBadges = (p: Pokemon) => {
        const hasBadges = p.isMega || (p.isTerastallized && p.teraType)
        if (!hasBadges) return <span className="text-[10px] text-slate-400 italic">No form</span>

        return (
            <div className="flex items-center gap-1">
                {p.isTerastallized && p.teraType && (
                    <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                        <StarBadgeIcon
                            className="absolute inset-0 w-full h-full"
                            style={{ color: THEME.pokemon_types[p.teraType] }}
                        />
                        <div className="relative z-10 flex items-center justify-center w-full h-full scale-[0.65]">
                            <Image
                                src={POKEMON_LOGOS[p.teraType]}
                                alt={p.teraType}
                                width={8}
                                height={8}
                                className="brightness-0 invert opacity-100"
                            />
                        </div>
                    </div>
                )}
                {p.isMega && (
                    <div className="bg-white rounded-full p-0.5 border border-slate-100 shadow-sm">
                        <MegaColoredIcon size={11} />
                    </div>
                )}
            </div>
        )
    }

    const canMega = initialPokemon.heldItemName === "Mega Stone"
    const canTera = !!initialPokemon.teraType

    return (
        <div className="flex items-stretch gap-3 w-full">
            {/* Visualization: Before -> After */}
            <div className="flex items-center justify-center w-[150px] shrink-0 bg-white/50 px-2 py-1.5 rounded border border-slate-100 min-h-[40px] gap-1">
                <div className="flex-1 flex justify-end min-w-0">
                    {renderBadges(initialPokemon)}
                </div>
                
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 mx-1" />
                
                <div className="flex-1 flex justify-start min-w-0">
                    {renderBadges(afterPokemon)}
                </div>
            </div>

            {/* Vertical separator */}
            <div className="w-px bg-slate-200 my-1 rounded-full shrink-0" />

            {/* Toggles */}
            <div className="flex-1 min-w-0 flex items-center justify-center bg-white/40 border border-slate-100 rounded px-2 py-1.5 min-h-[40px] gap-5">
                {canTera && (
                    <div
                        className={cn(
                            "transition-transform",
                            !readOnly && "cursor-pointer hover:scale-110 active:scale-95",
                            readOnly && "cursor-default"
                        )}
                        onClick={() => !readOnly && handleToggle("SET_TERA", !!afterPokemon.isTerastallized)}
                        title={afterPokemon.isTerastallized ? "Désactiver Téra" : "Activer la Teracristallisation"}
                    >
                        <div className="relative w-6 h-6 flex items-center justify-center">
                            <StarBadgeIcon
                                className={cn(
                                    "absolute inset-0 w-full h-full transition-all",
                                    !afterPokemon.isTerastallized && "grayscale opacity-40"
                                )}
                                style={{ color: afterPokemon.isTerastallized ? THEME.pokemon_types[initialPokemon.teraType!] : THEME.common.disabled }}
                            />
                            <div className="relative z-10 flex items-center justify-center w-full h-full scale-[0.65] transition-all">
                                <Image
                                    src={POKEMON_LOGOS[initialPokemon.teraType!]}
                                    alt={initialPokemon.teraType!}
                                    width={12}
                                    height={12}
                                    className="brightness-0 invert opacity-100"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {canMega && (
                    <CircularButton
                        isActive={!!afterPokemon.isMega}
                        onClick={() => handleToggle("SET_MEGA", !!afterPokemon.isMega)}
                        icon={afterPokemon.isMega ? MegaColoredIcon : MegaUniIcon}
                        activeColor="bg-transparent"
                        inactiveColor="bg-white text-slate-400 hover:bg-slate-50"
                        title={afterPokemon.isMega ? "Désactiver Méga" : "Activer la Méga-Évolution"}
                        variant="outlined"
                        diameter={24}
                        iconRatio={0.8}
                        readOnly={readOnly}
                    />
                )}
                {!canMega && !canTera && (
                    <span className="text-[10px] text-slate-400 italic">No Mega/Tera available</span>
                )}
            </div>
        </div>
    )
}
