import { Pokemon, TreeNode, TurnData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { getTreeBranchColor } from "./battle-view"
import { DeleteFromCurrentTurn } from "./turns-resolver/delete-from-current-turn"
import { SetNextTurn } from "./turns-resolver/set-next-turn"
import { UpdateCurrentTurn } from "./turns-resolver/update-current-turn"

interface TurnsResolverProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData) => void
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode: (nodeId: string) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
}

type Tab = "update" | "delete" | "next"

export function TurnsResolver({
  selectedNodeId,
  nodes,
  onAddAction,
  activePokemon,
  onUpdateNode,
  onDeleteNode,
}: TurnsResolverProps) {
  const [activeTab, setActiveTab] = useState<Tab>("next")
  const selectedNode = nodes.get(selectedNodeId)
  const currentTurn = selectedNode?.turn || 0
  
  // Current branch color
  const currentBranchColor = selectedNode ? getTreeBranchColor(selectedNode.branchIndex) : "inherit"
  
  // Next branch color calculation
  let nextBranchIndex = selectedNode?.branchIndex || 0
  if (selectedNode && selectedNode.children.length > 0) {
    const usedBranches = new Set(Array.from(nodes.values()).map(n => n.branchIndex))
    let newBranch = 1
    while (usedBranches.has(newBranch)) newBranch++
    nextBranchIndex = newBranch
  }
  const nextBranchColor = getTreeBranchColor(nextBranchIndex)

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100 p-1 rounded-lg">
        <button
           onClick={() => setActiveTab("update")}
           className={cn(
             "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
             activeTab === "update" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
           )}
        >
           Update <span style={{ color: currentBranchColor }} className="font-bold">turn {currentTurn}</span>
        </button>
        <button
           onClick={() => setActiveTab("delete")}
           className={cn(
             "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
             activeTab === "delete" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
           )}
        >
           Delete from <span style={{ color: currentBranchColor }} className="font-bold">turn {currentTurn}</span>
        </button>
        <button
           onClick={() => setActiveTab("next")}
           className={cn(
             "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
             activeTab === "next" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
           )}
        >
           Set new <span style={{ color: nextBranchColor }} className="font-bold">turn {currentTurn + 1}</span>
        </button>
      </div>

      <div className="border rounded-lg p-4 bg-white/50">
         {activeTab === "update" && (
            <UpdateCurrentTurn 
              selectedNodeId={selectedNodeId}
              nodes={nodes}
              activePokemon={activePokemon}
              onUpdateNode={onUpdateNode}
            />
         )}
         {activeTab === "delete" && (
            <DeleteFromCurrentTurn 
              selectedNodeId={selectedNodeId}
              nodes={nodes}
              onDeleteNode={onDeleteNode}
            />
         )}
         {activeTab === "next" && (
            <SetNextTurn 
                selectedNodeId={selectedNodeId}
                nodes={nodes}
                onAddAction={onAddAction}
                activePokemon={activePokemon}
            />
         )}
      </div>
    </div>
  )
}
