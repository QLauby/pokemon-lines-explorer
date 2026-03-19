import { CircularButton } from "@/components/shared/circular-button";
import { EditableText } from "@/components/shared/editable-text";
import { cn } from "@/lib/utils/cn";
import { Pokemon } from "@/types/types";
import { ShoppingBag } from "lucide-react";
import { MegaColoredIcon } from "./pokemon-card-header";

interface PokemonCardAbilityItemProps {
    pokemon: Pokemon
    defaultAbilityName: string
    defaultItemName: string
    handleAbilityNameChange: (newName: string) => void
    handleItemNameChange: (newName: string) => void
    onToggleHeldItem: (id: string, isMyTeam: boolean) => void
    isMyTeam: boolean
    readOnly?: boolean
    isCardExpanded: boolean
}

export function PokemonCardAbilityItem({
    pokemon,
    defaultAbilityName,
    defaultItemName,
    handleAbilityNameChange,
    handleItemNameChange,
    onToggleHeldItem,
    isMyTeam,
    readOnly,
    isCardExpanded
}: PokemonCardAbilityItemProps) {
    return (
        <div className={cn("grid grid-cols-2 gap-2 items-center min-h-[32px]", !isCardExpanded ? "py-1" : "py-0.5")}>
             {/* Ability Section */}
             <div className="flex items-center min-w-0">
                 <span className="text-xs text-slate-600 mr-1 shrink-0">Ability :</span>
                 <div className="flex-1 min-w-0">
                     <EditableText
                        value={pokemon.abilityName || defaultAbilityName}
                        placeholder={defaultAbilityName}
                        defaultValue={defaultAbilityName}
                        onChange={handleAbilityNameChange}
                        autoWidth={false}
                        width="100%"
                        fontSize={12}
                        fontSizeRatio={0.6}
                        readOnly={readOnly}
                     />
                 </div>
             </div>

             {/* Item Section */}
             <div className="flex items-center min-w-0">
                <div className="shrink-0 mr-2">
                    <CircularButton
                        isActive={pokemon.heldItem}
                        onClick={() => onToggleHeldItem(pokemon.id, isMyTeam)}
                        icon={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? MegaColoredIcon : ShoppingBag}
                        activeColor={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? "bg-transparent" : "bg-amber-700 text-white"}
                        title={pokemon.heldItem ? (pokemon.heldItemName === "Mega Stone" ? "Mega Stone" : "Held Item") : "No item"}
                        variant="outlined"
                        diameter={Math.round(24 * 0.9)}
                        iconRatio={pokemon.heldItem && pokemon.heldItemName === "Mega Stone" ? 0.7 : 0.6}
                        readOnly={readOnly}
                    />
                </div>
                {pokemon.heldItem && (
                     <div className="flex-1 min-w-0">
                         <EditableText
                            value={pokemon.heldItemName || defaultItemName}
                            placeholder={defaultItemName}
                            defaultValue={defaultItemName}
                            onChange={handleItemNameChange}
                            autoWidth={false}
                            width="100%"
                            fontSize={12}
                            fontSizeRatio={0.6}
                            readOnly={readOnly}
                          />
                     </div>
                )}
            </div>
        </div>
    )
}
