"use client"

import { THEME } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils/cn"
import type { PokemonType } from "@/lib/utils/colors-utils"
import { TypeLiseret } from "./type-liseret"

/**
 * Interface générique pour un élément de suggestion.
 * Les types sont optionnels pour permettre la réutilisation (ex: items, moves).
 */
export interface SuggestionItem {
  id: string
  label: string
  types?: PokemonType[]
  subtitle?: string
  metadata?: any
}

interface SuggestionListProps {
  items: SuggestionItem[]
  selectedIndex: number
  onSelect: (item: SuggestionItem) => void
  onHover: (index: number) => void
  className?: string
}

/**
 * Composant de liste de suggestions optimisé pour l'affichage dans un Popover.
 * Il gère l'affichage visuel des Pokémon avec leurs types.
 */
export function SuggestionList({ items, selectedIndex, onSelect, onHover, className }: SuggestionListProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100",
        className,
      )}
      style={{ minWidth: "180px", maxWidth: "250px" }}
    >
      <div className="max-h-[200px] overflow-y-auto overflow-x-hidden custom-scrollbar">
        {items.map((item, index) => {
          const isSelected = selectedIndex === index

          return (
            <div
              key={item.id}
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all duration-150 relative",
                isSelected ? "bg-slate-50 pl-4" : "hover:bg-slate-50/80 hover:pl-4",
              )}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item)}
              role="option"
              aria-selected={isSelected}
            >
              {/* Indicateur de sélection sur le bord gauche */}
              {isSelected && (
                <div 
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full" 
                  style={{ backgroundColor: THEME.common.ally }} 
                />
              )}

              {/* Liseret de types pour les Pokémon */}
              {item.types && item.types.length > 0 && <TypeLiseret types={item.types} className="w-1 h-3.5" />}

              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-[13px] truncate transition-colors",
                    isSelected ? "text-slate-900 font-semibold" : "text-slate-700",
                  )}
                >
                  {item.label}
                </span>
                {item.subtitle && (
                  <span className="text-[10px] text-slate-400 truncate leading-tight">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer informatif discret */}
      <div className="px-3 py-1 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center bg-zinc-50">
        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
          {items.length} résultat{items.length > 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
           <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white text-[8px] text-slate-400 font-sans shadow-sm">↵</kbd>
        </div>
      </div>
    </div>
  )
}
