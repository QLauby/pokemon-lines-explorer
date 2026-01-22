"use client"

import type { CombatSession, Pokemon, TreeNode } from "@/lib/types"

import { ActionForm } from "./action-form"
import { BattleTree } from "./battle-tree"
import { CurrentState } from "./current-state"

interface CombatViewProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  scrollX: number
  actionDescription: string
  actionProbability: string
  hpChanges: { pokemonId: string; hpChange: number }[]
  onSelectedNodeChange: (nodeId: string) => void
  onScrollChange: (direction: "left" | "right") => void
  onResetBattle: () => void
  onActionDescriptionChange: (desc: string) => void
  onActionProbabilityChange: (prob: string) => void
  onHpChangesChange: (changes: { pokemonId: string; hpChange: number }[]) => void
  onAddAction: () => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode?: (nodeId: string) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  currentSession: CombatSession
}

export function CombatView({
  nodes,
  selectedNodeId,
  scrollX,
  actionDescription,
  actionProbability,
  hpChanges,
  onSelectedNodeChange,
  onScrollChange,
  onResetBattle,
  onActionDescriptionChange,
  onActionProbabilityChange,
  onHpChangesChange,
  onAddAction,
  myTeam,
  enemyTeam,
  currentSession,
}: CombatViewProps) {
  
  // Find current node and compute state
  const selectedNode = nodes.get(selectedNodeId) || Array.from(nodes.values())[0]
  
  const { battlefieldState } = currentSession.initialState
  
  const handleTreeScroll = (direction: "left" | "right") => {
      onScrollChange(direction)
  }

  return (
    <div className="w-full p-2 bg-gray-50/50 min-h-screen">
       {/* Main Grid: Left (Tree + Battle) | Right (Actions) */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start max-w-[1800px] mx-auto">
          
          {/* LEFT COLUMN: VISUALIZATION */}
          <div className="flex flex-col gap-4 min-w-0 w-full">
              {/* Top: Tree - Constrain height so the visualization stays stable */}
              <div className="h-[225px] border rounded-xl bg-white shadow-md overflow-hidden ring-1 ring-black/5">
                  <BattleTree
                    nodes={nodes}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                    scrollX={scrollX}
                    onScrollChange={handleTreeScroll}
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
              <h2 className="text-2xl font-bold mb-8 border-b pb-6">Action Form</h2>
              <div>
                 <ActionForm 
                    selectedNodeId={selectedNodeId}
                    nodes={nodes}
                    actionDescription={actionDescription}
                    actionProbability={actionProbability}
                    hpChanges={hpChanges}
                    onActionDescriptionChange={onActionDescriptionChange}
                    onActionProbabilityChange={onActionProbabilityChange}
                    onHpChangesChange={onHpChangesChange}
                    onAddAction={onAddAction} 
                    getAllPokemon={() => [...myTeam, ...enemyTeam]}
                 />
              </div>
          </div>

       </div>
    </div>
  )
}
