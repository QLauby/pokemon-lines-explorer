"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { BattleDelta, Pokemon, TurnAction, TurnActionType, TurnData } from "@/lib/types"

import { ConsequencesList } from "./consequences-list"
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

    if (field === "slot") {
        if (typeof value === "string") {
            // It's an ID from HpChangeRow's new selection logic
            const found = activePokemon.find(ap => ap.pokemon.id === value);
            if (found) {
                const sideList = activePokemon.filter(p => p.isAlly === found.isAlly);
                const slotIndex = sideList.findIndex(p => p.pokemon.id === value);
                delta.target = { side: found.isAlly ? "my" : "opponent", slotIndex };
            }
        } else {
            delta.target = value
        }
    }

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

    if (field === "slot") {
        if (typeof value === "string") {
            const found = activePokemon.find(ap => ap.pokemon.id === value);
            if (found) {
                const sideList = activePokemon.filter(p => p.isAlly === found.isAlly);
                const slotIndex = sideList.findIndex(p => p.pokemon.id === value);
                delta.target = { side: found.isAlly ? "my" : "opponent", slotIndex };
            }
        } else {
            delta.target = value
        }
    }

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

  // Calculate the sequence of board states
  const computedStates = useMemo(() => {
    const states: { 
        activePokemon: { pokemon: Pokemon; isAlly: boolean }[], 
        myTeam: Pokemon[], 
        enemyTeam: Pokemon[] 
    }[] = []
    
    // Start with the initial state
    let currentActive = [...activePokemon]
    let currentMyTeam = [...myTeam]
    let currentEnemyTeam = [...enemyTeam]
    
    // State 0: Before any action
    states.push({
        activePokemon: [...currentActive],
        myTeam: [...currentMyTeam],
        enemyTeam: [...currentEnemyTeam]
    })
    
    actions.forEach((action: TurnAction) => {
      // 1. If this action is a switch, update the team order AND active pokemon
      if (action.type === "switch" && action.target) {
        const isAlly = action.actor.side === "my"
        const team = isAlly ? currentMyTeam : currentEnemyTeam
        
        // The actor is at slotIndex
        const fromIndex = action.actor.slotIndex
        const toIndex = action.target.slotIndex

        // Validate indices
        if (team[fromIndex] && team[toIndex]) {
             // Swap in the team array (Physics of the game: Slot 0 swaps with Slot X)
             const temp = team[fromIndex]
             team[fromIndex] = team[toIndex]
             team[toIndex] = temp

             // Update Active Pokemon List to reflect this swap
             // We find the entry that WAS representing the 'from' slot
             const activeIndex = currentActive.findIndex(p => {
                 const pSide = p.isAlly ? "my" : "opponent"
                 // Important: We match based on the ID of the pokemon that WAS there
                 return pSide === action.actor.side && p.pokemon.id === temp.id
             })

             if (activeIndex !== -1) {
                 // Replace it with the new pokemon (who is now at team[fromIndex])
                 currentActive[activeIndex] = { 
                     pokemon: team[fromIndex], // This is the new pokemon
                     isAlly 
                 }
             }
        }
      }
      
      // 2. Apply HP Deltas
      action.deltas.forEach(delta => {
        if (delta.type === "HP_RELATIVE") {
            const isAlly = delta.target.side === "my"
            const team = isAlly ? currentMyTeam : currentEnemyTeam
            const targetPokemon = team[delta.target.slotIndex]
            
            if (targetPokemon) {
                // Update in Team Array
                const newHp = Math.min(100, Math.max(0, targetPokemon.hpPercent + delta.amount))
                const newPokemon = { ...targetPokemon, hpPercent: newHp }
                team[delta.target.slotIndex] = newPokemon

                // Also update in Active Pokemon list if present
                const activeIndex = currentActive.findIndex(p => p.pokemon.id === targetPokemon.id)
                if (activeIndex !== -1) {
                    currentActive[activeIndex] = {
                        pokemon: newPokemon,
                        isAlly
                    }
                }
            }
        }
      })
      
      // 3. Push this new state to the array
      states.push({
          activePokemon: [...currentActive],
          myTeam: [...currentMyTeam],
          enemyTeam: [...currentEnemyTeam]
      })
    })
    
    return states
  }, [actions, activePokemon, myTeam, enemyTeam])

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
                 // Use the state BEFORE this action (computedStates[index]) to identify the actor
                 computedStates[index].activePokemon.find((ap: { pokemon: Pokemon; isAlly: boolean }) => {
                     const team = ap.isAlly ? computedStates[index].myTeam : computedStates[index].enemyTeam
                     const slotIndex = team.findIndex((p: Pokemon) => p.id === ap.pokemon.id)
                     return (ap.isAlly ? "my" : "opponent") === action.actor.side && slotIndex === action.actor.slotIndex
                 })
            }
            activePokemon={computedStates[index].activePokemon} // Pass dynamic state context
            onMove={(direction) => !readOnly && moveAction(index, direction)}
            onToggleCollapse={() => toggleActionCollapse(index)} 
            onUpdateType={(type) => !readOnly && updateActionType(index, type)}
            onUpdateTarget={(target) => !readOnly && updateActionTarget(index, target)}
            onUpdateMetadata={(metadata) => !readOnly && updateActionMetadata(index, metadata)}
            onAddHpChange={() => !readOnly && addDeltaToAction(index)}
            onUpdateHpChange={(deltaIndex, field, value) => !readOnly && updateActionHpChange(index, deltaIndex, field, value)}
            onRemoveHpChange={(deltaIndex) => !readOnly && removeActionDelta(index, deltaIndex)}
            onMoveHpChange={(from, to) => !readOnly && moveActionDelta(index, from, to)}
            myTeam={computedStates[index].myTeam}   // PASS DYNAMIC TEAM
            enemyTeam={computedStates[index].enemyTeam} // PASS DYNAMIC TEAM
          />
        ))}
      </div>

      <div className="border-t pt-4">
          <ConsequencesList 
              title="End of Turn Effects"
              deltas={endOfTurnDeltas}
              options={[
                  ...computedStates[computedStates.length - 1].activePokemon.filter((p: { isAlly: boolean }) => p.isAlly).map((ap: { pokemon: Pokemon; isAlly: boolean }) => {
                      const idx = computedStates[computedStates.length - 1].myTeam.findIndex(p => p.id === ap.pokemon.id)
                      return {
                        label: ap.pokemon.name,
                        value: { side: "my" as const, slotIndex: idx },
                        isAlly: true
                      }
                  }),
                  ...computedStates[computedStates.length - 1].activePokemon.filter((p: { isAlly: boolean }) => !p.isAlly).map((ap: { pokemon: Pokemon; isAlly: boolean }) => {
                      const idx = computedStates[computedStates.length - 1].enemyTeam.findIndex(p => p.id === ap.pokemon.id)
                      return {
                        label: ap.pokemon.name,
                        value: { side: "opponent" as const, slotIndex: idx },
                        isAlly: false
                      }
                  })
              ]}
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