import { BattleState, Effect, Pokemon, TurnAction } from "@/types/types"
import { useMemo } from "react"
import { BattleEngine } from "../logic/battle-engine"

interface UseTurnSimulationProps {
  initialState: BattleState | undefined
  actions: TurnAction[]
  endOfTurnEffects: Effect[]
  postTurnActions?: TurnAction[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlotsCount?: number
  hpMode?: "percent" | "hp" | "rolls"
}

export interface KODetected {
  pokemon: Pokemon
  isAlly: boolean
  slotIndex: number // The field slot (0 or 1) the Pokémon occupied
  causedByEntryHazards?: boolean
}

export function useTurnSimulation({
  initialState,
  actions,
  endOfTurnEffects,
  postTurnActions,
  myTeam,
  enemyTeam,
  activeSlotsCount = 1,
  hpMode = "percent",
}: UseTurnSimulationProps) {
  
  // 1. Ensure we have a valid starting state
  const safeInitialState: BattleState = useMemo(() => {
    if (initialState) return initialState

    return {
      myTeam: JSON.parse(JSON.stringify(myTeam)),
      enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
      activeSlots: { 
          myTeam: Array.from({ length: activeSlotsCount }, (_, i) => i), 
          opponentTeam: Array.from({ length: activeSlotsCount }, (_, i) => i) 
      }, 
      battlefieldState: {
        customTags: [],
        playerSide: { customTags: [] },
        opponentSide: { customTags: [] },
      },
    }
  }, [initialState, myTeam, enemyTeam, activeSlotsCount])

  // 2. Flatten the timeline: Actions -> EndOfTurn -> PostTurnActions
  const allActions = useMemo(() => {
      // Synthetic action for End of Turn
      const eotAction: TurnAction = {
          id: "end-of-turn-synthetic",
          type: "simulated-turn-end" as any, 
          actor: { side: "my", slotIndex: -1 },
          target: undefined,
          actionDeltas: [],
          effects: endOfTurnEffects || [],
          isCollapsed: true
      }

      return [...actions, eotAction, ...(postTurnActions || [])]
  }, [actions, endOfTurnEffects, postTurnActions])

  // 3. Compute the full sequence of states
  const computedStates = useMemo(() => {
    return BattleEngine.computeTurnSequence(safeInitialState, allActions, hpMode)
  }, [safeInitialState, allActions, hpMode])

  // 4. Detect KOs across the entire timeline
  const detectedKOs = useMemo(() => {
    const kos: Record<number, KODetected[]> = {}
    
    // We iterate through all transitions in the flattened timeline
    for (let i = 0; i < computedStates.length - 1; i++) {
        const stateBefore = computedStates[i]
        const stateAfter = computedStates[i+1]
        
        // Match the action at this step to determine if it's a switch (for hazard flag)
        const action = allActions[i]
        const isSwitch = action?.type === "switch" || action?.type === "switch-after-ko"
        // Also consider post-EOT KOs as hazard-triggered by default if not a main action
        const isPostMain = i >= actions.length

        const currentKOs: KODetected[] = []

        const checkTeam = (isAlly: boolean) => {
            const team = isAlly ? stateAfter.myTeam : stateAfter.enemyTeam
            const prevTeam = isAlly ? stateBefore.myTeam : stateBefore.enemyTeam
            const activeSlots = isAlly ? stateBefore.activeSlots?.myTeam : stateBefore.activeSlots?.opponentTeam
            
            // Iterate the entire team to detect any HP dropping to 0
            team.forEach((p_after, idx) => {
                const p_before = prevTeam[idx]
                if (p_before && p_after) {
                    if (p_before.hpPercent > 0 && p_after.hpPercent === 0) {
                        // Find the slot index for this team index
                        const slotIndex = (activeSlots || []).indexOf(idx)
                        
                        // We only process KOs of Pokémon that were on the field
                        if (slotIndex !== -1) {
                            currentKOs.push({ 
                                pokemon: p_after, 
                                isAlly, 
                                slotIndex,
                                causedByEntryHazards: isSwitch || (isPostMain && i > actions.length)
                            })
                        }
                    }
                }
            })
        }

        checkTeam(true)
        checkTeam(false)

        if (currentKOs.length > 0) {
            kos[i] = currentKOs
        }
    }
    return kos
  }, [computedStates, allActions, actions.length])

  // 5. Extract Final State
  const finalState = computedStates[computedStates.length - 1]

  // 6. Compute specialized lists for backward compatibility / specific UI needs
  const endOfTurnKOs = useMemo(() => {
      const eotIndex = actions.length // Index of the synthetic EOT Action
      const relevantKOs: { pokemon: Pokemon, isAlly: boolean, causedByEntryHazards?: boolean }[] = []
      
      // Collect KOs from EOT action onwards
      for (let i = eotIndex; i < computedStates.length - 1; i++) {
          const stepKOs = detectedKOs[i] || []
          stepKOs.forEach(k => relevantKOs.push(k))
      }
      return relevantKOs
  }, [detectedKOs, actions.length, computedStates.length])

  // 7. Helpers for UI mapping
  const getStateAtAction = (index: number): BattleState => {
    if (index < 0) return computedStates[0]
    if (index >= computedStates.length) return computedStates[computedStates.length - 1]
    return computedStates[index]
  }

  // Helper to get state specific to Post-Turn actions
  const getPostTurnStateAt = (index: number) => {
      const startOfPostTurnIdx = actions.length + 1
      return getStateAtAction(startOfPostTurnIdx + index)
  }

  return { 
      computedStates, 
      detectedKOs, 
      endOfTurnKOs, 
      finalState, 
      getStateAtAction,
      getPostTurnStateAt 
  }
}
