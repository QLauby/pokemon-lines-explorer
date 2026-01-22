
import { pokemonTypeColors } from "@/lib/colors"
import { Pokemon } from "@/lib/types"

interface PokemonCardDisplayAttacksProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayAttacks({ pokemon }: PokemonCardDisplayAttacksProps) {
    if (pokemon.attacks.length === 0) return null

    return (
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
    )
}
