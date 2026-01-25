"use client"

import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pokemon, SlotReference } from "@/lib/types"

import { PokemonSelector } from "./pokemon-selector"

interface HpChangeRowProps {
  target: SlotReference
  value: number
  isHealing: boolean
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onUpdate: (field: "slot" | "value" | "isHealing", value: any) => void
  onRemove: () => void
  autoFocus?: boolean
}

export function HpChangeRow({
  target,
  value,
  isHealing,
  activePokemon,
  onUpdate,
  onRemove,
  autoFocus,
}: HpChangeRowProps) {
  
  const currentPokemonInSlot = activePokemon.find(ap => {
      return false // Placeholder, to be replaced by dynamic lookup if possible 
  })
  
  const activeSlots = activePokemon.map((ap, i) => {
       return ap
  })
  
  const myActive = activePokemon.filter(p => p.isAlly)
  const oppActive = activePokemon.filter(p => !p.isAlly)
  
  let currentId = ""
  if (target.side === "my" && myActive[target.slotIndex]) {
      currentId = myActive[target.slotIndex].pokemon.id
  } else if (target.side === "opponent" && oppActive[target.slotIndex]) {
      currentId = oppActive[target.slotIndex].pokemon.id
  }

  return (
    <div className="flex gap-2 items-center mb-4 relative">
      <div className="relative flex-1 min-w-[200px]">
        <PokemonSelector
          currentId={currentId}
          activePokemon={activePokemon}
          onSelect={(id) => {
              // Convert ID -> SlotReference
              const selected = activePokemon.find(p => p.pokemon.id === id)
              if (selected) {
                  // Find index in myActive/oppActive
                  const isAlly = selected.isAlly
                  const list = isAlly ? myActive : oppActive
                  const idx = list.findIndex(p => p.pokemon.id === id)
                  if (idx !== -1) {
                      onUpdate("slot", { side: isAlly ? "my" : "opponent", slotIndex: idx })
                  }
              }
          }}
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
          autoFocus={autoFocus}
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
