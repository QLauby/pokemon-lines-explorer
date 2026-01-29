import { BattleState, TurnAction } from "@/types/types"
import { useMemo } from "react"

interface BattleEndResult {
  isBattleEnd: boolean
  winner: 'player' | 'opponent' | null
}

interface UseBattleEndProps {
  battleState: BattleState
  previousTurnActions?: TurnAction[]
  getStateAtAction?: (index: number) => BattleState
}

export function useBattleEnd({ 
  battleState, 
  previousTurnActions = [],
  getStateAtAction
}: UseBattleEndProps): BattleEndResult {
  
  return useMemo(() => {
    const myActiveCount = battleState.activeSlots?.myTeam?.filter(s => s !== null).length || 0
    const opponentActiveCount = battleState.activeSlots?.opponentTeam?.filter(s => s !== null).length || 0
    
    // No battle end
    if (myActiveCount > 0 && opponentActiveCount > 0) {
      return { isBattleEnd: false, winner: null }
    }
    
    // Clear winner: opponent has no active Pokémon
    if (opponentActiveCount === 0 && myActiveCount > 0) {
      return { isBattleEnd: true, winner: 'player' }
    }
    
    // Clear loser: player has no active Pokémon
    if (myActiveCount === 0 && opponentActiveCount > 0) {
      return { isBattleEnd: true, winner: 'opponent' }
    }
    
    // Tie - both players have no active Pokémon
    // Winner is determined by who lost their last Pokémon LAST
    // If my Pokémon died last, I win (opponent's died first)
    const lastKO = findLastKO(previousTurnActions, getStateAtAction)
    
    return { 
      isBattleEnd: true, 
      winner: lastKO?.side === 'my' ? 'player' : 'opponent'
    }
  }, [battleState.activeSlots, previousTurnActions, getStateAtAction])
}

function findLastKO(
  actions: TurnAction[], 
  getStateAtAction?: (index: number) => BattleState
): { side: 'my' | 'opponent', actionIndex: number, deltaIndex: number } | null {
  
  if (!getStateAtAction) return null
  
  let lastKO: { side: 'my' | 'opponent', actionIndex: number, deltaIndex: number } | null = null
  
  actions.forEach((action, actionIdx) => {
    action.deltas?.forEach((delta, deltaIdx) => {
      if (delta.type === 'HP_RELATIVE' && delta.target) {
        const stateBefore = getStateAtAction(actionIdx)
        const stateAfter = getStateAtAction(actionIdx + 1)
        
        const teamBefore = delta.target.side === 'my' ? stateBefore.myTeam : stateBefore.enemyTeam
        const teamAfter = delta.target.side === 'my' ? stateAfter.myTeam : stateAfter.enemyTeam
        
        const pokemonBefore = teamBefore[delta.target.slotIndex]
        const pokemonAfter = teamAfter[delta.target.slotIndex]
        
        // Check if this delta caused a KO
        if (pokemonBefore && pokemonAfter && 
            pokemonBefore.hpPercent > 0 && pokemonAfter.hpPercent === 0) {
          
          // Update if this is the latest KO
          if (!lastKO || actionIdx > lastKO.actionIndex || 
              (actionIdx === lastKO.actionIndex && deltaIdx > lastKO.deltaIndex)) {
            lastKO = { side: delta.target.side, actionIndex: actionIdx, deltaIndex: deltaIdx }
          }
        }
      }
    })
  })
  
  return lastKO
}
