"use client"

import { useMemo, useState } from "react"

import { PALETTE, THEME } from "@/lib/constants/color-constants"
import { BattleEngine } from "@/lib/logic/battle-engine"
import { DistributionEngine } from "@/lib/logic/distribution-engine"
import { recalculateTreeLayout } from "@/lib/logic/tree-layout"
import { getCyclicColor } from "@/lib/utils/colors-utils"
import { useIsDark } from "@/lib/hooks/use-is-dark"
import type { BattleState, CombatSession, Pokemon, TreeNode } from "@/types/types"
import { TurnData } from "@/types/types"

export type NodeKOInfo = { 
  events: {
    name: string,
    type: "ko" | "range",
    probability: number,
    isTriggered: boolean
  }[]
}

export function getTreeBranchColor(branchIndex: number | null | undefined, isDark: boolean): string {
  // Turn 0 (root) has undefined/null branchIndex.
  const ROOT_HEX = isDark ? PALETTE.battle_tree_root.dark : PALETTE.battle_tree_root.light
  if (branchIndex === null || branchIndex === undefined) return ROOT_HEX

  // Cycle from the theme-specific root hex
  return getCyclicColor(ROOT_HEX, 12, "shortList", (branchIndex % 12) + 1)
}

import { BattleTree } from "./battle-tree"
import { CorruptionAlertBanner } from "./corruption-alert-banner"
import { CurrentState } from "./current-state"
import { TurnsResolver } from "./turns-resolver/turns-resolver"

interface CombatViewProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  onSelectedNodeChange: (nodeId: string) => void
  onResetBattle: () => void
  onAddAction: (data: import("@/types/types").TurnData, probability?: number, description?: string, probabilityExpression?: string) => void,
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode: (nodeId: string) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  currentSession: CombatSession
  onCommit: (newSession: CombatSession) => void
  onCancel: () => void
  readOnly?: boolean
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
  activeSlots,
  currentSession,
  onCommit,
  onCancel,
  readOnly = false,
} : CombatViewProps) {
  const isDark = useIsDark()
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([])
  const [preview, setPreview] = useState<{ mode: "add" | "update"; turnData: TurnData | null }>({ mode: "add", turnData: null })
  
  // Find current node
  const selectedNode = nodes.get(selectedNodeId) || Array.from(nodes.values())[0]

  // Memoize active pokemon list to prevent TurnEditor state reset loop
  const activePokemonList = useMemo(() => {
    const limit = currentSession.battleType === "double" ? 2 : 1
    
    return [
      ...(activeSlots?.myTeam || [])
        .slice(0, limit)
        .filter((idx: number | null): idx is number => idx !== null)
        .map((idx: number) => ({ pokemon: myTeam[idx], isAlly: true }))
        .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0),
      ...(activeSlots?.opponentTeam || [])
        .slice(0, limit)
        .filter((idx: number | null): idx is number => idx !== null)
        .map((idx: number) => ({ pokemon: enemyTeam[idx], isAlly: false }))
        .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0)
    ]
  }, [activeSlots, myTeam, enemyTeam, currentSession.battleType])

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
         description: "",
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
  // Case 2: Preview UPDATING - Removed (Updates are now live)
  // else if (preview.mode === "update" && preview.turnData && selectedNode) { ... }

  // Compute Parent Active Pokemon AND Teams (for Update Mode)
  const parentState = useMemo(() => {
     if (!selectedNode) return null
     
     // 1. If we are at the root (No parent), the parent state is simply the absolute session initial state.
     if (!selectedNode.parentId || selectedNode.id === "root") {
         return JSON.parse(JSON.stringify(currentSession.initialState))
     }

     // 2. If we have a parent, we compute the state up to that parent.
      if (selectedNode.parentId) {
         return BattleEngine.computeState(
            currentSession.initialState,
            nodes,
            selectedNode.parentId,
            currentSession.hpMode,
            currentSession.battleType
         )
      }
      
      return null
   }, [selectedNode, nodes, currentSession.initialState])

  const parentActivePokemonList = useMemo(() => {
     if (!parentState) return activePokemonList
     
     const limit = currentSession.battleType === "double" ? 2 : 1
     return [
       ...(parentState.activeSlots?.myTeam || [])
         .slice(0, limit)
         .filter((idx: number | null): idx is number => idx !== null)
         .map((idx: number) => ({ pokemon: parentState.myTeam[idx], isAlly: true }))
         .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0),
       ...(parentState.activeSlots?.opponentTeam || [])
         .slice(0, limit)
         .filter((idx: number | null): idx is number => idx !== null)
         .map((idx: number) => ({ pokemon: parentState.enemyTeam[idx], isAlly: false }))
         .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0)
     ]
  }, [parentState, currentSession.battleType, activePokemonList])

  // Compute State (Live or Standard)
  const currentBattleState = BattleEngine.computeState(
      currentSession.initialState, 
      displayNodes, 
      targetNodeId || "root",
      currentSession.hpMode,
      currentSession.battleType
  )

  const { battlefieldState } = currentSession.initialState
  // We need to fetch the potentially updated selectedNode from displayNodes to get correct color if re-layout changed things
  const displaySelectedNode = displayNodes.get(selectedNodeId) || selectedNode
  const branchColor = displaySelectedNode ? getTreeBranchColor(displaySelectedNode.branchIndex, isDark) : "inherit"
  
  // Compute state at the selected node explicitly (for setting NEXT turn, we need the END state of CURRENT node)
  const selectedNodeState = useMemo(() => {
     return BattleEngine.computeState(
        currentSession.initialState,
        nodes, // Use pure nodes, not displayNodes to avoid preview recursion/contamination
        selectedNodeId,
        currentSession.hpMode,
        currentSession.battleType
     )
  }, [currentSession.initialState, nodes, selectedNodeId])

  // Compute active Pokemon for NEXT turn (SetNextTurn tab)
  const nextActivePokemonList = useMemo(() => {
     const limit = currentSession.battleType === "double" ? 2 : 1
     return [
       ...(selectedNodeState.activeSlots?.myTeam || [])
         .slice(0, limit)
         .filter((idx: number | null): idx is number => idx !== null)
         .map((idx: number) => ({ pokemon: selectedNodeState.myTeam[idx], isAlly: true }))
         .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0),
       ...(selectedNodeState.activeSlots?.opponentTeam || [])
         .slice(0, limit)
         .filter((idx: number | null): idx is number => idx !== null)
         .map((idx: number) => ({ pokemon: selectedNodeState.enemyTeam[idx], isAlly: false }))
         .filter((item: { pokemon: Pokemon | undefined; isAlly: boolean }): item is { pokemon: Pokemon; isAlly: boolean } => !!item.pokemon && item.pokemon.hpPercent > 0)
     ]
  }, [selectedNodeState, currentSession.battleType])

  const koNodesInfo = useMemo(() => {
      const koMap = new Map<string, NodeKOInfo>()
      const stateCache = new Map<string, BattleState>()
      stateCache.set("root", currentSession.initialState)

      const sortedNodes = Array.from(displayNodes.values()).sort((a,b) => a.turn - b.turn)

      for (const node of sortedNodes) {
          if (!node.parentId) continue
          
          let parentState = stateCache.get(node.parentId)
          if (!parentState) {
              parentState = BattleEngine.computeState(currentSession.initialState, nodes, node.parentId, currentSession.hpMode)
              stateCache.set(node.parentId, parentState)
          }

          let state = stateCache.get(node.id)
          if (!state) {
              state = BattleEngine.computeStateAtNode(node, parentState, currentSession.hpMode ?? "percent")
              stateCache.set(node.id, state)
          }
          
          const events: NodeKOInfo["events"] = []
          
          // Track the status of each pokemon DURING the node simulation
          // Key: "my-0", Value: { type: "healthy" | "range" | "ko", prob: number }
          const lastStatusInNode = new Map<string, { type: "healthy" | "range" | "ko", prob: number, triggered: boolean }>()

          const getPokemonKey = (side: "my" | "opponent", idx: number) => `${side}-${idx}`

          const checkTransition = (
              pSide: "my" | "opponent", 
              pIdx: number, 
              prev: Pokemon, 
              cur: Pokemon
          ) => {
              const key = getPokemonKey(pSide, pIdx)
              
              // 1. Determine current status in this step
              let curType: "healthy" | "range" | "ko" = "healthy"
              let curProb = 0
              let curTriggered = false

              if (currentSession.hpMode === "rolls" && cur.statProfile) {
                  const stats = DistributionEngine.getProfileStats(cur.statProfile.distribution)
                  if (stats.maxHp <= 0) {
                      curType = "ko"
                      curProb = 1
                  } else if (stats.minHp <= 0) {
                      curType = "range"
                      curProb = stats.koRisk
                      curTriggered = cur.hpPercent === 0
                  }
              } else if (cur.hpPercent <= 0) {
                  curType = "ko"
                  curProb = 1
              }

              // 2. Determine initial status BEFORE the node (from parentState)
              if (!lastStatusInNode.has(key)) {
                  const prevStats = prev.statProfile ? DistributionEngine.getProfileStats(prev.statProfile.distribution) : null
                  let initialType: "healthy" | "range" | "ko" = "healthy"
                  let initialProb = 0
                  let initialTriggered = false

                  if (currentSession.hpMode === "rolls" && prev.statProfile && prevStats) {
                      if (prevStats.maxHp <= 0) {
                          initialType = "ko"
                          initialProb = 1
                      } else if (prevStats.minHp <= 0) {
                          initialType = "range"
                          initialProb = prevStats.koRisk
                          initialTriggered = prev.hpPercent === 0
                      }
                  } else if (prev.hpPercent <= 0) {
                      initialType = "ko"
                      initialProb = 1
                  }
                  lastStatusInNode.set(key, { type: initialType, prob: initialProb, triggered: initialTriggered })
              }

              // 3. Compare with last known status in this node
              const last = lastStatusInNode.get(key)!
              
              if (curType === "healthy") {
                  lastStatusInNode.set(key, { type: "healthy", prob: 0, triggered: false })
                  return
              }

              const typeChanged = curType !== last.type
              // For range, also check if prob changed or if it was triggered
              const probChanged = curType === "range" && (Math.abs(curProb - last.prob) > 0.001 || curTriggered !== last.triggered)

              if (typeChanged || probChanged) {
                  events.push({ 
                    name: cur.name, 
                    type: curType === "ko" ? "ko" : "range", 
                    probability: curProb, 
                    isTriggered: curTriggered 
                  })
                  lastStatusInNode.set(key, { type: curType, prob: curProb, triggered: curTriggered })
              }
          }

          // CHRONOLOGICAL ANALYSIS:
          if (node.turnData) {
              let tempState = JSON.parse(JSON.stringify(parentState)) as BattleState
              
              // We simulate sequentially all components of the turn
              const allStages = [
                  ...(node.turnData.actions || []).map(a => ({ actions: [a] })),
                  ...(node.turnData.endOfTurnEffects ? [{ endOfTurnEffects: node.turnData.endOfTurnEffects }] : []),
                  ...(node.turnData.postTurnActions || []).map(a => ({ postTurnActions: [a] }))
              ]

              for (const stage of allStages) {
                  const nextState = BattleEngine.computeStateAtNode({ 
                      ...node, 
                      turnData: { actions: [], endOfTurnEffects: [], postTurnActions: [], ...stage } 
                  } as any, tempState, currentSession.hpMode ?? "percent")

                  // Compare tempState vs nextState for transitions
                  for (let i = 0; i < nextState.myTeam.length; i++) {
                      checkTransition("my", i, tempState.myTeam[i], nextState.myTeam[i])
                  }
                  for (let i = 0; i < nextState.enemyTeam.length; i++) {
                      checkTransition("opponent", i, tempState.enemyTeam[i], nextState.enemyTeam[i])
                  }

                  tempState = nextState
              }
          }

          if (events.length > 0) {
              koMap.set(node.id, { events })
          }
      }
      return koMap
  }, [displayNodes, currentSession, nodes])

  return (
    <div className="w-full p-2 bg-slate-50/50 min-h-screen">
       {/* Main Grid: Left (Tree + Battle) | Right (Actions) */}
       <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 items-start max-w-[2000px] mx-auto">
          
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
                    onUpdateNode={onUpdateNode}
                    highlightedNodeIds={highlightedNodeIds}
                    previewNodeId={targetNodeId === "preview-node" ? "preview-node" : null}
                    koNodesInfo={koNodesInfo}
                  />
              </div>

              {/* Bottom: Battle Board - Grows with content, scrolls with page */}
              <div className="min-w-0">
                  <CurrentState 
                     selectedNode={displayNodes.get(targetNodeId) || selectedNode}
                     myTeam={currentBattleState.myTeam}
                     enemyTeam={currentBattleState.enemyTeam}
                     activeSlots={currentBattleState.activeSlots}
                     battlefieldState={currentBattleState.battlefieldState}
                     battleType={currentSession.battleType}
                     hpMode={currentSession.hpMode}
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
                    parentBattleState={parentState}
                    battleType={currentSession.battleType}
                    // For "Update": Pass the computed parent state teams
                    updateParentMyTeam={parentState?.myTeam || myTeam}
                    updateParentEnemyTeam={parentState?.enemyTeam || enemyTeam}
                    // For "Next Turn": Pass the clean end state of the selected node
                    nextCurrentMyTeam={selectedNodeState.myTeam}
                    nextCurrentEnemyTeam={selectedNodeState.enemyTeam}
                    nextActivePokemon={nextActivePokemonList}
                    nextBattleState={selectedNodeState}
                    sessionInitialState={currentSession.initialState}
                    readOnly={readOnly}
                    hpMode={currentSession.hpMode}
                 />
              </div>
          </div>

       </div>
    </div>
  )
}
