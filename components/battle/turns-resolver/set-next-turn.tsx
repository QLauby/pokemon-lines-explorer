"use client"

import { AlertTriangle } from "lucide-react"
import { useCallback, useEffect } from "react"

import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { useBattleEnd } from "@/lib/hooks/use-battle-end"
import { useTurnSimulation } from "@/lib/hooks/use-turn-simulation"
import { BattleState, Pokemon, TreeNode, TurnData } from "@/types/types"
import { BattleEndMessage } from "./battle-end-message"
import { TurnEditor } from "./shared/turn-editor"

interface SetNextTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onChange?: (update: { mode: "add" | "update"; turnData: TurnData | null }) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  battleType: "simple" | "double"
  currentBattleState?: BattleState
  initialBattleState?: BattleState
}


export function SetNextTurn({
  activePokemon,
  onAddAction,
  onChange,
  myTeam,
  enemyTeam,
  nodes,
  selectedNodeId,
  battleType,
  currentBattleState,
  initialBattleState,
}: SetNextTurnProps) {
  const { isCorrupted } = useCorruptionHandler()

  const selectedNode = nodes.get(selectedNodeId)
  const nextTurnNumber = (selectedNode?.turn || 0) + 1
  
  // Check for battle end using activePokemon (already includes KO fusions)
  const myActiveCount = activePokemon.filter(p => p.isAlly).length
  const opponentActiveCount = activePokemon.filter(p => !p.isAlly).length
  
  let battleEnd: { isBattleEnd: boolean, winner: 'player' | 'opponent' | null } = { 
    isBattleEnd: false, 
    winner: null 
  }
  
  // No battle end
  if (myActiveCount > 0 && opponentActiveCount > 0) {
    battleEnd = { isBattleEnd: false, winner: null }
  }
  // Clear winner: opponent has no active Pokémon
  else if (opponentActiveCount === 0 && myActiveCount > 0) {
    battleEnd = { isBattleEnd: true, winner: 'player' }
  }
  // Clear loser: player has no active Pokémon
  else if (myActiveCount === 0 && opponentActiveCount > 0) {
    battleEnd = { isBattleEnd: true, winner: 'opponent' }
  }
  // Tie - both players have no active Pokémon
  else if (myActiveCount === 0 && opponentActiveCount === 0) {
    // Use the full battle end hook for tie-breaker logic
    const { getStateAtAction } = useTurnSimulation({
      initialState: initialBattleState,
      actions: selectedNode?.turnData?.actions || [],
      endOfTurnEffects: selectedNode?.turnData?.endOfTurnEffects || [],
      myTeam,
      enemyTeam,
      activeSlotsCount: battleType === "double" ? 2 : 1
    })
    
    const tieBreaker = useBattleEnd({
      battleState: currentBattleState || { myTeam, enemyTeam, activeSlots: { myTeam: [], opponentTeam: [] }, battlefieldState: {} as any },
      previousTurnActions: selectedNode?.turnData?.actions,
      getStateAtAction
    })
    
    battleEnd = tieBreaker
  }

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange({ mode: "add", turnData: null })
    }
  }, [onChange])

  const handleTurnChange = useCallback((turnData: TurnData) => {
      onChange?.({ mode: "add", turnData })
  }, [onChange])

  if (isCorrupted) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
         <AlertTriangle className="h-5 w-5 shrink-0" />
         <div>
            <p className="font-medium">Action Blocked</p>
            <p className="text-sm">Cannot add new turns while battle tree is corrupted.</p>
         </div>
      </div>
    )
  }
  
  // If battle has ended, show victory/defeat message
  if (battleEnd.isBattleEnd && battleEnd.winner) {
    return <BattleEndMessage winner={battleEnd.winner} />
  }

  return (
    <TurnEditor
      key={`next-${selectedNodeId}`}
      activePokemon={activePokemon}
      onSave={onAddAction}
      saveLabel="End turn"
      onChange={handleTurnChange}
      myTeam={myTeam}
      enemyTeam={enemyTeam}
      turnNumber={nextTurnNumber}
      battleFormat={battleType}
    />
  )
}
