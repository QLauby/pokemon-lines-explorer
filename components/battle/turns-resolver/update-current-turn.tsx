"use client"

import { useEffect } from "react"

import { useCorruptionHandler } from "@/lib/hooks/features/use-corruption-handler"
import { Pokemon, TreeNode, TurnData } from "@/lib/types"
import { showSuccessToast } from "@/lib/utils/toasts/toast-handler"
import { TurnEditor } from "./turn-editor"

interface UpdateCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
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
