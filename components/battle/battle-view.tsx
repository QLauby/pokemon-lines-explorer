"use client"

import { useMemo, useState } from "react"

import { getCyclicColor } from "@/lib/colors"
import { TREE_BASE_COLOR } from "@/lib/constants/color-constants"
import { BattleEngine } from "@/lib/logic/battle-engine"
import { recalculateTreeLayout } from "@/lib/logic/tree-layout"
import type { CombatSession, Pokemon, TreeNode } from "@/lib/types"
import { TurnData } from "@/lib/types"

export function getTreeBranchColor(branchIndex: number): string {
  return getCyclicColor(TREE_BASE_COLOR, 10, "shortList", branchIndex + 1)
}

import { BattleTree } from "./battle-tree"
import { CorruptionAlertBanner } from "./corruption-alert-banner"
import { CurrentState } from "./current-state"
import { TurnsResolver } from "./turns-resolver"

interface CombatViewProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  onSelectedNodeChange: (nodeId: string) => void
  onResetBattle: () => void
  onAddAction: (data: import("@/lib/types").TurnData) => void
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode: (nodeId: string) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeStarters: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  currentSession: CombatSession
  onCommit: (newSession: CombatSession) => void
  onCancel: () => void
}



export function CombatView({
  nodes,
  selectedNodeId,
  onSelectedNodeChange,
  onResetBattle,
  onAddAction,
  onUpdateNode,
  onDeleteNode,
  myTeam,
  enemyTeam,
  activeStarters,
  currentSession,
  onCommit,
  onCancel,
}: CombatViewProps) {
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([])
  const [preview, setPreview] = useState<{ mode: "add" | "update"; turnData: TurnData | null }>({ mode: "add", turnData: null })
  
  // Find current node
  const selectedNode = nodes.get(selectedNodeId) || Array.from(nodes.values())[0]

  // Memoize active pokemon list to prevent TurnEditor state reset loop
  const activePokemonList = useMemo(() => {
    const limit = currentSession.battleType === "double" ? 2 : 1
    
    return [
      ...(activeStarters?.myTeam || [])
        .slice(0, limit)
        .filter((idx): idx is number => idx !== null)
        .map(idx => ({ pokemon: myTeam[idx], isAlly: true })),
      ...(activeStarters?.opponentTeam || [])
        .slice(0, limit)
        .filter((idx): idx is number => idx !== null)
        .map(idx => ({ pokemon: enemyTeam[idx], isAlly: false }))
    ]
  }, [activeStarters, myTeam, enemyTeam, currentSession.battleType])

  // -- PREVIEW LOGIC --
  let displayNodes = nodes
  let targetNodeId = selectedNodeId

  // Case 1: Preview adding a NEW node
  if (preview.mode === "add" && preview.turnData && selectedNode) {
     const previewId = "preview-node"
     targetNodeId = previewId // Engine target

     // 1. Create a Mutable Copy of the nodes for layout calculation
     const nodesArray = Array.from(nodes.values())
     
     // 2. Create the preview node (initially with placeholder/dummy values)
     const previewNode: TreeNode = {
         id: previewId,
         parentId: selectedNode.id,
         children: [],
         turn: selectedNode.turn + 1,
         turnData: preview.turnData,
         branchIndex: 0, 
         probability: 0, 
         cumulativeProbability: 0,
         description: "Preview",
         createdAt: Date.now(),
         x: 0, 
         y: 0 
     }
     
     // 3. Add to the array
     const nodesWithPreview = [...nodesArray, previewNode]
     
     // 4. Run Layout
     const layoutedNodes = recalculateTreeLayout(nodesWithPreview)
     
     // 5. Rebuild Map for Display (using the layouted nodes)
     displayNodes = new Map(layoutedNodes.map(n => [n.id, n]))
  } 
  // Case 2: Preview UPDATING the existing node
  else if (preview.mode === "update" && preview.turnData && selectedNode) {
      // We just replace the turnData in a copy of the nodes Map for the engine call
      displayNodes = new Map(nodes)
      const updatedNode = { ...selectedNode, turnData: preview.turnData }
      displayNodes.set(selectedNodeId, updatedNode)
      // targetNodeId remains selectedNodeId
  }

  // Compute Parent Active Pokemon (for Update Mode)
  const parentActivePokemonList = useMemo(() => {
     if (!selectedNode || !selectedNode.parentId) return activePokemonList
     
     const parentState = BattleEngine.computeState(
        currentSession.initialState,
        nodes, // Use committed nodes for parent state lookup
        selectedNode.parentId
     )

     const limit = currentSession.battleType === "double" ? 2 : 1
     return [
       ...(parentState.activeStarters?.myTeam || [])
         .slice(0, limit)
         .filter((idx): idx is number => idx !== null)
         .map(idx => ({ pokemon: parentState.myTeam[idx], isAlly: true })),
       ...(parentState.activeStarters?.opponentTeam || [])
         .slice(0, limit)
         .filter((idx): idx is number => idx !== null)
         .map(idx => ({ pokemon: parentState.enemyTeam[idx], isAlly: false }))
     ]
  }, [selectedNode, nodes, currentSession.initialState, currentSession.battleType, activePokemonList])

  // Compute State (Live or Standard)
  const currentBattleState = BattleEngine.computeState(
      currentSession.initialState, 
      displayNodes, 
      targetNodeId || "root"
  )

  const { battlefieldState } = currentSession.initialState
  // We need to fetch the potentially updated selectedNode from displayNodes to get correct color if re-layout changed things
  const displaySelectedNode = displayNodes.get(selectedNodeId) || selectedNode
  const branchColor = displaySelectedNode ? getTreeBranchColor(displaySelectedNode.branchIndex) : "inherit"
  
  return (
    <div className="w-full p-2 bg-gray-50/50 min-h-screen">
       {/* Main Grid: Left (Tree + Battle) | Right (Actions) */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start max-w-[1800px] mx-auto">
          
          {/* LEFT COLUMN: VISUALIZATION */}
          <div className="flex flex-col gap-4 min-w-0 w-full">
              <CorruptionAlertBanner onCommit={onCommit} onCancel={onCancel} />
              
              {/* Top: Tree - Constrain height so the visualization stays stable */}
              <div className="h-[340px] border rounded-xl bg-white shadow-md overflow-hidden ring-1 ring-black/5">
                  <BattleTree
                    nodes={displayNodes}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                    onResetBattle={onResetBattle}
                    highlightedNodeIds={highlightedNodeIds}
                    previewNodeId={targetNodeId === "preview-node" ? "preview-node" : null}
                  />
              </div>

              {/* Bottom: Battle Board - Grows with content, scrolls with page */}
              <div className="min-w-0">
                  <CurrentState 
                     selectedNode={displayNodes.get(targetNodeId) || selectedNode}
                     myTeam={currentBattleState.myTeam}
                     enemyTeam={currentBattleState.enemyTeam}
                     activeStarters={currentBattleState.activeStarters}
                     battlefieldState={currentBattleState.battlefieldState}
                     battleType={currentSession.battleType}
                  />
              </div>
          </div>

          {/* RIGHT COLUMN: ACTIONS - Grows with content, scrolls with page */}
          <div className="border rounded-xl bg-white shadow-md p-8 ring-1 ring-black/5">
              <h2 className="text-2xl font-bold mb-8 border-b pb-6">
                <span style={{ color: branchColor }}>Turn {(selectedNode?.turn || 0)}</span>
              </h2>
              <div>
                 <TurnsResolver 
                    selectedNodeId={selectedNodeId}
                    nodes={nodes}
                    onAddAction={onAddAction}
                    onUpdateNode={onUpdateNode}
                    onDeleteNode={onDeleteNode}
                    activePokemon={activePokemonList}
                    onHighlightNodes={setHighlightedNodeIds}
                    onPreviewChange={setPreview}
                    previewBranchIndex={targetNodeId === "preview-node" ? displayNodes.get("preview-node")?.branchIndex : undefined}
                    myTeam={myTeam}
                    enemyTeam={enemyTeam}
                    parentActivePokemon={parentActivePokemonList}
                    battleType={currentSession.battleType}
                 />
              </div>
          </div>

       </div>
    </div>
  )
}
