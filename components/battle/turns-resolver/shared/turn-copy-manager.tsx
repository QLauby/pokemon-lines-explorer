"use client"

import { ChevronRight, Copy, RotateCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { findCompatibleNodes, smartCopyTurnData, sortCompatibleNodes } from "@/lib/logic/turn-copy-logic"
import { cn } from "@/lib/utils/cn"
import { BattleState, TreeNode, TurnData } from "@/types/types"
import { getTreeBranchColor } from "../../battle-view"

interface TurnCopyManagerProps {
  allNodes: TreeNode[]
  targetInitialState: BattleState
  initialBattleState: BattleState
  currentBranchIndex: number
  excludeNodeId?: string
  onCopy: (data: TurnData, description: string, probability: number, probabilityExpression?: string) => void
  onReset: () => void
}

const branchToLetter = (index: number) => String.fromCharCode(64 + (index + 1))

export function TurnCopyManager({
  allNodes,
  targetInitialState,
  initialBattleState,
  currentBranchIndex,
  excludeNodeId,
  onCopy,
  onReset
}: TurnCopyManagerProps) {
  const [selectedBranchIndex, setSelectedBranchIndex] = useState<string>("")
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")

  // 1. Find and sort compatible nodes
  const compatibleNodes = useMemo(() => {
    const nodesMap = new Map(allNodes.map(n => [n.id, n]))
    const compatible = findCompatibleNodes(targetInitialState, allNodes, initialBattleState, nodesMap, excludeNodeId)
    return sortCompatibleNodes(compatible, currentBranchIndex)
  }, [allNodes, targetInitialState, initialBattleState, currentBranchIndex, excludeNodeId])

  // 2. Group by branch for the dropdown
  const branchGroups = useMemo(() => {
    const groups = new Map<number, TreeNode[]>()
    compatibleNodes.forEach(node => {
      if (!groups.has(node.branchIndex)) groups.set(node.branchIndex, [])
      groups.get(node.branchIndex)!.push(node)
    })
    return Array.from(groups.entries()).sort((a, b) => {
        // Current branch first
        if (a[0] === currentBranchIndex) return -1
        if (b[0] === currentBranchIndex) return 1
        return a[0] - b[0]
    })
  }, [compatibleNodes, currentBranchIndex])

  // Handle Copy Action
  const handleCopy = () => {
    const sourceNode = allNodes.find(n => n.id === selectedNodeId)
    if (!sourceNode) return

    const cleanedData = smartCopyTurnData(sourceNode.turnData, targetInitialState)
    onCopy(
        cleanedData, 
        sourceNode.description, 
        sourceNode.probability, 
        sourceNode.probabilityExpression
    )
    
    // Clear selection after copy to prevent accidental double copying
    setSelectedBranchIndex("")
    setSelectedNodeId("")
  }

  if (compatibleNodes.length === 0) {
      return (
          <div className="flex items-center justify-between p-2.5 bg-slate-50/50 border rounded-lg mb-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 opacity-50" />
                  <span>No compatible turns found (same team required on field).</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset} 
                className="h-6 px-2 text-[10px] text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-md uppercase font-bold tracking-tight"
              >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset Turn
              </Button>
          </div>
      )
  }

  const nodesInSelectedBranch = selectedBranchIndex !== "" 
    ? branchGroups.find(g => g[0].toString() === selectedBranchIndex)?.[1] || []
    : []

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-slate-50/80 border rounded-xl mb-6 ring-1 ring-black/5 shadow-sm">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Copy className="w-3.5 h-3.5 text-primary/70" />
              <span>Copy Existing Turn</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReset} 
            className="h-6 px-2 text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors uppercase font-bold tracking-tight"
          >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset All
          </Button>
      </div>

      <div className="flex items-center gap-2">
          {/* Branch Select */}
          <div className="w-[110px]">
              <Select 
                value={selectedBranchIndex} 
                onValueChange={(val) => {
                  setSelectedBranchIndex(val)
                  setSelectedNodeId("")
                }}
              >
                <SelectTrigger className="h-8 text-[11px] bg-white ring-0 focus:ring-1 focus:ring-primary/20">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchGroups.map(([idx, nodes]) => {
                    const color = getTreeBranchColor(idx)
                    return (
                        <SelectItem key={idx} value={idx.toString()} className="text-[11px] py-1 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className={cn(idx === currentBranchIndex && "font-bold")}>
                                    Branch {branchToLetter(idx)}
                                </span>
                                <span className="text-[9px] text-slate-400 ml-auto">({nodes.length})</span>
                            </div>
                        </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
          </div>

          <div className="text-slate-300">
              <ChevronRight className="w-3 h-3" />
          </div>

          {/* Node Select */}
          <div className="flex-1 min-w-0">
              <Select 
                value={selectedNodeId} 
                onValueChange={setSelectedNodeId}
                disabled={!selectedBranchIndex}
              >
                <SelectTrigger className="h-8 text-[11px] bg-white ring-0 focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50">
                  <SelectValue placeholder="Turn" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {nodesInSelectedBranch.map(node => {
                    const color = getTreeBranchColor(node.branchIndex)
                    return (
                        <SelectItem key={node.id} value={node.id} className="text-[11px] py-1 px-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums" style={{ color }}>
                                  T{node.turn}
                                </span>
                                {node.description && (
                                    <span className="text-slate-400 truncate max-w-[120px]">
                                        {node.description}
                                    </span>
                                )}
                            </div>
                        </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
          </div>

          {/* Action Button */}
          <Button 
            disabled={!selectedNodeId}
            onClick={handleCopy}
            className="h-8 px-3 bg-primary text-white hover:bg-primary/90 shadow-sm text-[11px] font-bold uppercase tracking-tight"
          >
              Copy
          </Button>
      </div>
    </div>
  )
}
