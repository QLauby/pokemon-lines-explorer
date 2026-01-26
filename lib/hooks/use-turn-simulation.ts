import { BattleState, Pokemon, TurnAction } from "@/types/types"
import { useMemo } from "react"
import { BattleEngine } from "../logic/battle-engine"

interface UseTurnSimulationProps {
  initialState: BattleState | undefined
  actions: TurnAction[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
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
}: UseTurnSimulationProps) {
  
  // 1. Ensure we have a valid starting state
  const safeInitialState: BattleState = useMemo(() => {
    if (initialState) return initialState

    return {
      myTeam: JSON.parse(JSON.stringify(myTeam)),
      enemyTeam: JSON.parse(JSON.stringify(enemyTeam)),
      activeStarters: { myTeam: [0], opponentTeam: [0] }, // Default fallback
      battlefieldState: {
        customTags: [],
        playerSide: { customTags: [] },
        opponentSide: { customTags: [] },
      },
      expandedPokemonIds: [],
    }
  }, [initialState, myTeam, enemyTeam])

  // 2. Compute the full sequence of states
  const computedStates = useMemo(() => {
    return BattleEngine.computeTurnSequence(safeInitialState, actions)
  }, [safeInitialState, actions])

  // 3. Detect KOs by comparing state transition for each action
  const detectedKOs = useMemo(() => {
    const kos: Record<number, KODetected[]> = {}

    // computedStates has length actions.length + 1
    // State[i] is BEFORE Action[i]
    // State[i+1] is AFTER Action[i]
    
    actions.forEach((_, actionIndex) => {
      const stateBefore = computedStates[actionIndex]
      const stateAfter = computedStates[actionIndex + 1]

      if (!stateBefore || !stateAfter) return

      const currentKOs: KODetected[] = []

      // Check My Team
      stateAfter.myTeam.forEach((p, idx) => {
        const prevP = stateBefore.myTeam[idx]
        if (prevP && prevP.hpPercent > 0 && p.hpPercent === 0) {
          currentKOs.push({ pokemon: p, isAlly: true })
        }
      })

      // Check Enemy Team
      stateAfter.enemyTeam.forEach((p, idx) => {
        const prevP = stateBefore.enemyTeam[idx]
        if (prevP && prevP.hpPercent > 0 && p.hpPercent === 0) {
          currentKOs.push({ pokemon: p, isAlly: false })
        }
      })

      if (currentKOs.length > 0) {
        kos[actionIndex] = currentKOs
      }
    })

    return kos
  }, [computedStates, actions])

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
