import DeletionDialog from "@/components/shared/deletion-dialog"
import { Button } from "@/components/ui/button"
import { useCorruptionHandler } from "@/lib/hooks/features/use-corruption-handler"
import { TreeNode } from "@/lib/types"
import { useEffect, useState } from "react"

interface DeleteFromCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onDeleteNode: (nodeId: string) => void
  onHighlightNodes: (ids: string[]) => void
}

export function DeleteFromCurrentTurn({
  selectedNodeId,
  nodes,
  onDeleteNode,
  onHighlightNodes,
}: DeleteFromCurrentTurnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { isCorrupted } = useCorruptionHandler()
  
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
  
  const allAffectedNodes = getSubtree(selectedNodeId)
  const affectedNodes = allAffectedNodes.filter(n => n.turn !== 0)
  const mainNode = nodes.get(selectedNodeId)

  // Highlight effect
  useEffect(() => {
    if (mainNode) {
        onHighlightNodes(affectedNodes.map(n => n.id))
    }
    return () => onHighlightNodes([])
  }, [selectedNodeId, nodes, onHighlightNodes]) // Re-run when selection or tree changes

  if (!mainNode) return <div>No turn selected</div>

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-800">
        <p className="font-semibold mb-1">Attention Required</p>
        <p>
          {mainNode.turn === 0 
            ? `Deleting from root will remove all ${affectedNodes.length} turns in this session. The initial state (Turn 0) will be preserved.`
            : `Deleting this turn will also remove ${Math.max(0, affectedNodes.length - 1)} subsequent turns that branch from it.`
          }
          {" "}This action cannot be undone.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-red-600/80">
            See highlighted turns in the tree
        </p>
      </div>
      
      {/* Removed textual list as requested */}

      <div className="pt-2">
        {isCorrupted && (
          <p className="text-sm text-red-600 mb-2 font-medium">
             Cannot delete turns while collision is detected. Please resolve corruption first.
          </p>
        )}
        <Button 
            className="w-full bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 border disabled:opacity-50"
            onClick={() => setIsDialogOpen(true)}
            disabled={affectedNodes.length === 0 || isCorrupted}
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
        description={mainNode.turn === 0 
            ? `Voulez-vous vraiment supprimer TOUS les tours (${affectedNodes.length}) de cette session ? Le tour 0 sera conservé mais vidé de son contenu.`
            : affectedNodes.length > 1 
                ? `Are you sure you want to delete turn ${mainNode.turn} and all ${affectedNodes.length - 1} following turns?`
                : `Are you sure you want to delete turn ${mainNode.turn}?`
        }
      />
    </div>
  )
}
