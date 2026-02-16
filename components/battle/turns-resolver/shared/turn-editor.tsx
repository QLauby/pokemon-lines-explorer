"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useTurnSimulation } from "@/lib/hooks/use-turn-simulation"
import { BattleDelta, BattleState, Pokemon, TurnAction, TurnActionType, TurnData } from "@/types/types"

import { useKoFusion } from "@/lib/hooks/use-ko-fusion"
import { usePostTurnSwitches } from "@/lib/hooks/use-post-turn-switches"
import { EffectsList } from "./effects-list"
import { InitialDeploymentManager } from "./initial-deployment-manager"
import { PokemonAction } from "./pokemon-action"

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
  autoSave?: boolean
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
  autoSave = false,
}: TurnEditorProps) {
  const [actions, setActions] = useState<TurnAction[]>([])
  const [endOfTurnDeltas, setEndOfTurnDeltas] = useState<BattleDelta[]>([])
  const [postTurnActions, setPostTurnActions] = useState<TurnAction[]>([])

  // Notify parent of changes & Auto-Save
  useEffect(() => {
    const data = {
        actions,
        endOfTurnDeltas,
        postTurnActions
    }
    
    if (onChange) {
        onChange(data)
    }

    if (autoSave && !readOnly) {
        onSave(data)
    }
  }, [actions, endOfTurnDeltas, postTurnActions, onChange, autoSave, readOnly]) // onSave excluded to avoid loops if unstable reference

  // --- 1. Integration of the Brain (useTurnSimulation) ---

  // Safety: Ensure activeSlots structure matches the format (Partial Fix for inconsistent state)
  const simulationState = useMemo(() => {
      // CASE A: We have an explicit initial state (Update Mode)
      if (initialBattleState) {
          const neededSlots = battleFormat === "double" ? 2 : 1
          const currentMy = initialBattleState.activeSlots?.myTeam || []
          const currentOpp = initialBattleState.activeSlots?.opponentTeam || []

          // Need to patch if length doesn't match (either too few OR too many slots)
          const patchMy = currentMy.length !== neededSlots
          const patchOpp = currentOpp.length !== neededSlots

          if (!patchMy && !patchOpp) return initialBattleState

          return {
              ...initialBattleState,
              activeSlots: {
                myTeam: patchMy 
                    ? currentMy.slice(0, neededSlots).concat(
                        Array.from({ length: Math.max(0, neededSlots - currentMy.length) }, (_, i) => currentMy.length + i)
                      )
                    : currentMy,
                opponentTeam: patchOpp 
                    ? currentOpp.slice(0, neededSlots).concat(
                        Array.from({ length: Math.max(0, neededSlots - currentOpp.length) }, (_, i) => currentOpp.length + i)
                      )
                    : currentOpp
              }
          }
      }

      // CASE B: NO initial state (Set Next Turn Mode)
      const myActiveIndices = initialActivePokemon
          .filter(p => p.isAlly)
          .map(ap => myTeam.findIndex(p => p.id === ap.pokemon.id))
          .filter(idx => idx !== -1)

      const enemyActiveIndices = initialActivePokemon
          .filter(p => !p.isAlly)
          .map(ap => enemyTeam.findIndex(p => p.id === ap.pokemon.id))
          .filter(idx => idx !== -1)

      return {
          myTeam: JSON.parse(JSON.stringify(myTeam)),
          enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
          activeSlots: {
              myTeam: myActiveIndices.length > 0 ? myActiveIndices : Array.from({ length: battleFormat === "double" ? 2 : 1 }, (_, i) => i),
              opponentTeam: enemyActiveIndices.length > 0 ? enemyActiveIndices : Array.from({ length: battleFormat === "double" ? 2 : 1 }, (_, i) => i)
          },
          battlefieldState: {
              customTags: [],
              playerSide: { customTags: [] },
              opponentSide: { customTags: [] }
          }
      }
  }, [initialBattleState, battleFormat, initialActivePokemon, myTeam, enemyTeam])

  const { detectedKOs, endOfTurnKOs, finalState, getStateAtAction, getPostTurnStateAt } = useTurnSimulation({
      initialState: simulationState,
      actions,
      endOfTurnDeltas,
      postTurnActions,
      myTeam,
      enemyTeam,
      activeSlotsCount: battleFormat === "double" ? 2 : 1
  })

  // --- 2. Post-Turn Switches Management ---
  usePostTurnSwitches({
      endOfTurnKOs: endOfTurnKOs || [],
      postTurnActions,
      onUpdatePostTurnActions: setPostTurnActions,
      myTeam,
      enemyTeam,
      activeSlotsCount: battleFormat === "double" ? 2 : 1
  })

  // Initialize actions based on active pokemon or initial data
  useEffect(() => {
    if (initialTurnData && initialTurnData.actions.length > 0) {
      let loadedActions = JSON.parse(JSON.stringify(initialTurnData.actions))
      
      // Enforce Battle Format limit for Turn 0 to prevent loops/mismatches
      if (turnNumber === 0) {
          const limit = battleFormat === "double" ? 2 : 1
          // Keep only actions where the slotIndex is valid for the current format
          loadedActions = loadedActions.filter((a: TurnAction) => a.actor.slotIndex < limit)
      }

      setActions(loadedActions)
      setEndOfTurnDeltas(initialTurnData.endOfTurnDeltas ? JSON.parse(JSON.stringify(initialTurnData.endOfTurnDeltas)) : [])
      setPostTurnActions(initialTurnData.postTurnActions ? JSON.parse(JSON.stringify(initialTurnData.postTurnActions)) : [])
    } else {
      if (turnNumber === 0) {
        // TURN 0: Initial Deployment (Self-Switch Actions)
        const activeSlots = battleFormat === "double" ? 2 : 1
        const deploymentActions: TurnAction[] = []

        // Order: My Slot 0, Opponent Slot 0, (then Slot 1 if Double)
        for (let i = 0; i < activeSlots; i++) {
            // My Side
            deploymentActions.push({
                id: `deploy-my-${i}`,
                type: "switch",
                actor: { side: "my", slotIndex: i },
                target: { side: "my", slotIndex: i }, // Self-Switch
                deltas: [],
                isCollapsed: true
            })
            // Opponent Side
            deploymentActions.push({
                id: `deploy-opp-${i}`,
                type: "switch",
                actor: { side: "opponent", slotIndex: i },
                target: { side: "opponent", slotIndex: i }, // Self-Switch
                deltas: [],
                isCollapsed: true
            })
        }

        setActions(deploymentActions)
      } else {
        // TURN 1+: Default Attack Actions
        const resolvedActions: TurnAction[] = initialActivePokemon.map(ap => {
            const side: "my" | "opponent" = ap.isAlly ? "my" : "opponent"
            const team = ap.isAlly ? myTeam : enemyTeam
            const slotIndex = team.findIndex(p => p.id === ap.pokemon.id)
            
            return {
                id: `default-${side}-${slotIndex}`,
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
  }, [turnNumber, battleFormat]) // Only re-initialize when turn or format changes, not when data updates from autoSave

  // --- Automatic Forced Switch Management ---
  useKoFusion({
      actions,
      setActions,
      detectedKOs,
      getStateAtAction,
      readOnly
  })

  const canMoveActionUp = (index: number) => {
      if (index === 0) return false
      
      const action = actions[index]
      
      // Constraint: Switch-After-KO cannot be moved above a Normal Action unless it is fused (Defusion)
      if (action.type === "switch-after-ko") {
          if (action.metadata?.fusedFrom) return true

          return false
      }
      
      return true
  }

  const canMoveActionDown = (index: number) => {
      if (index >= actions.length - 1) return false
      
      const action = actions[index]
      const nextAction = actions[index + 1]
      
      // Constraint: Normal Action cannot move down if next is a Switch-After-KO
      if (action.type !== "switch-after-ko" && nextAction.type === "switch-after-ko") {
          return false
      }
      
      // Normal actions can move down freely otherwise
      if (action.type !== "switch-after-ko") {
          return true
      }
      
      // Switch moving down (allowed for reordering switches)
      return true
  }

  const moveAction = (index: number, direction: "up" | "down") => {
    if (readOnly) return
    if (direction === "up" && !canMoveActionUp(index)) return
    if (direction === "down" && !canMoveActionDown(index)) return
    
    const newActions = [...actions]
    
    // DEFUSION LOGIC:
    // If moving a fused switch-after-ko UP, restore the original action
    if (direction === "up" && actions[index].type === "switch-after-ko" && actions[index].metadata?.fusedFrom) {
         const fusedSwitch = actions[index]
         
         // Restore a fresh action
         const restoredAction: TurnAction = {
             id: crypto.randomUUID(),
             actor: fusedSwitch.actor,
             type: "attack",
             target: undefined,
             deltas: [],
             metadata: {},
             isCollapsed: true
         }
         
         const unfusedSwitch: TurnAction = {
             ...fusedSwitch,
             metadata: {}
         }
         
         // Find which action caused the KO for this Pokemon
         let koTriggerIndex = -1
         for (const [actionIndexStr, kos] of Object.entries(detectedKOs)) {
             const actionIndex = parseInt(actionIndexStr, 10)
             const hasMatchingKO = kos.some(ko => 
                 ko.isAlly === (fusedSwitch.actor.side === "my") &&
                 ko.pokemon.id === (fusedSwitch.actor.side === "my" ? myTeam : enemyTeam)[fusedSwitch.actor.slotIndex]?.id
             )
             if (hasMatchingKO) {
                 koTriggerIndex = actionIndex
                 break
             }
         }
         
         // Remove the fused switch from its current position
         newActions.splice(index, 1)
         
         // Insert restored action JUST BEFORE the action that caused the KO
         if (koTriggerIndex >= 0) {
             // Adjust index if we removed an item before it
             const adjustedIndex = koTriggerIndex > index ? koTriggerIndex - 1 : koTriggerIndex
             newActions.splice(adjustedIndex, 0, restoredAction)
         } else {
             // Fallback: insert at beginning if we can't find the trigger
             newActions.unshift(restoredAction)
         }
         
         // Add unfused switch at the END (switches happen after all actions)
         newActions.push(unfusedSwitch)
         
         setActions(newActions)
         return
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1
    
    // Perform Swap
    const temp = newActions[targetIndex]
    newActions[targetIndex] = newActions[index]
    newActions[index] = temp

    setActions(newActions)
  }

  /* --- Unified Action Handlers --- */

  const updateActionType = (index: number, type: TurnActionType, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const oldAction = newActions[index]
    
    newActions[index] = { 
        ...oldAction,
        type, 
        target: undefined, 
        deltas: [], 
        metadata: {} 
    }
    setter(newActions)
  }

  const updateActionTarget = (index: number, target: { side: "my" | "opponent", slotIndex: number } | undefined, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const action = newActions[index]
    
    action.target = target
    
    if (action.type === "switch" || action.type === "switch-after-ko") {
        const otherDeltas = action.deltas.filter(d => d.type !== "SWITCH")
        
        // Ensure a Switch delta always exists. 
        // toSlot: -1 signals "No replacement / Withdraw" to BattleEngine
        const newDelta: BattleDelta = {
            type: "SWITCH",
            side: action.actor.side,
            fromSlot: action.actor.slotIndex,
            toSlot: target ? target.slotIndex : -1
        }
        // Prepend switch so it happens before hazards/effects
        action.deltas = [newDelta, ...otherDeltas]
    }
    
    setter(newActions)
  }

  const updateActionMetadata = (index: number, metadata: { itemName?: string; attackName?: string }, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    newActions[index] = { 
        ...newActions[index], 
        metadata: { ...newActions[index].metadata, ...metadata } 
    }
    setter(newActions)
  }

  const toggleActionCollapse = (index: number, isPostTurn = false) => {
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    newActions[index] = { ...newActions[index], isCollapsed: !newActions[index].isCollapsed }
    setter(newActions)
  }

  const updateActionAttack = (index: number, attackName: string, moveName?: string, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const action = newActions[index]
    
    // Update metadata
    const newMetadata = { ...action.metadata, attackName }
    
    // Handle PP Delta
    let newDeltas = [...action.deltas]
    
    // 1. Remove existing PP_CHANGE deltas for this action (cleanup)
    newDeltas = newDeltas.filter(d => d.type !== "PP_CHANGE")
    
    // 2. If a specific move is identified (Dropdown selection), add a PP decrement delta
    if (moveName) {
         // Create PP Delta: Decrement via -1
         const ppDelta: BattleDelta = {
             type: "PP_CHANGE",
             target: action.actor,
             moveName: moveName,
             amount: -1
         }
         newDeltas.push(ppDelta)
    }
    
    newActions[index] = {
        ...action,
        metadata: newMetadata,
        deltas: newDeltas
    }
    
    setter(newActions)
  }

  /* --- Unified Delta Handlers --- */

  const addDeltaToAction = (actionIndex: number, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const action = newActions[actionIndex]
    
    // Default smart targeting: Priority to Target, Fallback to Actor
    let targetSlotSelector: { side: "my" | "opponent"; slotIndex: number } = action.target 
                           ? action.target 
                           : action.actor;

    if (action.deltas.filter(d => d.type === "HP_RELATIVE").length >= 1) {
         targetSlotSelector = action.target || action.actor
    }
    
    // For switches, we want to target the Battlefield Slot where the switch happens
    if (action.type === 'switch' || action.type === 'switch-after-ko') {
         // Get appropriate state for context
         const stateBefore = isPostTurn ? getPostTurnStateAt(actionIndex) : getStateAtAction(actionIndex)
         const activeSlots = action.actor.side === 'my' ? stateBefore.activeSlots?.myTeam : stateBefore.activeSlots?.opponentTeam
         const battlefieldSlot = activeSlots?.indexOf(action.actor.slotIndex)
         
         if (battlefieldSlot !== undefined && battlefieldSlot !== -1) {
             targetSlotSelector = { side: action.actor.side, slotIndex: battlefieldSlot }
         }
    }
    
    const newDelta = { type: "HP_RELATIVE", target: targetSlotSelector, amount: -0 } as const
    action.deltas = [...action.deltas, newDelta]
    setter(newActions)
  }

  const updateActionHpChange = (
    actionIndex: number,
    deltaIndex: number,
    field: "slot" | "value" | "isHealing",
    value: any,
    isPostTurn = false
  ) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const action = newActions[actionIndex]
    
    const delta = { ...action.deltas[deltaIndex] } as BattleDelta
    if (delta.type !== "HP_RELATIVE") return 

    if (field === "slot") {
        if (typeof value !== "string") delta.target = value
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
    setter(newActions)
  }

  const removeActionDelta = (actionIndex: number, deltaIndex: number, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    newActions[actionIndex].deltas = newActions[actionIndex].deltas.filter((_, i) => i !== deltaIndex)
    setter(newActions)
  }

  const moveActionDelta = (actionIndex: number, fromIndex: number, toIndex: number, isPostTurn = false) => {
    if (readOnly) return
    const setter = isPostTurn ? setPostTurnActions : setActions
    const list = isPostTurn ? postTurnActions : actions
    const newActions = [...list]
    const action = newActions[actionIndex]
    const deltas = [...action.deltas]
    
    if (toIndex < 0 || toIndex >= deltas.length) return
    
    const [moved] = deltas.splice(fromIndex, 1)
    deltas.splice(toIndex, 0, moved)
    
    action.deltas = deltas
    setter(newActions)
  }

  const handleDeleteAction = (index: number) => {
    if (readOnly) return
    const newActions = actions.filter((_, i) => i !== index)
    setActions(newActions)
  }

  // End of Turn Logic
  const addEndOfTurnDelta = () => {
    if (readOnly) return

    // Find a valid potential target (default to my first active slot, or opponent if none)
    const finalState = getStateAtAction(actions.length)
    let defaultTarget: { side: "my" | "opponent", slotIndex: number } = { side: "my", slotIndex: 0 }

    if (finalState.activeSlots?.myTeam[0] !== undefined && finalState.activeSlots?.myTeam[0] !== null) {
        defaultTarget = { side: "my", slotIndex: 0 }
    } else if (finalState.activeSlots?.opponentTeam[0] !== undefined && finalState.activeSlots?.opponentTeam[0] !== null) {
        defaultTarget = { side: "opponent", slotIndex: 0 }
    }

    setEndOfTurnDeltas([
      ...endOfTurnDeltas,
      { type: "HP_RELATIVE", target: defaultTarget, amount: -0 },
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
      postTurnActions,
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
    const activeSlots = state.activeSlots || { myTeam: [0], opponentTeam: [0] } // Safety fallback
    const limit = battleFormat === "double" ? 2 : 1
    
    // Get active slots for each side, respecting the limit
    const myActiveIndices = (activeSlots.myTeam || []).slice(0, limit)
    const enemyActiveIndices = (activeSlots.opponentTeam || []).slice(0, limit)

    return [
        ...myActiveIndices
            .filter((idx): idx is number => idx !== null && idx !== undefined)
            .map(idx => {
                const pokemon = state.myTeam[idx]
                if (!pokemon) return null
                return { pokemon, isAlly: true, slotIndex: idx }
            })
            .filter((p): p is NonNullable<typeof p> => p !== null),
            
        ...enemyActiveIndices
            .filter((idx): idx is number => idx !== null && idx !== undefined)
            .map(idx => {
                const pokemon = state.enemyTeam[idx]
                if (!pokemon) return null
                return { pokemon, isAlly: false, slotIndex: idx }
            })
            .filter((p): p is NonNullable<typeof p> => p !== null)
    ]
  }

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
      <div className="space-y-4">
        {turnNumber === 0 && (
          <InitialDeploymentManager 
            actions={actions}
            myTeam={myTeam}
            enemyTeam={enemyTeam}
            activeSlots={simulationState.activeSlots}
            onUpdateAction={(sliceIndex, newAction) => handleUpdateAction(sliceIndex, newAction)}
          />
        )}

        <div className="space-y-2">
          {actions.map((action, index) => {
            const isDeployment = turnNumber === 0
            if (isDeployment && action.type !== "switch-after-ko") return null // Handled by InitialDeploymentManager

            // --- Dynamic Context ---
            const stateBeforeAction = getStateAtAction(index)
            
            // Reconstruct active list for this specific moment
            const dynamicActivePokemon = getActivePokemonFromState(stateBeforeAction)

            // Actor resolution (using current state)
            const actorObj = dynamicActivePokemon.find(ap => 
                (ap.isAlly ? "my" : "opponent") === action.actor.side && 
                ap.slotIndex === action.actor.slotIndex
            )

            // Defusion is possible if the switch has fusedFrom metadata
            const canDefuse = action.type === "switch-after-ko" && !!action.metadata?.fusedFrom


            return (
              <div key={action.id} className="space-y-2">
                  <div className="relative">
                       <PokemonAction
                            action={action}
                            index={index}
                            totalActions={actions.length}
                            actor={actorObj}
                            activeSlots={stateBeforeAction.activeSlots}
                            onMove={(direction) => !readOnly && moveAction(index, direction)}
                            onToggleCollapse={() => toggleActionCollapse(index)} 
                            onUpdateType={(type) => !readOnly && updateActionType(index, type)}
                            onUpdateTarget={(target) => !readOnly && updateActionTarget(index, target)}
                            onUpdateMetadata={(metadata) => !readOnly && updateActionMetadata(index, metadata)}
                            onUpdateAttack={(name, moveId) => !readOnly && updateActionAttack(index, name, moveId)}
                            onAddHpChange={() => !readOnly && addDeltaToAction(index)}
                            onUpdateHpChange={(deltaIndex, field, value) => !readOnly && updateActionHpChange(index, deltaIndex, field, value)}
                            onRemoveHpChange={(deltaIndex) => !readOnly && removeActionDelta(index, deltaIndex)}
                            onMoveHpChange={(from, to) => !readOnly && moveActionDelta(index, from, to)}
                            myTeam={stateBeforeAction.myTeam} 
                            enemyTeam={stateBeforeAction.enemyTeam} 
                            onDelete={() => !readOnly && handleDeleteAction(index)}
                            canMoveUp={action.type !== "switch-after-ko" && !readOnly && index > 0}
                            canMoveDown={action.type !== "switch-after-ko" && !readOnly && index < actions.length - 1 && actions[index + 1]?.type !== "switch-after-ko"}
                            canDefuse={!readOnly && canDefuse}
                        />
                  </div>
              </div>
            )
          })}
        </div>
      </div>

      {turnNumber !== 0 && (
        <div className="border-t pt-4">
            <EffectsList 
                title="End of Turn Effects"
                deltas={endOfTurnDeltas}
                options={(() => {
                    const finalState = getStateAtAction(actions.length)
                    const myActive = finalState.activeSlots?.myTeam || []
                    const oppActive = finalState.activeSlots?.opponentTeam || []
                    
                    const opts: { label: string; value: { side: "my" | "opponent"; slotIndex: number }; isAlly: boolean }[] = []

                    // My Team Active Slots
                    myActive.forEach((teamIndex, battlefieldSlot) => {
                        if (teamIndex !== null && finalState.myTeam[teamIndex]) {
                            opts.push({
                                label: finalState.myTeam[teamIndex].name,
                                value: { side: "my" as const, slotIndex: battlefieldSlot }, // Use Battlefield Slot
                                isAlly: true
                            })
                        }
                    })

                    // Opponent Team Active Slots
                    oppActive.forEach((teamIndex, battlefieldSlot) => {
                        if (teamIndex !== null && finalState.enemyTeam[teamIndex]) {
                            opts.push({
                                label: finalState.enemyTeam[teamIndex].name,
                                value: { side: "opponent" as const, slotIndex: battlefieldSlot }, // Use Battlefield Slot
                                isAlly: false
                            })
                        }
                    })
                    
                    return opts
                })()}
                onAdd={addEndOfTurnDelta}
                onUpdate={!readOnly ? ((index: number, field: "slot" | "value" | "isHealing", value: any) => updateEndOfTurnDelta(index, field, value)) : () => {}}
                onRemove={!readOnly ? ((index: number) => removeEndOfTurnDelta(index)) : () => {}}
                addButtonLabel="Add Effect"
            />
        </div>
      )}

      {/* Post-Turn Switches (End of Turn KOs) */}
      {postTurnActions.length > 0 && (
          <div className="pt-2">
              <div className="space-y-2">
                  {postTurnActions.map((action, index) => {
                       // Use unified simulation helper to get the state before this post-turn action
                       const stateForContext = getPostTurnStateAt(index)
                       const activePokemonForContext = getActivePokemonFromState(stateForContext)

                       // Identify the actor in the context of the previous state
                       const actorObj = activePokemonForContext.find(ap => 
                            (ap.isAlly ? "my" : "opponent") === action.actor.side && 
                            ap.slotIndex === action.actor.slotIndex
                       )

                      return (
                          <div key={action.id}>
                              <PokemonAction
                                  action={action}
                                  index={index}
                                  totalActions={postTurnActions.length}
                                  actor={actorObj}
                                  // Handlers targeting postTurnActions
                                  onMove={() => {}} 
                                  onToggleCollapse={() => {
                                      const newActions = [...postTurnActions]
                                      newActions[index].isCollapsed = !newActions[index].isCollapsed
                                      setPostTurnActions(newActions)
                                  }}
                                  onUpdateType={(type) => updateActionType(index, type, true)} 
                                  onUpdateTarget={(t) => updateActionTarget(index, t, true)}
                                  onUpdateMetadata={(metadata) => updateActionMetadata(index, metadata, true)}
                                  onUpdateAttack={(name, moveId) => updateActionAttack(index, name, moveId, true)}
                                  onAddHpChange={() => addDeltaToAction(index, true)}
                                  onUpdateHpChange={(di, f, v) => updateActionHpChange(index, di, f, v, true)}
                                  onRemoveHpChange={(di) => removeActionDelta(index, di, true)}
                                  onMoveHpChange={(fi, ti) => moveActionDelta(index, fi, ti, true)}
                                  
                                  // Context
                                  activeSlots={stateForContext.activeSlots || { myTeam: [0], opponentTeam: [0] }}
                                  myTeam={stateForContext.myTeam}
                                  enemyTeam={stateForContext.enemyTeam}
                                  
                                  onDelete={() => {}} 
                                  canMoveUp={false}
                                  canMoveDown={false}
                                  canDefuse={false}
                              />
                          </div>
                      )
                  })}
              </div>
          </div>
      )}

      {!autoSave && (
        <Button onClick={handleSave} className="w-full h-12 text-lg font-bold shadow-md" disabled={readOnly}>
            {saveLabel}
        </Button>
      )}
    </div>
  )
}