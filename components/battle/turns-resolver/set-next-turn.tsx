"use client"

import { Pokemon, TreeNode, TurnData } from "@/lib/types"

import { TurnEditor } from "./turn-editor"

interface SetNextTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onChange?: (data: TurnData | null) => void
}

import { useCorruptionHandler } from "@/lib/hooks/features/use-corruption-handler"
import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"

export function SetNextTurn({
  activePokemon,
  onAddAction,
  onChange,
}: SetNextTurnProps) {
  const { isCorrupted } = useCorruptionHandler()

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange(null)
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
      onChange={onChange}
    />
  )
}
