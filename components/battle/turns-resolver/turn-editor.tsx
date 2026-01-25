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
  readOnly?: boolean
  onChange?: (data: TurnData) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
}

export function TurnEditor({
  initialTurnData,
  activePokemon,
  onSave,
  saveLabel,
  readOnly = false,
  onChange,
  myTeam,
  enemyTeam,
}: TurnEditorProps) {
  const [actions, setActions] = useState<TurnAction[]>([])
  const [endOfTurnDeltas, setEndOfTurnDeltas] = useState<BattleDelta[]>([])

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
        onChange({
            actions,
            endOfTurnDeltas
        })
    }
  }, [actions, endOfTurnDeltas, onChange])

  // Initialize actions based on active pokemon or initial data
  useEffect(() => {
    if (initialTurnData && initialTurnData.actions.length > 0) {
      setActions(initialTurnData.actions)
      setEndOfTurnDeltas(initialTurnData.endOfTurnDeltas)
    } else {
      // Create initial actions based on SLOTS for each active pokemon
      const resolvedActions: TurnAction[] = activePokemon.map(ap => {
          const side: "my" | "opponent" = ap.isAlly ? "my" : "opponent"
          const team = ap.isAlly ? myTeam : enemyTeam
          const slotIndex = team.findIndex(p => p.id === ap.pokemon.id)
          
          return {
              id: crypto.randomUUID(),
              actor: { side, slotIndex },
              type: "attack",
              deltas: [],
              isCollapsed: true
          }
      })

      setActions(resolvedActions)
      
      if (initialTurnData) {
        setEndOfTurnDeltas(initialTurnData.endOfTurnDeltas)
      }
    }
  }, [initialTurnData, activePokemon, myTeam, enemyTeam])

  const moveAction = (index: number, direction: "up" | "down") => {
    if (readOnly) return
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
    if (readOnly) return
    const newActions = [...actions]
    
    newActions[index] = { ...newActions[index], type }
    
    setActions(newActions)
  }

  const updateActionTarget = (index: number, target: { side: "my" | "opponent", slotIndex: number }) => {
    if (readOnly) return
    const newActions = [...actions]
    const action = newActions[index]
    
    action.target = target
    
    if (action.type === "switch") {
        const otherDeltas = action.deltas.filter(d => d.type !== "SWITCH")
        
        const newDelta: BattleDelta = {
            type: "SWITCH",
            side: action.actor.side,
            fromSlot: action.actor.slotIndex,
            toSlot: target.slotIndex
        }
        
        action.deltas = [...otherDeltas, newDelta]
    }
    
    setActions(newActions)
  }

  const updateActionMetadata = (index: number, metadata: { itemName?: string; attackName?: string }) => {
    if (readOnly) return
    const newActions = [...actions]
    newActions[index] = { 
        ...newActions[index], 
        metadata: { ...newActions[index].metadata, ...metadata } 
    }
    setActions(newActions)
  }

  const toggleActionCollapse = (index: number) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], isCollapsed: !newActions[index].isCollapsed }
    setActions(newActions)
  }

  // Delta Logic for Actions
  const addDeltaToAction = (actionIndex: number) => {
    if (readOnly) return
    const newActions = [...actions]
    const action = newActions[actionIndex]
    
    let defaultTarget = { sub: "target" as const, ...action.target } // Placeholder logic needs refinement
    
    let targetSlotSelector = action.target 
                           ? action.target 
                           : { side: action.actor.side === "my" ? "opponent" : "my", slotIndex: 0 } as const

    if (action.deltas.filter(d => d.type === "HP_RELATIVE").length >= 1) {
        targetSlotSelector = action.actor
    }

    action.deltas = [
      ...action.deltas,
      { type: "HP_RELATIVE", target: targetSlotSelector, amount: 0 },
    ]
    setActions(newActions)
  }

  const updateActionHpChange = (
    actionIndex: number,
    deltaIndex: number,
    field: "slot" | "value" | "isHealing",
    value: any
  ) => {
    if (readOnly) return
    const newActions = [...actions]
    const action = newActions[actionIndex]
    
    const delta = { ...action.deltas[deltaIndex] } as BattleDelta
    if (delta.type !== "HP_RELATIVE") return // Safety

    if (field === "slot") delta.target = value
    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(delta.amount)
        const isHealing = field === "isHealing" ? (value as boolean) : delta.amount > 0
        const amountVal = field === "value" ? (value as number) : currentAmount
        delta.amount = isHealing ? amountVal : -amountVal
    }

    action.deltas[deltaIndex] = delta
    setActions(newActions)
  }

  const removeActionDelta = (actionIndex: number, deltaIndex: number) => {
    if (readOnly) return
    const newActions = [...actions]
    newActions[actionIndex].deltas = newActions[actionIndex].deltas.filter(
      (_, i) => i !== deltaIndex
    )
    setActions(newActions)
  }

  // End of Turn Logic
  const addEndOfTurnDelta = () => {
    if (readOnly) return
    setEndOfTurnDeltas([
      ...endOfTurnDeltas,
      { type: "HP_RELATIVE", target: { side: "my", slotIndex: 0 }, amount: 0 },
    ])
  }

  const updateEndOfTurnDelta = (
    index: number,
    field: "slot" | "value" | "isHealing",
    value: any
  ) => {
    if (readOnly) return
    const newDeltas = [...endOfTurnDeltas]
    const delta = { ...newDeltas[index] }
    
    if (delta.type !== "HP_RELATIVE") return

    if (field === "slot") delta.target = value
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
    if (readOnly) return
    setEndOfTurnDeltas(endOfTurnDeltas.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave({
      actions,
      endOfTurnDeltas,
    })
  }

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <PokemonAction
            key={action.id}
            action={action}
            index={index}
            totalActions={actions.length}
            actor={
                 // Fallback resolution logic:
                 activePokemon.find(ap => {
                     const apSide = ap.isAlly ? "my" : "opponent"
                     return false // Placeholder
                 })
            }
            activePokemon={activePokemon}
            onMove={(direction) => !readOnly && moveAction(index, direction)}
            onToggleCollapse={() => toggleActionCollapse(index)} 
            onUpdateType={(type) => !readOnly && updateActionType(index, type)}
            onUpdateTarget={(target) => !readOnly && updateActionTarget(index, target)}
            onUpdateMetadata={(metadata) => !readOnly && updateActionMetadata(index, metadata)}
            onAddHpChange={() => !readOnly && addDeltaToAction(index)}
            onUpdateHpChange={(deltaIndex, field, value) => !readOnly && updateActionHpChange(index, deltaIndex, field, value)}
            onRemoveHpChange={(deltaIndex) => !readOnly && removeActionDelta(index, deltaIndex)}
            myTeam={myTeam}
            enemyTeam={enemyTeam}
          />
        ))}
      </div>

      <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">End of Turn Effects</Label>
             {!readOnly && (
               <Button variant="outline" size="sm" onClick={addEndOfTurnDelta}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Effect
               </Button>
             )}
          </div>
          
          <div className="space-y-2">
             {endOfTurnDeltas.map((delta, index) => {
                 if (delta.type !== "HP_RELATIVE") return null
                 return (
                    <HpChangeRow
                        key={index}
                        target={delta.target}
                        value={Math.abs(delta.amount)}
                        isHealing={delta.amount > 0}
                        activePokemon={activePokemon}
                        onUpdate={(field, value) => !readOnly && updateEndOfTurnDelta(index, field, value)}
                        onRemove={() => !readOnly && removeEndOfTurnDelta(index)}
                        autoFocus={index === endOfTurnDeltas.length - 1}
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

      <Button onClick={handleSave} className="w-full h-12 text-lg font-bold shadow-md" disabled={readOnly}>
        {saveLabel}
      </Button>
    </div>
  )
}