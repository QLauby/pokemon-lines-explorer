"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { TypeLiseret } from "@/components/shared/type-liseret"
import { Pokemon } from "@/lib/types"

interface PokemonSelectorProps {
  currentId: string
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onSelect: (id: string) => void
}

export function PokemonSelector({ currentId, activePokemon, onSelect }: PokemonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selected = activePokemon.find(ap => ap.pokemon.id === currentId)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <style jsx global>{`
        .custom-select-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
          isOpen ? "ring-2 ring-ring" : ""
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selected ? (
            <>
              <TypeLiseret types={selected.pokemon.types} className="h-5" />
              <span className={`font-bold truncate ${selected.isAlly ? "text-blue-600" : "text-red-600"}`}>
                {selected.pokemon.name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select Pokemon</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[200px] overflow-y-auto p-1 custom-select-scrollbar">
            {activePokemon.map(({ pokemon, isAlly }) => {
              return (
                <div
                  key={pokemon.id}
                  onClick={() => {
                    onSelect(pokemon.id)
                    setIsOpen(false)
                  }}
                  className={`flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                    currentId === pokemon.id ? "bg-accent" : ""
                  }`}
                >
                  <TypeLiseret types={pokemon.types} className="h-4" />
                  <span className={`flex-1 font-semibold ${isAlly ? "text-blue-600" : "text-red-600"}`}>
                    {pokemon.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
