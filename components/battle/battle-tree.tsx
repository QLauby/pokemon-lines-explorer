"use client"

import { Minus, Plus, RotateCcw } from "lucide-react"
import { useState } from "react"

import DeletionDialog from "@/components/shared/deletion-dialog"

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
import { PALETTE, THEME } from "@/lib/constants/color-constants"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { useIsDark } from "@/lib/hooks/use-is-dark"
import { cn } from "@/lib/utils/cn"
import { darkenColor, lightenColor } from "@/lib/utils/colors-utils"
import { formatKoRisk } from "@/lib/utils/hp-utils"
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
  koNodesInfo?: Map<string, { events: { name: string, type: "ko" | "range", probability: number, isTriggered: boolean }[] }>
}

export function BattleTree({
  nodes,
  selectedNodeId,
  onSelectedNodeChange,
  onResetBattle,
  onUpdateNode,
  highlightedNodeIds = [],
  previewNodeId = null,
  koNodesInfo = new Map(),
}: BattleTreeProps) {
  const isDark = useIsDark()
  const [zoom, setZoom] = useState(1)
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false)
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
            <div className="flex items-center px-2 text-xs font-medium min-w-[3.5rem] justify-center" style={{ backgroundColor: THEME.battle_tree.zoom_label_bg }}>
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
          <Button variant="outline" size="sm" onClick={() => setIsRestartDialogOpen(true)} className="cursor-pointer h-8" disabled={isCorrupted}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <div

          className="relative border rounded bg-[var(--color-tree-bg)] overflow-auto h-full w-full transition-colors duration-300"
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
                    const color = isNodeCorrupted ? THEME.common.error : getTreeBranchColor(node.branchIndex, isDark)


                    if (node.branchIndex === 0) {
                        return (
                            <line
                                key={`${parent.id}-${node.id}`}
                                x1={parent.x}
                                y1={parent.y}
                                x2={node.x}
                                y2={node.y}
                                stroke={color}
                                strokeWidth="3.5"
                                strokeDasharray={isPreview ? "6 4" : "none"}
                                style={{ filter: `drop-shadow(0 0 calc(5px * var(--glow-intensity, 1)) ${color})` }}
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
                                strokeWidth="3.5"
                                strokeOpacity={1}
                                strokeDasharray={node.id.startsWith("preview-") ? "4 2" : "0"}
                                fill="none"
                                className="transition-all duration-300 transition-colors"
                                style={{ 
                                    filter: `drop-shadow(0 0 calc(5px * var(--glow-intensity, 1)) ${color})`
                                } as React.CSSProperties}
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
                    const branchColor = isNodeCorrupted ? THEME.common.error : getTreeBranchColor(node.branchIndex, isDark)

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
                                                    "flex items-center justify-center rounded-[2px] font-bold text-[7px] leading-none tabular-nums shadow-sm transition-all border border-transparent hover:border-slate-200",
                                                    !isPreview ? "cursor-pointer hover:shadow-md" : "opacity-70"
                                                )}
                                                style={{
                                                    backgroundColor: THEME.battle_tree.zoom_label_bg,
                                                    color: branchColor,
                                                    minWidth: "18px",
                                                    height: "10px",
                                                    padding: "0 2px"
                                                }}
                                            >
                                                {(() => {
                                                    const val = node.probability * 100
                                                    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1))
                                                })()} %
                                            </div>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent 
                                        side="top" 
                                        className="shadow-xl z-[100] p-2"
                                        style={{ backgroundColor: THEME.tooltips.bg, color: THEME.tooltips.text }}
                                    >
                                        <div className="flex flex-col items-center" style={{ color: THEME.tooltips.text }}>
                                            <p className="font-bold text-[11px]">Probability : {(() => {
                                                const val = node.probability * 100
                                                return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1))
                                            })()} %</p>
                                            <p className="text-[9px] opacity-50">Click to edit</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-48 p-3" side="top">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: THEME.battle_tree.description_text }}>Edit probability</label>
                                        <div className="flex justify-center py-1">
                                            <EditableText
                                                value={node.probability.toString()}
                                                onChange={(val) => onUpdateNode?.(node.id, { probability: Number(val) })}
                                                rawEquationString={node.probabilityExpression}
                                                onEquationChange={(eq) => onUpdateNode?.(node.id, { probabilityExpression: eq })}
                                                type="number"
                                                numberMode="percent"
                                                placeholder="e.g. 12.5 or = 1/8"
                                                min={0}
                                                max={1}
                                                decimals={1}
                                                fontSize={16}
                                                width="100%"
                                                textAlign="center"
                                                rounded={true}
                                                mainColor={branchColor}
                                                startInEditMode={true}
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
                const branchColor = isNodeCorrupted ? THEME.common.error : getTreeBranchColor(node.branchIndex, isDark)
                
                const safeBranchColor = node.turn === 0 ? (isDark ? PALETTE.battle_tree_root.dark : PALETTE.battle_tree_root.light) : branchColor
                const nodeText = isSelected ? (isDark ? "#000000" : "#ffffff") : safeBranchColor
                const nodeBg = isSelected ? safeBranchColor : THEME.battle_tree.node_bg

                return (
                    <div
                        key={node.id}
                        className="absolute"
                        style={{
                            left: `${node.x - 12}px`,
                            top: `${node.y - 12}px`,
                            zIndex: isSelected ? 50 : 40
                        } as React.CSSProperties}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className={cn(
                                        "w-6 h-6 rounded-full text-[10px] font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center p-0 border-[2px] outline-none",
                                        isSelected ? "scale-110 glow-active shadow-lg border-2" : "hover:scale-105"
                                    )}
                                    style={{
                                        borderColor: safeBranchColor,
                                        backgroundColor: nodeBg,
                                        color: nodeText,
                                        boxShadow: isSelected ? `0 0 calc(20px * var(--glow-intensity, 1)) ${safeBranchColor}` : "none",
                                        zIndex: isSelected ? 50 : 40,
                                        opacity: 1
                                    } as React.CSSProperties}
                                    onClick={() => onSelectedNodeChange(node.id)}
                                >
                                    {node.turn}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent 
                                side="bottom" 
                                className="shadow-xl z-[100] max-w-[220px] text-center p-2 space-y-1"
                                style={{ backgroundColor: THEME.tooltips.bg, color: THEME.tooltips.text }}
                            >
                                <div className="font-bold flex items-center justify-between gap-4" style={{ color: THEME.tooltips.text }}>
                                    <span className="tabular-nums text-[11px]">
                                        P(<span style={{ color: branchColor }}>{node.turn}</span>) = {(() => {
                                            const val = node.cumulativeProbability * 100
                                            return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1))
                                        })()} %
                                    </span>
                                </div>
                                {koNodesInfo.has(node.id) && (
                                    <div className="flex flex-col gap-1 mt-1.5 w-full text-left">
                                        {koNodesInfo.get(node.id)!.events.map((event, idx) => {
                                            const isKO = event.type === "ko"
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={cn(
                                                        "text-[9px] px-2 py-1 rounded-[4px] font-medium flex items-center justify-between gap-1.5 shadow-sm border",
                                                        isKO 
                                                            ? "bg-amber-600/10 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border-amber-600/30 dark:border-amber-500" 
                                                            : "bg-orange-600/10 dark:bg-orange-900 text-orange-900 dark:text-orange-100 border-orange-600/30 dark:border-orange-500"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className={cn("text-[10px]", isKO ? "text-amber-600 dark:text-amber-400" : "text-orange-600 dark:text-orange-400")}>
                                                            {isKO ? "☠" : "⚠"}
                                                        </span>
                                                        <span className="leading-tight font-black uppercase tracking-tight shrink-0">
                                                            {isKO ? "K.O." : "Range"}{" "} :
                                                        </span>
                                                        <span className="leading-tight truncate">{event.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="font-bold tabular-nums">
                                                            {isKO ? "100" : formatKoRisk(event.probability)}%
                                                        </span>
                                                        {event.isTriggered && (
                                                            <span 
                                                                className="text-[7px] text-white px-1 rounded-[2px] font-black uppercase animate-pulse glow-active"
                                                                style={{ 
                                                                    backgroundColor: THEME.ko.bordeaux,
                                                                    boxShadow: `0 0 calc(12px * var(--glow-intensity, 1)) var(--color-ko, #ff0055)` 
                                                                }}
                                                            >
                                                                Triggered
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                {node.description && (
                                    <p className="text-[10px] italic border-t border-black/10 dark:border-white/10 pt-1.5 mt-1.5 line-clamp-3 opacity-50">
                                        {node.description}
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                        {koNodesInfo.has(node.id) && koNodesInfo.get(node.id)!.events.length > 0 && (
                            <div 
                                className="absolute -top-[4.5px] -right-[7px] text-white rounded-[2px] px-[2.5px] py-0.5 flex items-center justify-center text-[7px] font-black z-[60] leading-none select-none tracking-tight border border-white shadow-lg pointer-events-none glow-active"
                                style={{ 
                                    backgroundColor: koNodesInfo.get(node.id)!.events.some(e => e.type === "ko" || e.isTriggered) 
                                        ? THEME.ko.bordeaux 
                                        : THEME.ko.uncertain,
                                    boxShadow: `0 0 calc(12px * var(--glow-intensity, 1)) var(--glow-color, #ff0055)`,
                                    "--glow-color": koNodesInfo.get(node.id)!.events.some(e => e.type === "ko" || e.isTriggered) 
                                        ? "var(--color-ko, #ff0055)" 
                                        : "var(--color-opp, #ff6600)"
                                } as React.CSSProperties}
                            >
                                KO
                            </div>
                        )}
                        {node.description && node.description.trim().length > 0 && (
                            <div 
                                className="absolute -bottom-[3px] -right-[3px] rounded-full w-[11px] h-[11px] flex items-center justify-center text-[7px] font-black z-[60] leading-none select-none border border-white shadow-sm pointer-events-none"
                                style={{ 
                                    backgroundColor: THEME.battle_tree.node_description_badge,
                                    color: THEME.battle_tree.node_description_badge_text
                                }}
                            >
                                d
                            </div>
                        )}
                    </div>
                )
                })}
            </div>
          </div>
        </div>
      </div>
      <DeletionDialog 
        open={isRestartDialogOpen}
        onOpenChange={setIsRestartDialogOpen}
        onConfirm={() => {
            onResetBattle()
            setIsRestartDialogOpen(false)
        }}
        title="Restart Session"
        description="This will permanently delete all branches and turns. Only the initial setup will be preserved. This action cannot be undone."
        confirmLabel="Restart"
      />
    </div>
    </TooltipProvider>
  )
}
