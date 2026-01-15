"use client"

import { Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pokemon, TreeNode } from "@/lib/types"

interface ActionFormProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  actionDescription: string
  actionProbability: string
  hpChanges: { pokemonId: string; hpChange: number }[]
  onActionDescriptionChange: (value: string) => void
  onActionProbabilityChange: (value: string) => void
  onHpChangesChange: (changes: { pokemonId: string; hpChange: number }[]) => void
  onAddAction: () => void
  getAllPokemon: () => Pokemon[]
}

export function ActionForm({
  selectedNodeId,
  nodes,
  actionDescription,
  actionProbability,
  hpChanges,
  onActionDescriptionChange,
  onActionProbabilityChange,
  onHpChangesChange,
  onAddAction,
  getAllPokemon,
}: ActionFormProps) {
  const addHpChange = () => {
    onHpChangesChange([...hpChanges, { pokemonId: "", hpChange: 0 }])
  }

  const updateHpChange = (index: number, field: "pokemonId" | "hpChange", value: string | number) => {
    const updated = [...hpChanges]
    updated[index] = { ...updated[index], [field]: value }
    onHpChangesChange(updated)
  }

  const removeHpChange = (index: number) => {
    onHpChangesChange(hpChanges.filter((_, i) => i !== index))
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Ajouter une Branche</CardTitle>
        {nodes.get(selectedNodeId) && (
          <Badge variant="outline">
            Depuis: {nodes.get(selectedNodeId)!.description} (
            {nodes.get(selectedNodeId)!.cumulativeProbability.toFixed(1)}%)
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="action-desc">Description de l'action</Label>
          <Textarea
            id="action-desc"
            placeholder="Ex: Pikachu utilise Tonnerre sur Carapuce"
            value={actionDescription}
            onChange={(e) => onActionDescriptionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.currentTarget.blur()
              }
            }}
          />
        </div>

        <div>
          <Label htmlFor="action-prob">Probabilité (%)</Label>
          <Input
            id="action-prob"
            type="number"
            min="0"
            max="100"
            placeholder="85"
            value={actionProbability}
            onChange={(e) => onActionProbabilityChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Changements de PV (%)</Label>
            <Button variant="outline" size="sm" onClick={addHpChange} className="cursor-pointer">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {hpChanges.map((change, index) => (
            <div key={index} className="flex gap-2 items-center mb-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={change.pokemonId}
                onChange={(e) => updateHpChange(index, "pokemonId", e.target.value)}
              >
                <option value="">Sélectionner un Pokémon</option>
                {getAllPokemon().map((pokemon) => (
                  <option key={pokemon.id} value={pokemon.id}>
                    {pokemon.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="% PV"
                value={change.hpChange}
                onChange={(e) => updateHpChange(index, "hpChange", Number.parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur()
                  }
                }}
                className="w-24"
              />
              <Button variant="ghost" size="sm" onClick={() => removeHpChange(index)} className="cursor-pointer">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={onAddAction} className="w-full cursor-pointer">
          Ajouter la Branche
        </Button>
      </CardContent>
    </Card>
  )
}
