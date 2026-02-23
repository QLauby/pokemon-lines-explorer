"use client"

/**
 * use-turn-initialization.ts
 * Determines the initial set of actions when a TurnEditor mounts or changes turn/format.
 * Handles 3 cases:
 *   1. Loading existing turn data (initialTurnData provided)
 *   2. Turn 0: generating deployment (self-switch) actions
 *   3. Turn 1+: generating default attack actions from active Pokémon
 */

import { Effect, Pokemon, TurnAction, TurnData } from "@/types/types"
import { Dispatch, SetStateAction, useEffect } from "react"

interface UseTurnInitializationProps {
  initialTurnData?: TurnData
  turnNumber: number
  battleFormat: "simple" | "double"
  initialActivePokemon: { pokemon: Pokemon | undefined; isAlly: boolean }[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  setActions: Dispatch<SetStateAction<TurnAction[]>>
  setEndOfTurnEffects: Dispatch<SetStateAction<Effect[]>>
  setPostTurnActions: Dispatch<SetStateAction<TurnAction[]>>
  hpMode?: "percent" | "hp"
}

export function useTurnInitialization({
  initialTurnData,
  turnNumber,
  battleFormat,
  initialActivePokemon,
  myTeam,
  enemyTeam,
  setActions,
  setEndOfTurnEffects,
  setPostTurnActions,
  hpMode,
}: UseTurnInitializationProps) {
  useEffect(() => {
    // ── Case 1: Load existing data ──────────────────────────────
    if (initialTurnData && initialTurnData.actions.length > 0) {
      let loadedActions: TurnAction[] = JSON.parse(JSON.stringify(initialTurnData.actions))

      // Trim slots that exceed the current format limit (prevents stale double-battle data)
      if (turnNumber === 0) {
        const limit = battleFormat === "double" ? 2 : 1
        loadedActions = loadedActions.filter(a => a.actor.slotIndex < limit)
      }

      setActions(loadedActions)
      setEndOfTurnEffects(
        initialTurnData.endOfTurnEffects
          ? JSON.parse(JSON.stringify(initialTurnData.endOfTurnEffects))
          : []
      )
      setPostTurnActions(
        initialTurnData.postTurnActions
          ? JSON.parse(JSON.stringify(initialTurnData.postTurnActions))
          : []
      )
      return
    }

    // ── Case 2: Turn 0 — Deployment phase ─────────────────────
    if (turnNumber === 0) {
      const slotsCount = battleFormat === "double" ? 2 : 1
      const deploymentActions: TurnAction[] = []

      for (let i = 0; i < slotsCount; i++) {
        deploymentActions.push({
          id: `deploy-my-${i}`,
          type: "switch",
          actor: { side: "my", slotIndex: i },
          target: { side: "my", slotIndex: i },
          actionDeltas: [],
          effects: [],
          isCollapsed: true,
        })
        deploymentActions.push({
          id: `deploy-opp-${i}`,
          type: "switch",
          actor: { side: "opponent", slotIndex: i },
          target: { side: "opponent", slotIndex: i },
          actionDeltas: [],
          effects: [],
          isCollapsed: true,
        })
      }

      setActions(deploymentActions)

      if (initialTurnData) {
        setEndOfTurnEffects(
          initialTurnData.endOfTurnEffects
            ? JSON.parse(JSON.stringify(initialTurnData.endOfTurnEffects))
            : []
        )
      }
      return
    }

    // ── Case 3: Turn 1+ — Default attack actions ───────────────
    const resolvedActions: TurnAction[] = initialActivePokemon.map(ap => {
      const side: "my" | "opponent" = ap.isAlly ? "my" : "opponent"
      const team = ap.isAlly ? myTeam : enemyTeam
      const slotIndex = team.findIndex(p => p.id === ap.pokemon?.id)

      return {
        id: `default-${side}-${slotIndex}`,
        actor: { side, slotIndex },
        type: "attack",
        actionDeltas: [],
        effects: [],
        isCollapsed: true,
      }
    })
    setActions(resolvedActions)

    if (initialTurnData) {
      setEndOfTurnEffects(
        initialTurnData.endOfTurnEffects
          ? JSON.parse(JSON.stringify(initialTurnData.endOfTurnEffects))
          : []
      )
    }
  // Only re-initialize when the turn number, format, or hpMode changes, not on every save
  }, [turnNumber, battleFormat, hpMode])
}
