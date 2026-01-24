"use client"

import { getCyclicColor } from "@/lib/colors"
import { TREE_BASE_COLOR } from "@/lib/constants/color-constants"
import type { CombatSession, Pokemon, TreeNode } from "@/lib/types"

export function getTreeBranchColor(branchIndex: number): string {
  return getCyclicColor(TREE_BASE_COLOR, 10, "shortList", branchIndex + 1)
}

import { BattleTree } from "./battle-tree"
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
}: CombatViewProps) {
  
  // Find current node and compute state
  const selectedNode = nodes.get(selectedNodeId) || Array.from(nodes.values())[0]
  
  const { battlefieldState } = currentSession.initialState
  const branchColor = selectedNode ? getTreeBranchColor(selectedNode.branchIndex) : "inherit"
  
  return (
    <div className="w-full p-2 bg-gray-50/50 min-h-screen">
       {/* Main Grid: Left (Tree + Battle) | Right (Actions) */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start max-w-[1800px] mx-auto">
          
          {/* LEFT COLUMN: VISUALIZATION */}
          <div className="flex flex-col gap-4 min-w-0 w-full">
              {/* Top: Tree - Constrain height so the visualization stays stable */}
              <div className="h-[340px] border rounded-xl bg-white shadow-md overflow-hidden ring-1 ring-black/5">
                  <BattleTree
                    nodes={nodes}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                    onResetBattle={onResetBattle}
                  />
              </div>

              {/* Bottom: Battle Board - Grows with content, scrolls with page */}
              <div className="min-w-0">
                  <CurrentState 
                     selectedNode={selectedNode}
                     myTeam={myTeam}
                     enemyTeam={enemyTeam}
                     battlefieldState={battlefieldState}
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
                    activePokemon={[
                      ...(activeStarters?.myTeam || [])
                        .filter((idx): idx is number => idx !== null)
                        .map(idx => ({ pokemon: myTeam[idx], isAlly: true })),
                      ...(activeStarters?.opponentTeam || [])
                        .filter((idx): idx is number => idx !== null)
                        .map(idx => ({ pokemon: enemyTeam[idx], isAlly: false }))
                    ]}
                 />
              </div>
          </div>

       </div>
    </div>
  )
}
