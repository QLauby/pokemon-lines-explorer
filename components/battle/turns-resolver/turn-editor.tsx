"use client"

import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { BattleDelta, Pokemon, TurnAction, TurnActionType, TurnData } from "@/lib/types"

import { HpChangeRow } from "./hp-change-row"
import { PokemonAction } from "./pokemon-action"

interface TurnEditorProps {
  initialTurnData?: TurnData
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onSave: (data: TurnData) => void
  saveLabel: string
}

export function TurnEditor({
  initialTurnData,
  activePokemon,
  onSave,
  saveLabel,
}: TurnEditorProps) {
  const [actions, setActions] = useState<TurnAction[]>([])
  const [endOfTurnDeltas, setEndOfTurnDeltas] = useState<BattleDelta[]>([])

  // Initialize actions based on active pokemon or initial data
  useEffect(() => {
    if (initialTurnData && initialTurnData.actions.length > 0) {
      setActions(initialTurnData.actions)
      setEndOfTurnDeltas(initialTurnData.endOfTurnDeltas)
    } else {
      // Create default actions for each active pokemon
      const defaultActions: TurnAction[] = activePokemon.map((ap) => ({
        id: crypto.randomUUID(),
        actorId: ap.pokemon.id,
        type: "attack",
        hpChanges: [],
        isCollapsed: false,
      }))
      setActions(defaultActions)
      // If we had initial data but empty actions (rare), preserve EOT
      if (initialTurnData) {
        setEndOfTurnDeltas(initialTurnData.endOfTurnDeltas)
      }
    }
  }, [initialTurnData, activePokemon])

  const moveAction = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === actions.length - 1) return

    const newActions = [...actions]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const temp = newActions[targetIndex]
    newActions[targetIndex] = newActions[index]
    newActions[index] = temp
    setActions(newActions)
  }

  const updateActionType = (index: number, type: TurnActionType) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], type }
    setActions(newActions)
  }

  const toggleActionCollapse = (index: number) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], isCollapsed: !newActions[index].isCollapsed }
    setActions(newActions)
  }

  // HP Changes Logic for Actions
  const addHpChangeToAction = (actionIndex: number) => {
    const newActions = [...actions]
    const action = newActions[actionIndex]
    // Default to actor if possible, or empty
    const defaultTarget = action.actorId
    action.hpChanges = [
      ...action.hpChanges,
      { type: "HP_RELATIVE", targetId: defaultTarget, amount: 0 },
    ]
    setActions(newActions)
  }

  const updateActionHpChange = (
    actionIndex: number,
    hpIndex: number,
    field: "pokemonId" | "value" | "isHealing",
    value: string | number | boolean
  ) => {
    const newActions = [...actions]
    const action = newActions[actionIndex]
    const hpChange = { ...action.hpChanges[hpIndex] }

    if (field === "pokemonId") hpChange.targetId = value as string
    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(hpChange.amount)
        const isHealing = field === "isHealing" ? (value as boolean) : hpChange.amount > 0
        const amountVal = field === "value" ? (value as number) : currentAmount
        hpChange.amount = isHealing ? amountVal : -amountVal
    }

    action.hpChanges[hpIndex] = hpChange
    setActions(newActions)
  }

  const removeActionHpChange = (actionIndex: number, hpIndex: number) => {
    const newActions = [...actions]
    newActions[actionIndex].hpChanges = newActions[actionIndex].hpChanges.filter(
      (_, i) => i !== hpIndex
    )
    setActions(newActions)
  }

  // End of Turn Logic
  const addEndOfTurnDelta = () => {
    setEndOfTurnDeltas([
      ...endOfTurnDeltas,
      { type: "HP_RELATIVE", targetId: "", amount: 0 },
    ])
  }

  const updateEndOfTurnDelta = (
    index: number,
    field: "pokemonId" | "value" | "isHealing",
    value: string | number | boolean
  ) => {
    const newDeltas = [...endOfTurnDeltas]
    const delta = { ...newDeltas[index] }

    if (field === "pokemonId") delta.targetId = value as string
    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(delta.amount)
        const isHealing = field === "isHealing" ? (value as boolean) : delta.amount > 0
        const amountVal = field === "value" ? (value as number) : currentAmount
        delta.amount = isHealing ? amountVal : -amountVal
    }

    newDeltas[index] = delta
    setEndOfTurnDeltas(newDeltas)
  }

  const removeEndOfTurnDelta = (index: number) => {
    setEndOfTurnDeltas(endOfTurnDeltas.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave({
      actions,
      endOfTurnDeltas,
    })
  }

  const getPokemonName = (id: string) => {
    const config = activePokemon.find((p) => p.pokemon.id === id)
    return config ? config.pokemon.name : "Unknown"
  }

  const getActionColor = (isAlly: boolean) => (isAlly ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200")

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {actions.map((action, index) => (
          <PokemonAction
            key={action.id}
            action={action}
            index={index}
            totalActions={actions.length}
            actor={activePokemon.find((p) => p.pokemon.id === action.actorId)}
            activePokemon={activePokemon}
            onMove={(direction: "up" | "down") => moveAction(index, direction)}
            onToggleCollapse={() => toggleActionCollapse(index)}
            onUpdateType={(type: TurnActionType) => updateActionType(index, type)}
            onAddHpChange={() => addHpChangeToAction(index)}
            onUpdateHpChange={(hpIndex: number, field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => updateActionHpChange(index, hpIndex, field, value)}
            onRemoveHpChange={(hpIndex: number) => removeActionHpChange(index, hpIndex)}
          />
        ))}
      </div>

      <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">End of Turn Effects</Label>
             <Button variant="outline" size="sm" onClick={addEndOfTurnDelta}>
                <Plus className="h-4 w-4 mr-2" />
                Add Effect
             </Button>
          </div>
          
          <div className="space-y-2">
             {endOfTurnDeltas.map((delta, index) => {
                 if (delta.type !== "HP_RELATIVE") return null
                 return (
                    <HpChangeRow
                        key={index}
                        pokemonId={delta.targetId}
                        value={Math.abs(delta.amount)}
                        isHealing={delta.amount > 0}
                        activePokemon={activePokemon}
                        onUpdate={(field, value) => updateEndOfTurnDelta(index, field, value)}
                        onRemove={() => removeEndOfTurnDelta(index)}
                    />
                 )
             })}
              {endOfTurnDeltas.length === 0 && (
                  <div className="text-center text-gray-500 py-4 border border-dashed rounded-lg bg-gray-50/50">
                      No end of turn effects
                  </div>
              )}
          </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12 text-lg font-bold shadow-md">
        {saveLabel}
      </Button>
    </div>
  )
}