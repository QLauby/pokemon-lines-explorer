"use client"

import { useEffect } from "react"

import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { showSuccessToast } from "@/lib/utils/toasts/toast-handler"
import { BattleState, Pokemon, TreeNode, TurnData } from "@/types/types"
import { TurnEditor } from "./shared/turn-editor"

interface UpdateCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  parentBattleState: BattleState | null
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  onChange?: (update: { mode: "add" | "update"; turnData: TurnData | null }) => void
  battleType: "simple" | "double"
}


export function UpdateCurrentTurn({
  selectedNodeId,
  nodes,
  activePokemon,
  parentBattleState,
  onUpdateNode,
  myTeam,
  enemyTeam,
  onChange,
  battleType,
}: UpdateCurrentTurnProps) {
  const selectedNode = nodes.get(selectedNodeId)
  const { isCorrupted } = useCorruptionHandler()

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange({ mode: "update", turnData: null })
    }
  }, [onChange])
  
  const handleSave = (turnData: TurnData) => {
    if (!selectedNode) return

    onUpdateNode(selectedNodeId, { turnData })
    showSuccessToast(`Tour ${selectedNode.turn} mis à jour`)
  }

  if (!selectedNode) return <div>No turn selected</div>

  return (
    <TurnEditor
      initialTurnData={selectedNode.turnData}
      initialBattleState={parentBattleState}
      activePokemon={activePokemon}
      onSave={handleSave}
      saveLabel={isCorrupted ? "Locked due to corruption" : "Update turn"}
      readOnly={isCorrupted}
      myTeam={myTeam}
      enemyTeam={enemyTeam}
      onChange={(turnData) => onChange?.({ mode: "update", turnData })}
      turnNumber={selectedNode.turn}
      battleFormat={battleType}
    />
  )
}
