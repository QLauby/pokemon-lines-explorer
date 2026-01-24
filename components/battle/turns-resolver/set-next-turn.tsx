"use client"

import { Pokemon, TreeNode, TurnData } from "@/lib/types"

import { TurnEditor } from "./turn-editor"

interface SetNextTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
}

export function SetNextTurn({
  activePokemon,
  onAddAction,
}: SetNextTurnProps) {
  return (
    <TurnEditor
      activePokemon={activePokemon}
      onSave={onAddAction}
      saveLabel="End turn"
    />
  )
}
