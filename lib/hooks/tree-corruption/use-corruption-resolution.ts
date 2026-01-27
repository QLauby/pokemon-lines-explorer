import { CombatSession } from "@/types/types"
import { useCorruptionHandler } from "./use-corruption-handler"

interface UseCorruptionResolutionProps {
  onCommit: (newSession: CombatSession) => void
  onCancel: () => void
}

export function useCorruptionResolution({ onCommit, onCancel }: UseCorruptionResolutionProps) {
  const { pendingSession, corruptedNodeIds, reset } = useCorruptionHandler()

  const confirmCorruption = () => {
    // 1. Clone session (shallow clone of session, but we need to modify nodes array and objects)
    const newSession: CombatSession = {
      ...pendingSession,
      nodes: pendingSession.nodes.map(n => ({ ...n, children: [...n.children] })) // Deep clone structure relevant to us
    }
    
    // Set of IDs to remove
    const idsToRemove = new Set(corruptedNodeIds)

    // 2. Filter out corrupted nodes from the list
    newSession.nodes = newSession.nodes.filter(n => !idsToRemove.has(n.id))

    // 3. Clean up orphans (remove deleted IDs from parent's children array)
    newSession.nodes.forEach(node => {
      if (node.children.length > 0) {
        node.children = node.children.filter(childId => !idsToRemove.has(childId))
      }
    })

    // 4. Commit and Reset
    onCommit(newSession)
    reset() // Resets the pending state in the provider
  }

  const cleanFullTree = () => {
    // 1. Clone session
    const newSession: CombatSession = {
      ...pendingSession,
      nodes: pendingSession.nodes.map(n => ({ ...n, children: [...n.children] }))
    }

    // 2. Keep only Root
    const rootNode = newSession.nodes.find(n => n.turn === 0)
    
    if (rootNode) {
       // Reset root children
       rootNode.children = []
       // Reset root data (Turn 0 reset)
       rootNode.turnData = { actions: [], endOfTurnDeltas: [] }
       // Set nodes to just root
       newSession.nodes = [rootNode]
    } else {
       // Fallback if no root found (shouldn't happen but valid safety)
       newSession.nodes = []
    }

    // 3. Commit and Reset
    onCommit(newSession)
    reset()
  }

  const cancel = () => {
    reset() // Reset pending state (e.g. reverts battleType)
    onCancel()
  }

  return {
    confirmCorruption,
    cleanFullTree,
    cancel
  }
}
