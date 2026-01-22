
import { StarBadgeIcon } from "@/assets/badges/star-badge"
import MegaColored from "@/assets/logos/mega/mega-colored.svg"
import { CircularButton } from "@/components/shared/circular-button"
import { pokemonTypeColors } from "@/lib/colors"
import { POKEMON_LOGOS } from "@/lib/logos"
import { Pokemon } from "@/lib/types"
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

interface PokemonCardDisplayHeaderProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayHeader({ pokemon }: PokemonCardDisplayHeaderProps) {
    const types = pokemon.types || []
    return (
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
    )
}
