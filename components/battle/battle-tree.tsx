"use client"

import { Minus, Plus, RotateCcw } from "lucide-react"
import { useState } from "react"

import { EditableText } from "@/components/shared/editable-text"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { cn } from "@/lib/utils/cn"
import { darkenColor, lightenColor } from "@/lib/utils/colors-utils"
import { TreeNode } from "@/types/types"
import { getTreeBranchColor } from "./battle-view"

interface BattleTreeProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  onSelectedNodeChange: (nodeId: string) => void
  onResetBattle: () => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  highlightedNodeIds?: string[]
  previewNodeId?: string | null
}

export function BattleTree({
  nodes,
  selectedNodeId,
  onSelectedNodeChange,
  onResetBattle,
  onUpdateNode,
  highlightedNodeIds = [],
  previewNodeId = null,
}: BattleTreeProps) {
  const [zoom, setZoom] = useState(1)
  const { corruptedNodeIds, isCorrupted } = useCorruptionHandler()

  if (nodes.size === 0) return null

  const nodeValues = Array.from(nodes.values())
  const maxX = Math.max(...nodeValues.map((n) => n.x)) + 100
  const maxY = Math.max(...nodeValues.map((n) => n.y)) + 100

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5))

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full">
      <div className="flex flex-row items-center justify-between p-4 border-b shrink-0">
        <h3 className="text-lg font-bold">Battle Tree</h3>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden mr-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleZoomOut} 
                className="h-8 w-8 p-0 rounded-none border-r"
                disabled={zoom <= 0.5}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-2 bg-gray-50 text-xs font-medium min-w-[3.5rem] justify-center">
                {Math.round(zoom * 100)}%
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleZoomIn} 
                className="h-8 w-8 p-0 rounded-none border-l"
                disabled={zoom >= 2}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onResetBattle} className="cursor-pointer h-8" disabled={isCorrupted}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <div
          className="relative border rounded bg-gray-50 overflow-auto h-full w-full"
        >
          <div
            className="relative origin-top-left transition-transform duration-200"
            style={{
              width: `${maxX * zoom}px`,
              height: `${maxY * zoom}px`,
            }}
          >
            <div 
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
                width: `${maxX}px`,
                height: `${maxY}px`
              }}
            >
                <svg className="absolute inset-0 pointer-events-none" width={maxX} height={maxY}>
                {nodeValues.map((node) => {
                    if (!node.parentId) return null

                    const parent = nodes.get(node.parentId)
                    if (!parent) return null

                    const isNodeCorrupted = corruptedNodeIds.includes(node.id) || highlightedNodeIds.includes(node.id)
                    const isPreview = node.id === previewNodeId
                    const color = isNodeCorrupted ? "#ef4444" : getTreeBranchColor(node.branchIndex)

                    if (node.branchIndex === 0) {
                        return (
                            <line
                                key={`${parent.id}-${node.id}`}
                                x1={parent.x}
                                y1={parent.y}
                                x2={node.x}
                                y2={node.y}
                                stroke={color}
                                strokeWidth="2.5"
                                strokeDasharray={isPreview ? "6 4" : "none"}
                            />
                        )
                    } else {
                        const deltaX = node.x - parent.x
                        const deltaY = node.y - parent.y

                        const controlX1 = parent.x + deltaX * 0.3
                        const controlY1 = parent.y + deltaY * 0.1
                        const controlX2 = parent.x + deltaX * 0.7
                        const controlY2 = node.y - deltaY * 0.1

                        const pathData = `M ${parent.x} ${parent.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${node.x} ${node.y}`

                        return (
                            <path 
                                key={`${parent.id}-${node.id}`} 
                                d={pathData} 
                                stroke={color} 
                                strokeWidth="2.5" 
                                fill="none"
                                strokeDasharray={isPreview ? "6 4" : "none"} 
                            />
                        )
                    }
                })}
                </svg>

                {/* Probability Labels (HTML for perfect centering) */}
                {nodeValues.map((node) => {
                    if (!node.parentId) return null
                    const parent = nodes.get(node.parentId)
                    if (!parent) return null
                    
                    let labelX, labelY
                    if (node.branchIndex === 0) {
                        labelX = (parent.x + node.x) / 2
                        labelY = (parent.y + node.y) / 2
                    } else {
                        const deltaX = node.x - parent.x
                        const deltaY = node.y - parent.y
                        const controlX1 = parent.x + deltaX * 0.3
                        const controlY1 = parent.y + deltaY * 0.1
                        const controlX2 = parent.x + deltaX * 0.7
                        const controlY2 = node.y - deltaY * 0.1
                        
                        // Midpoint of Cubic Bezier at t=0.5
                        labelX = 0.125 * parent.x + 0.375 * controlX1 + 0.375 * controlX2 + 0.125 * node.x
                        labelY = 0.125 * parent.y + 0.375 * controlY1 + 0.375 * controlY2 + 0.125 * node.y
                    }

                    const isNodeCorrupted = corruptedNodeIds.includes(node.id) || highlightedNodeIds.includes(node.id)
                    const isPreview = node.id === previewNodeId
                    const branchColor = isNodeCorrupted ? "#ef4444" : getTreeBranchColor(node.branchIndex)

                    if (isPreview) return null

                    return (
                        <div 
                            key={`prob-${node.id}`}
                            className="absolute"
                            style={{
                                left: `${labelX}px`,
                                top: `${labelY}px`,
                                transform: "translate(-50%, -50%)",
                                zIndex: isPreview ? 0 : 30
                            }}
                        >
                            <Popover>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild disabled={isPreview}>
                                            <div 
                                                className={cn(
                                                    "flex items-center justify-center bg-gray-50 rounded-[2px] font-bold text-[7px] leading-none tabular-nums shadow-sm transition-all border border-transparent hover:border-gray-200",
                                                    !isPreview ? "cursor-pointer hover:shadow-md" : "opacity-70"
                                                )}
                                                style={{
                                                    color: branchColor,
                                                    minWidth: "18px",
                                                    height: "10px",
                                                    padding: "0 2px"
                                                }}
                                            >
                                                {(() => {
                                                    const val = node.probability * 100
                                                    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(".", ",")
                                                })()} %
                                            </div>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <div className="flex flex-col items-center">
                                            <p className="font-bold text-xs">Probability: {(() => {
                                                const val = node.probability * 100
                                                return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(".", ",")
                                            })()} %</p>
                                            {!isPreview && <p className="text-[10px] text-gray-400">Click to edit</p>}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-48 p-3" side="top">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Edit probability</label>
                                        <div className="flex justify-center py-1">
                                            <EditableText
                                                value={node.probability.toString()}
                                                onChange={(val) => onUpdateNode?.(node.id, { probability: Number(val) })}
                                                rawEquationString={node.probabilityExpression}
                                                onEquationChange={(eq) => onUpdateNode?.(node.id, { probabilityExpression: eq })}
                                                type="number"
                                                numberMode="percent"
                                                min={0}
                                                max={1}
                                                decimals={1}
                                                fontSize={16}
                                                width="100%"
                                                textAlign="center"
                                                rounded={true}
                                                mainColor={branchColor}
                                            />
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )
                })}

                {nodeValues.map((node) => {
                const isSelected = node.id === selectedNodeId
                // Turn 0 is never "corrupted" visually (it's a reset), so never show red
                const isNodeCorrupted = node.turn !== 0 && (corruptedNodeIds.includes(node.id) || highlightedNodeIds.includes(node.id))
                const isPreview = node.id === previewNodeId
                const branchColor = isNodeCorrupted ? "#ef4444" : getTreeBranchColor(node.branchIndex)
                
                const activeBg = isNodeCorrupted ? "#fee2e2" : lightenColor(branchColor, 30) // Red-100 if corrupted
                const activeText = isNodeCorrupted ? "#b91c1c" : darkenColor(branchColor, 40) // Red-700 if corrupted

                return (
                    <div
                        key={node.id}
                        className="absolute"
                        style={{
                            left: `${node.x - 12}px`,
                            top: `${node.y - 12}px`,
                            "--node-active-bg": activeBg,
                            "--node-active-text": activeText,
                            "--node-branch-color": branchColor,
                            zIndex: 40
                        } as React.CSSProperties}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`
                                    w-6 h-6 rounded-full text-[10px] font-extrabold transition-all duration-200 cursor-pointer
                                    flex items-center justify-center p-0
                                    border-[2px] border-[var(--node-branch-color)]
                                    hover:bg-[var(--node-active-bg)] hover:text-[var(--node-active-text)]
                                    ${isSelected 
                                        ? "bg-[var(--node-active-bg)] text-[var(--node-active-text)] scale-110 shadow-lg" 
                                        : "bg-white text-[var(--node-branch-color)]"
                                    }
                                    `}
                                    style={{
                                        boxShadow: isSelected ? `0 0 12px ${branchColor}44` : "none",
                                    }}
                                    onClick={() => onSelectedNodeChange(node.id)}
                                >
                                    {node.turn}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] text-center p-2 space-y-1">
                                <div className="font-bold flex items-center justify-between gap-4">
                                    <span className="tabular-nums">
                                        P(<span style={{ color: branchColor }}>{node.turn}</span>) = {(() => {
                                            const val = node.cumulativeProbability * 100
                                            return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)).replace(".", ",")
                                        })()} %
                                    </span>
                                </div>
                                {node.description && (
                                    <p className="text-[10px] text-gray-500 italic border-t pt-1 line-clamp-3">
                                        {node.description}
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
