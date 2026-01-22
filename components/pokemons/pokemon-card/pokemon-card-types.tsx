import { PokemonType } from "@/lib/colors";
import { PokemonTypeDropdown } from "./pokemon-type-dropdown";

interface PokemonCardTypesProps {
    types: PokemonType[]
    teraType: PokemonType | null
    handleTypeChange: (index: 0 | 1, newType: PokemonType | null) => void
    handleTeraChange: (newType: PokemonType | null) => void
}

export function PokemonCardTypes({
    types,
    teraType,
    handleTypeChange,
    handleTeraChange
}: PokemonCardTypesProps) {
    return (
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
              selectedType={teraType || null} 
              onSelect={handleTeraChange} 
              includeNull 
              variant="tera" 
              buttonClassName="h-6 px-1 gap-1 rounded-full min-w-[28px]"
              size={24}
            />
        </div>
    )
}
