import { TreeNode } from "@/lib/types"
import { useEffect, useState } from "react"
import { recalculateTreeLayout } from "../../logic/tree-layout"
import { showSuccessToast } from "../../utils/toasts/toast-handler"

interface UseBattleTreeProps {
  currentSession: any
  saveSession: (session: any) => void
  setCurrentView: (view: "teams" | "combat") => void
  myTeam: any[]
  enemyTeam: any[]
}

export function useBattleTree({ 
    currentSession, 
    saveSession, 
    setCurrentView,
    myTeam,
    enemyTeam 
}: UseBattleTreeProps) {
    
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")

  // Auto-select node on initial load or session change
  useEffect(() => {
     if (!currentSession || currentSession.nodes.length === 0) return;

     // Check if the current selectedNodeId is valid for this session
     const isIdValid = currentSession.nodes.some((n: TreeNode) => n.id === selectedNodeId);

     if (!selectedNodeId || !isIdValid) {
         // Priority 1: Restore last selection from session
         if (currentSession.lastSelectedNodeId && currentSession.nodes.some((n: TreeNode) => n.id === currentSession.lastSelectedNodeId)) {
             setSelectedNodeId(currentSession.lastSelectedNodeId);
         } 
         // Priority 2: Pick the last node (root or latest action)
         else {
             const lastNode = currentSession.nodes[currentSession.nodes.length - 1];
             setSelectedNodeId(lastNode.id);
         }
     }
  }, [currentSession?.id, currentSession?.nodes.length]) // Trigger on session switch or node count change

  // Persist selectedNodeId when it changes manually
  useEffect(() => {
    if (currentSession && selectedNodeId) {
        if (currentSession.lastSelectedNodeId !== selectedNodeId) {
            if (currentSession.nodes.some((n: TreeNode) => n.id === selectedNodeId)) {
                saveSession({ ...currentSession, lastSelectedNodeId: selectedNodeId })
            }
        }
    }
  }, [selectedNodeId])

  const initializeBattle = () => {
    if (!currentSession) return
    if (myTeam.length === 0 && enemyTeam.length === 0) return

    // Create root node if not exists
    if (!currentSession.nodes.some((n: TreeNode) => n.id === "root")) {
        const rootNode: TreeNode = {
            id: "root",
            description: "État Initial",
            probability: 100,
            cumulativeProbability: 100,
            turnData: {
                actions: [],
                endOfTurnDeltas: []
            },
            children: [],
            parentId: undefined,
            createdAt: Date.now(),
            turn: 0,
            branchIndex: 0,
            x: 32,
            y: 32
        }
        saveSession({ ...currentSession, nodes: [rootNode] })
        setSelectedNodeId("root")
    }

    setCurrentView("combat")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const addAction = (turnData: import("@/lib/types").TurnData) => {
    if (!selectedNodeId || !currentSession) return
    
    const parentNode = currentSession.nodes.find((n: TreeNode) => n.id === selectedNodeId)
    if (!parentNode) return

    const nodeId = Date.now().toString()
    const newTurn = parentNode.turn + 1
    
    // Branch logic
    const childIndex = parentNode.children.length
    let branchIndex = parentNode.branchIndex
    let y = parentNode.y
    let x = 32 // Placeholder, recalculated by layout
    
    if (childIndex > 0) {
        // New branch
        const usedBranches = new Set(currentSession.nodes.map((n: TreeNode) => n.branchIndex))
        let newBranch = 1
        while (usedBranches.has(newBranch)) newBranch++;
        branchIndex = newBranch
        y = 0 
    }

    const newNode: TreeNode = {
        id: nodeId,
        description: "", 
        probability: 100,
        cumulativeProbability: parentNode.cumulativeProbability,
        turnData,
        children: [],
        parentId: selectedNodeId,
        createdAt: Date.now(),
        turn: newTurn,
        branchIndex: branchIndex,
        x,
        y 
    }

    // Update Parent
    const updatedParent = { ...parentNode, children: [...parentNode.children, nodeId] }
    
    // Add to list
    let newNodesList = currentSession.nodes.map((n: TreeNode) => n.id === selectedNodeId ? updatedParent : n)
    newNodesList.push(newNode)
    
    // Recalculate Layout
    newNodesList = recalculateTreeLayout(newNodesList)
    
    // Save
    saveSession({ ...currentSession, nodes: newNodesList })
    
    // Update Selection
    setSelectedNodeId(nodeId)
    
    // Success Toast
    const isNewBranch = childIndex > 0
    showSuccessToast(
        `Tour ${newTurn} créé`,
        isNewBranch ? "Une nouvelle branche a été créée." : undefined
    )
  }

  const updateNode = (nodeId: string, updates: Partial<TreeNode>) => {
    if (!currentSession) return

    const updatedNodes = currentSession.nodes.map((node: TreeNode) => 
        node.id === nodeId ? { ...node, ...updates } : node
    )
    
    saveSession({ ...currentSession, nodes: updatedNodes })
  }

  const deleteNode = (nodeId: string) => {
    if (!currentSession) return

    const nodesMap = new Map<string, TreeNode>(currentSession.nodes.map((n: TreeNode) => [n.id, n]))
    const targetNode = nodesMap.get(nodeId)
    if (!targetNode) return

    const nodesToDelete = new Set<string>()
    
    // Recursive helper to mark descendants
    const markDescendants = (id: string) => {
        const node = nodesMap.get(id)
        if (!node) return
        
        // Add to delete list UNLESS it's turn 0 (Root)
        if (node.turn !== 0) {
            nodesToDelete.add(id)
        }
        
        if (node.children) {
            node.children.forEach(childId => markDescendants(childId))
        }
    }
    
    markDescendants(nodeId)

    if (nodesToDelete.size === 0) return

    // Filter out deleted nodes
    const remainingNodes = currentSession.nodes.filter((n: TreeNode) => !nodesToDelete.has(n.id))

    // Remove reference from parent OR clear root children
    let finalNodes = remainingNodes
    if (targetNode.parentId) {
        finalNodes = remainingNodes.map((n: TreeNode) => {
            if (n.id === targetNode.parentId) {
                return {
                    ...n,
                    children: n.children.filter(childId => childId !== nodeId)
                }
            }
            return n
        })
    } else if (targetNode.turn === 0) {
        // We targeted root: clear its children but keep the node
        finalNodes = remainingNodes.map((n: TreeNode) => 
            n.id === targetNode.id ? { ...n, children: [] } : n
        )
    }
    
    // Update Selection (Select Parent or Root)
    let nextSelectedId = selectedNodeId
    if (nodesToDelete.has(selectedNodeId)) {
        nextSelectedId = targetNode.parentId || "root"
    } else if (targetNode.turn === 0) {
        nextSelectedId = targetNode.id
    }

    // Recalculate Layout
    const reLayoutedNodes = recalculateTreeLayout(finalNodes)

    // Save
    saveSession({ 
        ...currentSession, 
        nodes: reLayoutedNodes,
        lastSelectedNodeId: nextSelectedId 
    })
    setSelectedNodeId(nextSelectedId)
    
    showSuccessToast("Tours supprimés", `${nodesToDelete.size} tours ont été supprimés.`)
  }

  const resetBattle = () => {
      if (currentSession) {
          saveSession({ ...currentSession, nodes: [], lastSelectedNodeId: undefined })
          setSelectedNodeId("")
          setCurrentView("teams")
      }
  }

  return {
      selectedNodeId,
      setSelectedNodeId,
      initializeBattle,
      addAction,
      updateNode,
      deleteNode,
      resetBattle
  }
}
