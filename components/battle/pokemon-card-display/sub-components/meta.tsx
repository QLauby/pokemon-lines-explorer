
import MegaColored from "@/assets/logos/mega/mega-colored.svg";
import { Pokemon } from "@/types/types";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAbilityText, getItemText } from "@/lib/utils/pokedex-utils";
import { THEME } from "@/lib/constants/color-constants";
import { useIsDark } from "@/lib/hooks/use-is-dark";

const MegaColoredIcon = ({ size, className }: { size?: number; className?: string }) => (
  <Image
    src={MegaColored}
    width={size}
    height={size}
    className={className}
    alt="Mega Evolution"
  />
);

interface PokemonCardDisplayMetaProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayMeta({ pokemon }: PokemonCardDisplayMetaProps) {
    const isDark = useIsDark();
    return (
        <div className="flex items-center gap-1 text-[9px] text-slate-400 leading-tight mt-0.5 min-w-0">
             {pokemon.abilityName && (
                <div className="flex-1 min-w-0 flex items-center">
                    {(() => {
                        const text = getAbilityText(pokemon.abilityName);
                        return text ? (
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <span 
                                        className="truncate text-slate-500 cursor-help underline underline-offset-1 decoration-slate-300 decoration-dotted" 
                                        style={{ maxWidth: '90px' }}
                                    >
                                        {pokemon.abilityName}
                                    </span>
                                </TooltipTrigger>
                                 <TooltipContent 
                                    side="top" 
                                    className="max-w-[250px] whitespace-normal shadow-xl z-[100]"
                                    style={{ backgroundColor: THEME.tooltips.bg, color: THEME.tooltips.text }}
                                 >
                                    <div className="space-y-1 p-1" style={{ color: THEME.tooltips.text }}>
                                        <div className="font-bold text-[11px] border-b pb-0.5" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>{text.name}</div>
                                        <p className="text-[10px] opacity-70 leading-tight italic">{text.shortDesc || text.desc}</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <span 
                                className="truncate text-slate-500" 
                                title={pokemon.abilityName}
                                style={{ maxWidth: '90px' }}
                            >
                                {pokemon.abilityName}
                            </span>
                        );
                    })()}
                </div>
             )}
             {pokemon.abilityName && pokemon.heldItem && (
                <span className="shrink-0 opacity-50">•</span>
             )}
             {pokemon.heldItem && (
                <div className="flex-1 min-w-0 flex items-center gap-0.5">
                   {pokemon.heldItemName === "Mega Stone" ? (
                      <MegaColoredIcon size={9} className="shrink-0" />
                   ) : (
                      <ShoppingBag className="w-2.5 h-2.5 shrink-0" style={{ color: THEME.common.item }} />
                   )}
                    {(() => {
                        const name = pokemon.heldItemName || "Objet";
                        const text = getItemText(name);
                        return text ? (
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <span 
                                        className="truncate text-slate-500 cursor-help underline underline-offset-1 decoration-slate-300 decoration-dotted" 
                                        style={{ maxWidth: '90px' }}
                                    >
                                        {name}
                                    </span>
                                </TooltipTrigger>
                                 <TooltipContent 
                                    side="top" 
                                    className="max-w-[250px] whitespace-normal shadow-xl z-[100]"
                                    style={{ backgroundColor: THEME.tooltips.bg, color: THEME.tooltips.text }}
                                 >
                                    <div className="space-y-1 p-1" style={{ color: THEME.tooltips.text }}>
                                        <div className="font-bold text-[11px] border-b pb-0.5" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>{text.name}</div>
                                        <p className="text-[10px] opacity-70 leading-tight italic">{text.shortDesc || text.desc}</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <span 
                                className="truncate text-slate-500" 
                                title={name}
                                style={{ maxWidth: '90px' }}
                            >
                                {name}
                            </span>
                        );
                    })()}
                </div>
             )}
        </div>
    )
}
