import { cn } from "@/lib/utils"
import { BattleState, Pokemon, TreeNode, TurnData } from "@/types/types"
import { useEffect, useState } from "react"
import { getTreeBranchColor } from "../battle-view"
import { DeleteFromCurrentTurn } from "./delete-from-current-turn"
import { SetNextTurn } from "./set-next-turn"
import { UpdateCurrentTurn } from "./update-current-turn"

interface TurnsResolverProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData, probability?: number, description?: string, probabilityExpression?: string) => void
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode: (nodeId: string) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onHighlightNodes: (ids: string[]) => void
  onPreviewChange?: (update: { mode: "add" | "update"; turnData: TurnData | null }) => void
  previewBranchIndex?: number | null
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  parentActivePokemon?: { pokemon: Pokemon; isAlly: boolean }[]
  battleType: "simple" | "double"
  parentBattleState?: BattleState | null
  // New props for correctly computed state injection
  updateParentMyTeam?: Pokemon[]
  updateParentEnemyTeam?: Pokemon[]
  nextCurrentMyTeam?: Pokemon[]
  nextCurrentEnemyTeam?: Pokemon[]
  nextActivePokemon?: { pokemon: Pokemon; isAlly: boolean }[]
  nextBattleState?: BattleState
  sessionInitialState?: BattleState
  readOnly?: boolean
  hpMode?: "percent" | "hp"
}

type Tab = "update" | "delete" | "next"

export function TurnsResolver({
  selectedNodeId,
  nodes,
  onAddAction,
  activePokemon, 
  onUpdateNode,
  onDeleteNode,
  onHighlightNodes,
  onPreviewChange,
  previewBranchIndex,
  myTeam,
  enemyTeam,
  parentActivePokemon,
  battleType,
  parentBattleState,
  updateParentMyTeam,
  updateParentEnemyTeam,
  nextCurrentMyTeam,
  nextCurrentEnemyTeam,
  nextActivePokemon,
  nextBattleState,
  sessionInitialState,
  hpMode = "percent",
}: TurnsResolverProps) {
  const [activeTab, setActiveTab] = useState<Tab>("next")
  const selectedNode = nodes.get(selectedNodeId)

  // Fallback to activePokemon if parent not provided (though it should be for update reliability)
  const effectiveParentPokemon = parentActivePokemon || activePokemon

  useEffect(() => {
    // Clear preview when tab changes
    if (onPreviewChange) onPreviewChange({ mode: "add", turnData: null })
  }, [activeTab])
  const currentTurn = selectedNode?.turn || 0
  
  // Current branch color
  const currentBranchColor = selectedNode ? getTreeBranchColor(selectedNode.branchIndex) : "inherit"
  
  // Next branch color calculation
  let nextBranchIndex = selectedNode?.branchIndex || 0
  
  if (previewBranchIndex !== undefined && previewBranchIndex !== null) {
      nextBranchIndex = previewBranchIndex
  } else if (selectedNode && selectedNode.children.length > 0) {
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
                 activePokemon={effectiveParentPokemon}
                 parentBattleState={parentBattleState || null}
                 onUpdateNode={onUpdateNode}
                 myTeam={updateParentMyTeam || myTeam}
                 enemyTeam={updateParentEnemyTeam || enemyTeam}
                 onChange={onPreviewChange}
                 battleType={battleType}
                 sessionInitialState={sessionInitialState}
                 hpMode={hpMode}
               />
          )}
         {activeTab === "delete" && (
            <DeleteFromCurrentTurn 
              selectedNodeId={selectedNodeId}
              nodes={nodes}
              onDeleteNode={onDeleteNode}
              onHighlightNodes={onHighlightNodes}
            />
         )}
         {activeTab === "next" && (
            <SetNextTurn 
                selectedNodeId={selectedNodeId}
                nodes={nodes}
                onAddAction={onAddAction}
                activePokemon={nextActivePokemon || activePokemon}
                onChange={onPreviewChange}
                myTeam={nextCurrentMyTeam || myTeam}
                enemyTeam={nextCurrentEnemyTeam || enemyTeam}
                battleType={battleType}
                currentBattleState={nextBattleState}
                sessionInitialState={sessionInitialState}
                hpMode={hpMode}
            />
         )}
       </div>
    </div>
  )
}
