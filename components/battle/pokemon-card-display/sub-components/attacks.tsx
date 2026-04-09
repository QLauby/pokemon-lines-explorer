
import { TypeLiseret } from "@/components/shared/type-liseret"
import { Pokemon } from "@/types/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getMoveDetails } from "@/lib/utils/pokedex-utils"
import { THEME } from "@/lib/constants/color-constants"
import { useIsDark } from "@/lib/hooks/use-is-dark"

interface PokemonCardDisplayAttacksProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayAttacks({ pokemon }: PokemonCardDisplayAttacksProps) {
    const isDark = useIsDark();
    if (pokemon.attacks.length === 0) return null

    return (
        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t">
            {pokemon.attacks.map((attack, idx) => {
                const details = getMoveDetails(attack.name);
                const tooltipContent = details ? (
                    <div className="space-y-1 p-1" style={{ color: THEME.tooltips.text }}>
                      <div className="font-bold text-[11px] border-b pb-0.5 flex justify-between items-center gap-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                        <span>{details.name}</span>
                        <span className="text-[9px] opacity-70 uppercase tracking-wider">{details.type}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span 
                            className="px-1 py-0.5 rounded border text-[8px]"
                            style={{ backgroundColor: "var(--bg-neutral)", borderColor: "var(--border-main)", opacity: 0.8 }}
                        >
                          {details.category}
                        </span>
                        <span 
                            className="px-1 py-0.5 rounded border text-[8px]"
                            style={{ backgroundColor: "var(--bg-neutral)", borderColor: "var(--border-main)", opacity: 0.8 }}
                        >
                          BP: {details.basePower || '--'}
                        </span>
                        <span 
                            className="px-1 py-0.5 rounded border text-[8px]"
                            style={{ backgroundColor: "var(--bg-neutral)", borderColor: "var(--border-main)", opacity: 0.8 }}
                        >
                          Acc: {details.accuracy === true ? '100' : details.accuracy}%
                        </span>
                        <span 
                            className="px-1 py-0.5 rounded border text-[8px]"
                            style={{ backgroundColor: "var(--bg-neutral)", borderColor: "var(--border-main)", opacity: 0.8 }}
                        >
                          Pri: {details.priority > 0 ? `+${details.priority}` : details.priority}
                        </span>
                        {details.flags?.contact && (
                           <span className="px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[8px] font-bold">
                              Contact
                           </span>
                        )}
                      </div>
                      <p className="text-[9px] opacity-70 leading-tight italic">
                        {details.shortDesc || details.desc}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[10px] p-1">{attack.name}</div>
                  );

                return (
                    <div key={idx} className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded px-1 py-0.5 box-border min-h-[28px]">
                        <div className="flex flex-col min-w-0 leading-none">
                            <div className="flex items-center gap-1 h-3">
                                <TypeLiseret types={[attack.type]} className="w-0.5 h-full" />
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild className="min-w-0 flex-1">
                                        <span 
                                            className="text-[9px] font-medium truncate cursor-help underline underline-offset-1 decoration-dotted"
                                            style={{ color: THEME.common.black, textDecorationColor: THEME.battlefield.main_border }}
                                        >
                                            {attack.name}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent 
                                        side="top" 
                                        className="max-w-[200px] whitespace-normal shadow-xl z-[100]"
                                        style={{ backgroundColor: THEME.tooltips.bg, color: THEME.tooltips.text }}
                                    >
                                        {tooltipContent}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-[7.5px] text-slate-500 pl-[6px]">
                                {attack.currentPP}/{attack.maxPP} PP
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
