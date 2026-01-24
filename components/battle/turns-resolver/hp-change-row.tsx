"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pokemon } from "@/lib/types"

import { PokemonSelector } from "./pokemon-selector"

interface HpChangeRowProps {
  pokemonId: string
  value: number
  isHealing: boolean
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onUpdate: (field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => void
  onRemove: () => void
}

export function HpChangeRow({
  pokemonId,
  value,
  isHealing,
  activePokemon,
  onUpdate,
  onRemove,
}: HpChangeRowProps) {
  return (
    <div className="flex gap-2 items-center mb-4 relative">
      <div className="relative flex-1 min-w-[200px]">
        <PokemonSelector
          currentId={pokemonId}
          activePokemon={activePokemon}
          onSelect={(id) => onUpdate("pokemonId", id)}
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={isHealing ? "default" : "secondary"}
          size="icon"
          className={`w-8 h-10 font-bold transition-all flex-shrink-0 ${
            isHealing
              ? "bg-green-600 hover:bg-green-700 text-white border-green-700"
              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          }`}
          onClick={() => {
            onUpdate("isHealing", !isHealing)
          }}
        >
          {isHealing ? "+" : "-"}
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="20"
          value={value === 0 ? "" : value.toString()}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "")
            const val = parseInt(raw, 10) || 0
            onUpdate("value", val)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className="w-20 text-center font-bold text-lg h-10"
        />
      </div>
      <div className="text-sm font-medium">%</div>
      <Button variant="ghost" size="sm" onClick={onRemove} className="cursor-pointer">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
