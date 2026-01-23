import DeletionDialog from "@/components/shared/deletion-dialog"
import { Button } from "@/components/ui/button"
import { TreeNode } from "@/lib/types"
import { useState } from "react"
import { getTreeBranchColor } from "../battle-view"

interface DeleteFromCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onDeleteNode: (nodeId: string) => void
}

export function DeleteFromCurrentTurn({
  selectedNodeId,
  nodes,
  onDeleteNode,
}: DeleteFromCurrentTurnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Calculate affected nodes (subtree)
  const getSubtree = (nodeId: string): TreeNode[] => {
    const list: TreeNode[] = []
    const helper = (id: string) => {
        const node = nodes.get(id)
        if (node) {
            list.push(node)
            node.children.forEach(helper)
        }
    }
    helper(nodeId)
    return list.sort((a, b) => a.turn - b.turn)
  }
  
  const affectedNodes = getSubtree(selectedNodeId)
  const mainNode = nodes.get(selectedNodeId)

  if (!mainNode) return <div>No turn selected</div>

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-800">
        <p className="font-semibold mb-1">Attention Required</p>
        <p>
          Deleting this turn will also remove <strong>{affectedNodes.length - 1}</strong> subsequent turns that branch from it.
          This action cannot be undone.
        </p>
      </div>
      
      <div className="border rounded-md overflow-hidden bg-white">
        <div className="bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Turns to be deleted
        </div>
        <div className="max-h-[300px] overflow-y-auto">
            {Object.entries(
                affectedNodes.reduce((acc, node) => {
                    const branch = node.branchIndex
                    if (!acc[branch]) acc[branch] = []
                    acc[branch].push(node)
                    return acc
                }, {} as Record<number, TreeNode[]>)
            ).sort(([a], [b]) => Number(a) - Number(b)).map(([branchIndex, branchNodes]) => {
                const branchColor = getTreeBranchColor(Number(branchIndex))
                return (
                    <div key={branchIndex} className="border-b last:border-b-0">
                         <div 
                            className="bg-gray-50/50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                            style={{ color: branchColor, backgroundColor: `${branchColor}10` }}
                         >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: branchColor }} />
                            Branch {branchIndex}
                         </div>
                         <div className="divide-y">
                            {branchNodes.map(node => (
                                <div key={node.id} className="px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                                            style={{ backgroundColor: branchColor }}
                                        >
                                            {node.turn}
                                        </div>
                                        <span className="font-medium text-gray-700">Turn {node.turn}</span>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )
            })}
        </div>
      </div>

      <div className="pt-2">
        <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => setIsDialogOpen(true)}
        >
            Delete {affectedNodes.length} Turns
        </Button>
      </div>

      <DeletionDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={() => {
            onDeleteNode(selectedNodeId)
            setIsDialogOpen(false)
        }}
        title="Confirm Deletion"
        description={`Are you sure you want to delete turn ${mainNode.turn} and all ${affectedNodes.length - 1} following turns? This will permanently remove them from the battle tree.`}
      />
    </div>
  )
}
