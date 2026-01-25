"use client"

import { Pokemon, TreeNode, TurnData } from "@/lib/types"

import { TurnEditor } from "./turn-editor"

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

import { useCorruptionHandler } from "@/lib/hooks/features/use-corruption-handler"
import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

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

  return (
    <TurnEditor
      activePokemon={activePokemon}
      onSave={onAddAction}
      saveLabel="End turn"
      onChange={(turnData) => onChange?.({ mode: "add", turnData })}
      myTeam={myTeam}
      enemyTeam={enemyTeam}
      turnNumber={nextTurnNumber}
      battleFormat={battleType}
    />
  )
}
