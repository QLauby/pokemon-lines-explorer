"use client"

import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { BattleDelta, Pokemon, TreeNode } from "@/lib/types"
import { showSuccessToast } from "@/lib/utils/toasts/toast-handler"

import { HpChangeRow } from "./hp-change-row"

interface UpdateCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
}

export function UpdateCurrentTurn({
  selectedNodeId,
  nodes,
  activePokemon,
  onUpdateNode,
}: UpdateCurrentTurnProps) {
  const selectedNode = nodes.get(selectedNodeId)
  
  // Local state for the form inputs
  const [hpChanges, setHpChanges] = useState<{ pokemonId: string; value: number; isHealing: boolean }[]>([])

  // Load data from the selected node into the form
  useEffect(() => {
    if (selectedNode) {
      const changes = selectedNode.deltas
        .filter((d): d is Extract<BattleDelta, { type: "HP_RELATIVE" }> => d.type === "HP_RELATIVE")
        .map(delta => ({
          pokemonId: delta.targetId,
          value: Math.abs(delta.amount),
          isHealing: delta.amount > 0
        }))
      setHpChanges(changes)
    } else {
      setHpChanges([])
    }
  }, [selectedNode])

  const addHpChange = () => {
    setHpChanges([...hpChanges, { pokemonId: "", value: 0, isHealing: false }])
  }

  const updateHpChange = (index: number, field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => {
    const updated = [...hpChanges]
    updated[index] = { ...updated[index], [field]: value }
    setHpChanges(updated)
  }

  const removeHpChange = (index: number) => {
    setHpChanges(hpChanges.filter((_, i) => i !== index))
  }

  const handleUpdateTurn = () => {
    if (!selectedNode) return

    // Reconstruct Deltas
    const otherDeltas = selectedNode.deltas.filter(d => d.type !== "HP_RELATIVE")
    
    const newHpDeltas: BattleDelta[] = hpChanges
      .filter(c => c.pokemonId && c.value !== 0)
      .map(c => ({
        type: "HP_RELATIVE",
        targetId: c.pokemonId,
        amount: c.value * (c.isHealing ? 1 : -1)
      }))

    const finalDeltas = [...otherDeltas, ...newHpDeltas]

    onUpdateNode(selectedNodeId, { deltas: finalDeltas })
    
    showSuccessToast(`Tour ${selectedNode.turn} mis à jour`)
  }

  if (!selectedNode) return <div>No turn selected</div>

  return (
    <div className="space-y-6">
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

        <Button onClick={handleUpdateTurn} className="w-full cursor-pointer">
          Update turn
        </Button>
      </div>
    </div>
  )
}
