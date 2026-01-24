"use client"

import { Pokemon, TreeNode, TurnData } from "@/lib/types"
import { showSuccessToast } from "@/lib/utils/toasts/toast-handler"

import { TurnEditor } from "./turn-editor"

interface UpdateCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
}

export function UpdateCurrentTurn({
  selectedNodeId,
  nodes,
  activePokemon,
  onUpdateNode,
}: UpdateCurrentTurnProps) {
  const selectedNode = nodes.get(selectedNodeId)
  
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
      saveLabel="Update turn"
    />
  )
}
