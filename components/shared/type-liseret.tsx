import { PokemonType, pokemonTypeColors } from "@/lib/colors"
import { cn } from "@/lib/utils/cn"

interface TypeLiseretProps {
  types: (PokemonType | null | undefined)[] | undefined | null
  className?: string
}

export function TypeLiseret({ types, className }: TypeLiseretProps) {
  if (!types) return null
  
  const validTypes = types.filter((t): t is PokemonType => !!t)
  if (validTypes.length === 0) return null

  const color1 = pokemonTypeColors[validTypes[0]]
  const color2 = validTypes.length > 1 ? pokemonTypeColors[validTypes[1]] : null

  return (
    <div 
      className={cn("shrink-0 rounded-full w-1.5", className)}
      style={{ 
        minHeight: "1rem",
        background: color2 
          ? `linear-gradient(150deg, ${color1} 50%, ${color2} 50%)` 
          : color1 
      }}
    />
  )
}
