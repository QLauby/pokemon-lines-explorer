"use client"

import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Pokemon, TreeNode } from "@/lib/types"

import { HpChangeRow } from "./hp-change-row"

interface SetNextTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  hpChanges: { pokemonId: string; value: number; isHealing: boolean }[]
  onHpChangesChange: (changes: { pokemonId: string; value: number; isHealing: boolean }[]) => void
  onAddAction: () => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
}

export function SetNextTurn({
  selectedNodeId,
  nodes,
  hpChanges,
  onHpChangesChange,
  onAddAction,
  activePokemon,
}: SetNextTurnProps) {
  const addHpChange = () => {
    onHpChangesChange([...hpChanges, { pokemonId: "", value: 0, isHealing: false }])
  }

  const updateHpChange = (index: number, field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => {
    const updated = [...hpChanges]
    updated[index] = { ...updated[index], [field]: value }
    onHpChangesChange(updated)
  }

  const removeHpChange = (index: number) => {
    onHpChangesChange(hpChanges.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Node Info Header */}
      {nodes.get(selectedNodeId) && (
        <div className="flex items-center gap-2 mb-4">
           <span className="text-sm text-gray-500">Depuis :</span>
           <Badge variant="secondary" className="font-medium px-3 py-1">
             {nodes.get(selectedNodeId)!.description} ({nodes.get(selectedNodeId)!.cumulativeProbability.toFixed(1)}%)
           </Badge>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Hp Changes</Label>
            <Button variant="outline" size="sm" onClick={addHpChange} className="cursor-pointer">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {hpChanges.map((change, index) => (
            <HpChangeRow
              key={index}
              pokemonId={change.pokemonId}
              value={change.value}
              isHealing={change.isHealing}
              activePokemon={activePokemon}
              onUpdate={(field, value) => updateHpChange(index, field, value)}
              onRemove={() => removeHpChange(index)}
            />
          ))}
        </div>

        <Button onClick={onAddAction} className="w-full cursor-pointer">
          End turn
        </Button>
      </div>
    </div>
  )
}
