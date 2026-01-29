import { BattleState, Pokemon, TurnAction } from "@/types/types"
import { useMemo } from "react"
import { BattleEngine } from "../logic/battle-engine"

interface UseTurnSimulationProps {
  initialState: BattleState | undefined
  actions: TurnAction[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlotsCount?: number
}

export interface KODetected {
  pokemon: Pokemon
  isAlly: boolean
}

export function useTurnSimulation({
  initialState,
  actions,
  myTeam,
  enemyTeam,
  activeSlotsCount = 1,
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
      }, // Default fallback respected activeSlotsCount
      battlefieldState: {
        customTags: [],
        playerSide: { customTags: [] },
        opponentSide: { customTags: [] },
      },
    }
  }, [initialState, myTeam, enemyTeam])

  // 2. Compute the full sequence of states
  const computedStates = useMemo(() => {
    return BattleEngine.computeTurnSequence(safeInitialState, actions)
  }, [safeInitialState, actions])

  // 3. Detect KOs by comparing state transition for each action
  const detectedKOs = useMemo(() => {
    const kos: Record<number, KODetected[]> = {}
    
    actions.forEach((_, actionIndex) => {
      const stateBefore = computedStates[actionIndex]
      const stateAfter = computedStates[actionIndex + 1]

      if (!stateBefore || !stateAfter) return

      const currentKOs: KODetected[] = []

      // Check My Team (Active Slots Only)
      const myActiveIndices = stateAfter.activeSlots?.myTeam || [0]
      myActiveIndices.forEach((idx) => {
        if (idx === null || idx === undefined) return
        const p = stateAfter.myTeam[idx]
        const prevP = stateBefore.myTeam[idx]
        
        if (p && prevP && prevP.hpPercent > 0 && p.hpPercent === 0) {
          currentKOs.push({ pokemon: p, isAlly: true })
        }
      })

      // Check Enemy Team (Active Slots Only)
      const enemyActiveIndices = stateAfter.activeSlots?.opponentTeam || [0]
      enemyActiveIndices.forEach((idx) => {
        if (idx === null || idx === undefined) return
        const p = stateAfter.enemyTeam[idx]
        const prevP = stateBefore.enemyTeam[idx]
       
        if (p && prevP && prevP.hpPercent > 0 && p.hpPercent === 0) {
          currentKOs.push({ pokemon: p, isAlly: false })
        }
      })

      if (currentKOs.length > 0) {
        kos[actionIndex] = currentKOs
      }
    })

    return kos
  }, [computedStates, actions, activeSlotsCount])

  // 4. Helper to get the state visible to the user at a specific step (before the action occurs)
  const getStateAtAction = (index: number): BattleState => {
    if (index < 0) return computedStates[0]
    if (index >= computedStates.length) return computedStates[computedStates.length - 1]
    return computedStates[index]
  }

  return {
    computedStates,
    detectedKOs,
    getStateAtAction,
  }
}
