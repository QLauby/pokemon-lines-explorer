"use client"

import { AlertTriangle } from "lucide-react"
import { useCallback, useEffect } from "react"

import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { Pokemon, TreeNode, TurnData } from "@/types/types"
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
}: SetNextTurnProps) {
  const { isCorrupted } = useCorruptionHandler()

  const selectedNode = nodes.get(selectedNodeId)
  const nextTurnNumber = (selectedNode?.turn || 0) + 1

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange({ mode: "add", turnData: null })
    }
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

  const handleTurnChange = useCallback((turnData: TurnData) => {
      onChange?.({ mode: "add", turnData })
  }, [onChange])

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
