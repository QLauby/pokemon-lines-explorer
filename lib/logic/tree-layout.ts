import { TreeNode } from "@/lib/types"

const VERTICAL_SPACING = 48
const HORIZONTAL_SPACING = 80
const START_X = 32

/**
 * Recalculates the (x, y) coordinates AND branch indices for all nodes.
 * 
 * Rules:
 * 1. Horizontal Main Branch: The "Main" path stays on the same Y row as the parent.
 * 2. Gap Closing: If a branch is deleted, siblings shift up.
 * 3. Dynamic Merge/Promotion: If Main is deleted, the next candidate promotes to Main, inheriting its Branch Index (Color).
 * 4. Deviation Stacking: Deviations stack downwards.
 * 5. Deviation Order: Rightmost (Later Turn) = Topmost.
 */
export function recalculateTreeLayout(nodes: TreeNode[]): TreeNode[] {
  if (nodes.length === 0) return []

  // 1. Build the Tree Structure
  const nodeMap = new Map<string, TreeNode>()
  const childrenMap = new Map<string, TreeNode[]>()
  
  const clonedNodes = nodes.map(n => ({ 
      ...n, 
      children: [] as string[]
  }))
  
  clonedNodes.forEach(node => nodeMap.set(node.id, node))

  clonedNodes.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!
        parent.children.push(node.id)
        
        if (!childrenMap.has(node.parentId)) {
            childrenMap.set(node.parentId, [])
        }
        childrenMap.get(node.parentId)!.push(node)
    }
  })

  const roots = clonedNodes.filter(n => !n.parentId || !nodeMap.has(n.parentId))

  // Global counter for new branches (Side branches)
  let nextBranchIndex = 1

  // Recursive Assignment
  // Returns total height
  function assignCoordinatesAndIndices(node: TreeNode, y: number, inheritedBranchIndex: number): number {
    node.x = START_X + node.turn * HORIZONTAL_SPACING
    node.y = y
    node.branchIndex = inheritedBranchIndex // Apply inherited (or root) index

    const children = childrenMap.get(node.id) || []

    if (children.length === 0) {
        return VERTICAL_SPACING
    }

    // --- SORTING ---
    // 1. Main Candidate (Oldest Created)
    children.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    
    const mainChild = children[0]
    const deviations = children.slice(1)

    // 2. Sort Deviations (Right = Top)
    deviations.sort((a, b) => {
        if (a.turn !== b.turn) {
            return b.turn - a.turn 
        }
        return (a.createdAt || 0) - (b.createdAt || 0)
    })

    const orderedChildren = [mainChild, ...deviations]

    let currentChildY = y
    let totalSubtreeHeight = 0

    for (let i = 0; i < orderedChildren.length; i++) {
        const child = orderedChildren[i]
        
        // --- BRANCH INDEX LOGIC ---
        let childBranchIndex = inheritedBranchIndex
        if (i > 0) {
            childBranchIndex = nextBranchIndex
            nextBranchIndex++
        }

        const childHeight = assignCoordinatesAndIndices(child, currentChildY, childBranchIndex)
        currentChildY += childHeight
        totalSubtreeHeight += childHeight
    }

    return totalSubtreeHeight
  }

  let rootY = VERTICAL_SPACING
  roots.forEach(root => {
      // Root starts with Branch Index 0
      const h = assignCoordinatesAndIndices(root, rootY, 0)
      rootY += h
  })

  return clonedNodes
}
