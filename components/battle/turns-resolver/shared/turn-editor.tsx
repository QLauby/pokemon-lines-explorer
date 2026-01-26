"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useTurnSimulation } from "@/lib/hooks/use-turn-simulation"
import { BattleDelta, BattleState, Pokemon, TurnAction, TurnActionType, TurnData } from "@/types/types"
import { AlertTriangle } from "lucide-react"

import { EffectsList } from "./effects-list"
import { InitialDeploymentManager } from "./initial-deployment-manager"
import { PokemonAction } from "./pokemon-action"
import { SwitchActionAfterKo } from "./switch-action-after-ko"

interface TurnEditorProps {
  initialTurnData?: TurnData
  initialBattleState?: BattleState | null
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[] // Keep prop for initial deployment primarily
  onSave: (data: TurnData) => void
  saveLabel: string
  readOnly?: boolean
  onChange?: (data: TurnData) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  turnNumber: number
  battleFormat?: "simple" | "double"
}

export function TurnEditor({
  initialTurnData,
  initialBattleState,
  activePokemon: initialActivePokemon,
  onSave,
  saveLabel,
  readOnly = false,
  onChange,
  myTeam,
  enemyTeam,
  turnNumber,
  battleFormat = "simple",
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

  // --- 1. Integration of the Brain (useTurnSimulation) ---
  const { detectedKOs, getStateAtAction } = useTurnSimulation({
      initialState: initialBattleState || undefined, // Use explicit initial state if provided
      actions,
      myTeam,
      enemyTeam
  })

  // Initialize actions based on active pokemon or initial data
  useEffect(() => {
    if (initialTurnData && initialTurnData.actions.length > 0) {
      setActions(JSON.parse(JSON.stringify(initialTurnData.actions)))
      setEndOfTurnDeltas(JSON.parse(JSON.stringify(initialTurnData.endOfTurnDeltas)))
    } else {
      if (turnNumber === 1) {
        // TURN 1: Initial Deployment (Self-Switch Actions) followed by Regular Actions
        const activeSlots = battleFormat === "double" ? 2 : 1
        const deploymentActions: TurnAction[] = []

        // Order: My Slot 0, Opponent Slot 0, (then Slot 1 if Double)
        for (let i = 0; i < activeSlots; i++) {
            // My Side
            deploymentActions.push({
                id: crypto.randomUUID(),
                type: "switch",
                actor: { side: "my", slotIndex: i },
                target: { side: "my", slotIndex: i }, // Self-Switch
                deltas: [],
                isCollapsed: true
            })
            // Opponent Side
            deploymentActions.push({
                id: crypto.randomUUID(),
                type: "switch",
                actor: { side: "opponent", slotIndex: i },
                target: { side: "opponent", slotIndex: i }, // Self-Switch
                deltas: [],
                isCollapsed: true
            })
        }

        // Regular Actions for Turn 1
        const regularActions: TurnAction[] = initialActivePokemon.map(ap => {
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

        setActions([...deploymentActions, ...regularActions])
      } else {
        // SUBSEQUENT TURNS: Default Attack Actions
        const resolvedActions: TurnAction[] = initialActivePokemon.map(ap => {
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
      }
      
      if (initialTurnData) {
        setEndOfTurnDeltas(JSON.parse(JSON.stringify(initialTurnData.endOfTurnDeltas)))
      }
    }
  }, [initialTurnData, turnNumber, battleFormat /** Only run once or when context changes drastically, manual deps */])


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
    
    // Default smart targeting: Priority to Target, Fallback to Actor
    let targetSlotSelector: { side: "my" | "opponent"; slotIndex: number } = action.target 
                           ? action.target 
                           : action.actor;

    if (action.deltas.filter(d => d.type === "HP_RELATIVE").length >= 1) {
         // If we have multiple, stick to actor logic or repetition
         targetSlotSelector = action.target || action.actor
    }

    action.deltas = [
      ...action.deltas,
      { type: "HP_RELATIVE", target: targetSlotSelector, amount: -0 },
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

    if (field === "slot") {
        if (typeof value === "string") {
            // It's an ID from HpChangeRow's new selection logic
        } else {
            delta.target = value
        }
    }

    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(delta.amount)
        const isHealing = field === "isHealing" 
            ? (value as boolean) 
            : (delta.amount > 0 || (delta.amount === 0 && !Object.is(delta.amount, -0)))
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

  const moveActionDelta = (actionIndex: number, fromIndex: number, toIndex: number) => {
    if (readOnly) return
    const newActions = [...actions]
    const action = newActions[actionIndex]
    const deltas = [...action.deltas]
    
    if (toIndex < 0 || toIndex >= deltas.length) return
    
    const [moved] = deltas.splice(fromIndex, 1)
    deltas.splice(toIndex, 0, moved)
    
    action.deltas = deltas
    setActions(newActions)
  }

  const handleAddReplacement = (side: "my" | "opponent", slotIndex: number) => {
    if (readOnly) return
    
    const newAction: TurnAction = {
        id: crypto.randomUUID(),
        type: "switch",
        actor: { side, slotIndex },
        target: undefined,
        deltas: [],
        metadata: { isForcedSwitch: true },
        isCollapsed: false
    }

    setActions([...actions, newAction])
  }

  const handleDeleteAction = (index: number) => {
    if (readOnly) return
    const newActions = actions.filter((_, i) => i !== index)
    setActions(newActions)
  }

  // End of Turn Logic
  const addEndOfTurnDelta = () => {
    if (readOnly) return
    setEndOfTurnDeltas([
      ...endOfTurnDeltas,
      { type: "HP_RELATIVE", target: { side: "my", slotIndex: 0 }, amount: -0 },
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

    if (field === "slot") {
        if (typeof value === "string") {
            // ...
        } else {
            delta.target = value
        }
    }

    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(delta.amount)
        const isHealing = field === "isHealing" 
            ? (value as boolean) 
            : (delta.amount > 0 || (delta.amount === 0 && !Object.is(delta.amount, -0)))
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

  const handleUpdateAction = (index: number, newAction: TurnAction) => {
    if (readOnly) return
    const newActions = [...actions]
    newActions[index] = newAction
    setActions(newActions)
  }

  // Helper to extract active pokemon from a dynamic state
  const getActivePokemonFromState = (state: import("@/types/types").BattleState) => {
    const limit = battleFormat === "double" ? 2 : 1
    return [
        ...(state.myTeam || []).map((p, i) => ({ pokemon: p, isAlly: true, slotIndex: i })).filter((p, i) => i < limit), 
        ...(state.enemyTeam || []).map((p, i) => ({ pokemon: p, isAlly: false, slotIndex: i })).filter((p, i) => i < limit)
    ]
  }

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      <div className="space-y-4">
        {turnNumber === 1 && (
          <InitialDeploymentManager 
            actions={actions.slice(0, (battleFormat === "double" ? 2 : 1) * 2)}
            myTeam={myTeam}
            enemyTeam={enemyTeam}
            activeSlots={battleFormat === "double" ? 2 : 1}
            onUpdateAction={(sliceIndex, newAction) => handleUpdateAction(sliceIndex, newAction)}
          />
        )}

        <div className="space-y-2">
          {actions.map((action, index) => {
            const isDeployment = turnNumber === 1 && index < (battleFormat === "double" ? 2 : 1) * 2
            if (isDeployment) return null // Handled by InitialDeploymentManager

            // --- Dynamic Context ---
            const stateBeforeAction = getStateAtAction(index)
            // Reconstruct active list for this specific moment
            const dynamicActivePokemon = getActivePokemonFromState(stateBeforeAction)

            // Actor resolution (using current state)
            const actorObj = dynamicActivePokemon.find(ap => 
                (ap.isAlly ? "my" : "opponent") === action.actor.side && 
                ap.slotIndex === action.actor.slotIndex
            )

            const koData = detectedKOs[index]
            const hasKO = koData && koData.length > 0

            return (
              <div key={action.id} className="space-y-2">
                  <div className="relative">
                      {action.metadata?.isForcedSwitch ? (
                          <SwitchActionAfterKo 
                              action={action}
                              index={index}
                              totalActions={actions.length}
                              activePokemon={dynamicActivePokemon}
                              myTeam={stateBeforeAction.myTeam}
                              enemyTeam={stateBeforeAction.enemyTeam}
                              onUpdateTarget={(target) => !readOnly && updateActionTarget(index, target)}
                              onAddHpChange={() => !readOnly && addDeltaToAction(index)}
                              onUpdateHpChange={(deltaIndex, field, value) => !readOnly && updateActionHpChange(index, deltaIndex, field, value)}
                              onRemoveHpChange={(deltaIndex) => !readOnly && removeActionDelta(index, deltaIndex)}
                              onMoveHpChange={(from, to) => !readOnly && moveActionDelta(index, from, to)}
                              onMove={(direction) => !readOnly && moveAction(index, direction)}
                              onDelete={() => !readOnly && handleDeleteAction(index)}
                          />
                      ) : (
                          <PokemonAction
                            action={action}
                            index={index}
                            totalActions={actions.length}
                            actor={actorObj}
                            activePokemon={dynamicActivePokemon} 
                            onMove={(direction) => !readOnly && moveAction(index, direction)}
                            onToggleCollapse={() => toggleActionCollapse(index)} 
                            onUpdateType={(type) => !readOnly && updateActionType(index, type)}
                            onUpdateTarget={(target) => !readOnly && updateActionTarget(index, target)}
                            onUpdateMetadata={(metadata) => !readOnly && updateActionMetadata(index, metadata)}
                            onAddHpChange={() => !readOnly && addDeltaToAction(index)}
                            onUpdateHpChange={(deltaIndex, field, value) => !readOnly && updateActionHpChange(index, deltaIndex, field, value)}
                            onRemoveHpChange={(deltaIndex) => !readOnly && removeActionDelta(index, deltaIndex)}
                            onMoveHpChange={(from, to) => !readOnly && moveActionDelta(index, from, to)}
                            myTeam={stateBeforeAction.myTeam} 
                            enemyTeam={stateBeforeAction.enemyTeam} 
                          />
                      )}
                  </div>

                  {/* Banner for KO detection */}
                  {hasKO && (
                      <div className="mx-2 mt-2 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                          <div className="flex items-center gap-2 text-red-700 font-bold">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">
                                  {koData.map(k => k.pokemon.name).join(" et ")} est K.O. !
                              </span>
                          </div>
                          {!readOnly && (
                              <div className="flex gap-2">
                                  {koData.map((k, kIdx) => (
                                      <Button 
                                          key={kIdx}
                                          variant="destructive" 
                                          size="sm" 
                                          className="h-6 text-[10px] w-auto bg-red-600 hover:bg-red-700"
                                          onClick={() => {
                                              const team = k.isAlly ? stateBeforeAction.myTeam : stateBeforeAction.enemyTeam
                                              const slotIndex = team.findIndex(p => p.id === k.pokemon.id)
                                              handleAddReplacement(k.isAlly ? "my" : "opponent", slotIndex !== -1 ? slotIndex : 0)
                                          }}
                                      >
                                          Remplacer {k.pokemon.name}
                                      </Button>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t pt-4">
          <EffectsList 
              title="End of Turn Effects"
              deltas={endOfTurnDeltas}
              options={[
                  ...getStateAtAction(actions.length).myTeam.map((p, i) => ({
                      label: p.name,
                      value: { side: "my" as const, slotIndex: i },
                      isAlly: true
                  })),
                  ...getStateAtAction(actions.length).enemyTeam.map((p, i) => ({
                      label: p.name,
                      value: { side: "opponent" as const, slotIndex: i },
                      isAlly: false
                  }))
              ].filter(o => {
                  const limit = battleFormat === "double" ? 2 : 1
                  return o.value.slotIndex < limit // Only active ones usually
              })}
              onAdd={addEndOfTurnDelta}
              onUpdate={!readOnly ? ((index: number, field: "slot" | "value" | "isHealing", value: any) => updateEndOfTurnDelta(index, field, value)) : () => {}}
              onRemove={!readOnly ? ((index: number) => removeEndOfTurnDelta(index)) : () => {}}
              addButtonLabel="Add Effect"
          />
      </div>

      <Button onClick={handleSave} className="w-full h-12 text-lg font-bold shadow-md" disabled={readOnly}>
        {saveLabel}
      </Button>
    </div>
  )
}