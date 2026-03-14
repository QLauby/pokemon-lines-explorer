"use client"

/**
 * use-turn-editor-state.ts
 * Centralizes all state mutations for the TurnEditor component.
 * Encapsulates actions, endOfTurnEffects, and postTurnActions state + their handlers.
 */

import { Effect, SlotReference, TurnAction, TurnActionType } from "@/types/types"
import { useState } from "react"

export function useTurnEditorState(readOnly: boolean, hpMode: "percent" | "hp" = "percent") {
  const [actions, setActions] = useState<TurnAction[]>([])
  const [endOfTurnEffects, setEndOfTurnEffects] = useState<Effect[]>([])
  const [postTurnActions, setPostTurnActions] = useState<TurnAction[]>([])

  /* ─── helpers ─────────────────────────────────────────────── */

  /** Resolve which list & setter to use (main turn vs post-turn) */
  const resolve = (isPostTurn: boolean) =>
    isPostTurn
      ? { list: postTurnActions, setter: setPostTurnActions }
      : { list: actions, setter: setActions }

  /* ─── Action reordering ───────────────────────────────────── */

  const canMoveActionUp = (index: number): boolean => {
    if (index === 0) return false
    const action = actions[index]
    if (action.type === "switch-after-ko") {
      return !!(action.triggeredByKO || (action.metadata as any)?.fusedFrom)
    }
    return true
  }

  const canMoveActionDown = (index: number): boolean => {
    if (index >= actions.length - 1) return false
    const action = actions[index]
    const nextAction = actions[index + 1]
    if (action.type !== "switch-after-ko" && nextAction.type === "switch-after-ko") return false
    return true
  }

  /**
   * Moves an action up or down. If the action is a fused switch-after-ko being moved up,
   * triggers defusion: restores the original attack action and unfuses the switch.
   */
  const moveAction = (
    index: number,
    direction: "up" | "down",
    detectedKOs: Record<number, { pokemon: { id: string }; isAlly: boolean }[]>,
    simulationStateActiveSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] },
    myTeam: { id: string }[],
    enemyTeam: { id: string }[]
  ) => {
    if (readOnly) return
    if (direction === "up" && !canMoveActionUp(index)) return
    if (direction === "down" && !canMoveActionDown(index)) return

    const newActions = [...actions]
    const isTriggeredByKO = actions[index].triggeredByKO || (actions[index].metadata as any)?.fusedFrom

    // DEFUSION PATH
    if (direction === "up" && actions[index].type === "switch-after-ko" && isTriggeredByKO) {
      const fusedSwitch = actions[index]

      const restoredAction: TurnAction = {
        id: crypto.randomUUID(),
        actor: fusedSwitch.actor,
        type: "attack",
        target: undefined,
        actionDeltas: [],
        effects: [],
        metadata: {},
        isCollapsed: true,
      }

      const unfusedSwitch: TurnAction = {
        ...fusedSwitch,
        metadata: {},
        triggeredByKO: false,
      }

      // Find which action caused the KO for this slot
      let koTriggerIndex = -1
      for (const [actionIndexStr, kos] of Object.entries(detectedKOs)) {
        const actionIndex = parseInt(actionIndexStr, 10)
        const team = fusedSwitch.actor.side === "my" ? myTeam : enemyTeam
        const slots =
          fusedSwitch.actor.side === "my"
            ? simulationStateActiveSlots.myTeam
            : simulationStateActiveSlots.opponentTeam
        const teamIndex = slots[fusedSwitch.actor.slotIndex] ?? -1
        const koedPokemonId = team[teamIndex]?.id

        const hasMatchingKO = kos.some(
          ko => ko.isAlly === (fusedSwitch.actor.side === "my") && ko.pokemon.id === koedPokemonId
        )
        if (hasMatchingKO) {
          koTriggerIndex = actionIndex
          break
        }
      }

      newActions.splice(index, 1)

      if (koTriggerIndex >= 0) {
        const adjustedIndex = koTriggerIndex > index ? koTriggerIndex - 1 : koTriggerIndex
        newActions.splice(adjustedIndex, 0, restoredAction)
      } else {
        newActions.unshift(restoredAction)
      }

      newActions.push(unfusedSwitch)
      setActions(newActions)
      return
    }

    // NORMAL SWAP PATH
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const temp = newActions[targetIndex]
    newActions[targetIndex] = newActions[index]
    newActions[index] = temp
    setActions(newActions)
  }

  /* ─── Action field updates ────────────────────────────────── */

  const updateActionType = (index: number, type: TurnActionType, isPostTurn = false) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    newActions[index] = {
      ...newActions[index],
      type,
      target: undefined,
      actionDeltas: [],
      effects: [],
      metadata: {},
    }
    setter(newActions)
  }

  const updateActionTarget = (
    index: number,
    target: SlotReference | undefined,
    isPostTurn = false
  ) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    const action = { ...newActions[index], target }

    if (action.type === "switch" || action.type === "switch-after-ko") {
      action.actionDeltas = [
        {
          type: "SWITCH",
          side: action.actor.side,
          fromSlot: -1,
          toSlot: target ? target.slotIndex : -1,
          slotIndex: action.actor.slotIndex,
        },
      ]
      action.effects = action.effects.filter(e => e.deltas.every(d => d.type !== "SWITCH"))
    }

    newActions[index] = action
    setter(newActions)
  }

  const updateActionMetadata = (
    index: number,
    metadata: { itemName?: string; attackName?: string },
    isPostTurn = false
  ) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    newActions[index] = {
      ...newActions[index],
      metadata: { ...newActions[index].metadata, ...metadata },
    }
    setter(newActions)
  }

  const updateActionAttack = (
    index: number,
    attackName: string,
    moveName?: string,
    isPostTurn = false
  ) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    const action = newActions[index]

    const ppAmount = action.metadata?.ppAmount ?? 1
    const otherDeltas = (action.actionDeltas || []).filter(d => d.type !== "PP_CHANGE")
    const newActionDeltas = moveName
      ? [...otherDeltas, { type: "PP_CHANGE" as const, target: action.actor, moveName, amount: -ppAmount }]
      : otherDeltas

    newActions[index] = {
      ...action,
      metadata: { ...action.metadata, attackName },
      actionDeltas: newActionDeltas,
      effects: action.effects.filter(e => !e.deltas.some(d => d.type === "PP_CHANGE")),
    }
    setter(newActions)
  }

  const updateActionPpAmount = (index: number, amount: number, isPostTurn = false) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    const action = { ...newActions[index] }
    
    // Update metadata
    action.metadata = { ...action.metadata, ppAmount: amount }

    // Update the PP_CHANGE delta amount if it exists
    action.actionDeltas = (action.actionDeltas || []).map(d => {
        if (d.type === "PP_CHANGE") {
            return { ...d, amount: -amount }
        }
        return d
    })

    newActions[index] = action
    setter(newActions)
  }

  const toggleActionCollapse = (index: number, isPostTurn = false) => {
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    newActions[index] = { ...newActions[index], isCollapsed: !newActions[index].isCollapsed }
    setter(newActions)
  }

  const handleDeleteAction = (index: number) => {
    if (readOnly) return
    setActions(actions.filter((_, i) => i !== index))
  }

  const handleUpdateAction = (index: number, action: TurnAction) => {
    if (readOnly) return
    const newActions = [...actions]
    newActions[index] = action
    setActions(newActions)
  }

  /* ─── Per-action effect handlers ─────────────────────────── */

  const addEffectToAction = (
    actionIndex: number,
    isPostTurn = false,
    defaultTargetOverride?: SlotReference
  ) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    const action = newActions[actionIndex]

    const isSwitch = action.type === "switch" || action.type === "switch-after-ko"
    const defaultTarget: SlotReference = defaultTargetOverride
      ? defaultTargetOverride
      : isSwitch
      ? { type: "battlefield_slot", side: action.actor.side, slotIndex: Number((action.actor as any).slotIndex) }
      : action.target || action.actor

    const newEffect: Effect = {
      type: "hp-change",
      target: { ...defaultTarget },
      deltas: [{ type: "HP_RELATIVE", target: { ...defaultTarget }, amount: 0, unit: hpMode }],
    }

    newActions[actionIndex] = { ...action, effects: [...action.effects, newEffect] }
    setter(newActions)
  }

  const updateEffectInAction = (
    actionIndex: number,
    effectIndex: number,
    newEffect: Effect,
    isPostTurn = false
  ) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    const newEffects = [...newActions[actionIndex].effects]
    newEffects[effectIndex] = newEffect
    newActions[actionIndex] = { ...newActions[actionIndex], effects: newEffects }
    setter(newActions)
  }

  const removeEffectFromAction = (actionIndex: number, effectIndex: number, isPostTurn = false) => {
    if (readOnly) return
    const { list, setter } = resolve(isPostTurn)
    const newActions = [...list]
    newActions[actionIndex] = {
      ...newActions[actionIndex],
      effects: newActions[actionIndex].effects.filter((_, i) => i !== effectIndex),
    }
    setter(newActions)
  }

  /* ─── End-of-Turn effect handlers ────────────────────────── */

  const addEndOfTurnEffect = (defaultTarget: SlotReference) => {
    if (readOnly) return
    const newEffect: Effect = {
      type: "hp-change",
      target: { ...defaultTarget },
      deltas: [{ type: "HP_RELATIVE", target: { ...defaultTarget }, amount: 0, unit: hpMode }],
    }
    setEndOfTurnEffects(prev => [...prev, newEffect])
  }

  const updateEndOfTurnEffect = (index: number, newEffect: Effect) => {
    if (readOnly) return
    setEndOfTurnEffects(prev => {
      const updated = [...prev]
      updated[index] = newEffect
      return updated
    })
  }

  const removeEndOfTurnEffect = (index: number) => {
    if (readOnly) return
    setEndOfTurnEffects(prev => prev.filter((_, i) => i !== index))
  }

  return {
    // State
    actions,
    setActions,
    endOfTurnEffects,
    setEndOfTurnEffects,
    postTurnActions,
    setPostTurnActions,

    // Action handlers
    canMoveActionUp,
    canMoveActionDown,
    moveAction,
    updateActionType,
    updateActionTarget,
    updateActionMetadata,
    updateActionAttack,
    updateActionPpAmount,
    toggleActionCollapse,
    handleDeleteAction,
    handleUpdateAction,

    // Per-action effect handlers
    addEffectToAction,
    updateEffectInAction,
    removeEffectFromAction,

    // End-of-Turn effect handlers
    addEndOfTurnEffect,
    updateEndOfTurnEffect,
    removeEndOfTurnEffect,
  }
}
