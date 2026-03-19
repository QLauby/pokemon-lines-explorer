
import { StarBadgeIcon } from "@/assets/badges/star-badge"
import MegaColored from "@/assets/logos/mega/mega-colored.svg"
import { CircularButton } from "@/components/shared/circular-button"
import { TypeLiseret } from "@/components/shared/type-liseret"
import { THEME } from "@/lib/constants/color-constants"
import { POKEMON_LOGOS } from "@/lib/constants/logos-constants"
import { Pokemon } from "@/types/types"
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
                <TypeLiseret types={pokemon.types} className="w-1 h-full" />
                <span className="font-bold text-[11px] truncate h-full flex items-center" title={pokemon.name}>
                   {pokemon.name}
                </span>
             </div>
             <div className="flex items-center gap-0.5 shrink-0 h-full">
                {pokemon.hpPercent > 0 ? (
                  <>
                    {pokemon.isTerastallized && pokemon.teraType && (
                        <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
                          <StarBadgeIcon
                            className="absolute inset-0 w-full h-full"
                            style={{ color: THEME.pokemon_types[pokemon.teraType] }}
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
                          title="Mega-Evolution active"
                          variant="outlined"
                          diameter={13}
                          iconRatio={0.9}
                          readOnly={true}
                        />
                    )}
                  </>
                ) : (
                    <span 
                        className="text-white font-black px-1 py-[1px] rounded-[2px] text-[8px] leading-none select-none tracking-tight"
                        style={{ backgroundColor: THEME.ko.bordeaux }}
                    >
                        KO
                    </span>
                )}
             </div>
        </div>
    )
}
