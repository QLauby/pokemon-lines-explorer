
import MegaColored from "@/assets/logos/mega/mega-colored.svg";
import { Pokemon } from "@/types/types";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";

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
    return (
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
                      <ShoppingBag className="w-3 h-3 shrink-0 text-amber-700" />
                   )}
                   <span className="truncate text-gray-500">{pokemon.heldItemName || "Objet"}</span>
                </div>
             )}
        </div>
    )
}
