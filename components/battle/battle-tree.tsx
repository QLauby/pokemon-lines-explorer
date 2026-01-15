"use client"

import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TreeNode } from "@/lib/types"

interface BattleTreeProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  scrollX: number
  onSelectedNodeChange: (nodeId: string) => void
  onScrollChange: (direction: "left" | "right") => void
  onResetBattle: () => void
}

export function BattleTree({
  nodes,
  selectedNodeId,
  scrollX,
  onSelectedNodeChange,
  onScrollChange,
  onResetBattle,
}: BattleTreeProps) {
  if (nodes.size === 0) return null

  const branchColors = ["#666666", "#FFD700", "#9932CC", "#FF6347", "#32CD32", "#1E90FF"]

  const maxX = Math.max(...Array.from(nodes.values()).map((n) => n.x)) + 100
  const maxY = Math.max(...Array.from(nodes.values()).map((n) => n.y)) + 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Arbre des Possibilités</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onScrollChange("left")} className="cursor-pointer">
            ←
          </Button>
          <Button variant="outline" size="sm" onClick={() => onScrollChange("right")} className="cursor-pointer">
            →
          </Button>
          <Button variant="outline" size="sm" onClick={onResetBattle} className="cursor-pointer">
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative border rounded bg-gray-50 overflow-y-auto overflow-x-hidden"
          style={{ height: "400px", width: "100%", maxWidth: "100%" }}
        >
          <div
            className="relative transition-transform duration-200"
            style={{
              transform: `translateX(-${scrollX}px)`,
              height: `${maxY}px`,
            }}
          >
            <svg className="absolute inset-0 pointer-events-none" width={maxX} height={maxY}>
              {Array.from(nodes.values()).map((node) => {
                if (!node.parentId) return null

                const parent = nodes.get(node.parentId)
                if (!parent) return null

                const color = branchColors[node.branchIndex % branchColors.length]

                if (node.branchIndex === 0) {
                  return (
                    <line
                      key={`${parent.id}-${node.id}`}
                      x1={parent.x}
                      y1={parent.y}
                      x2={node.x}
                      y2={node.y}
                      stroke={color}
                      strokeWidth="3"
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
                    <path key={`${parent.id}-${node.id}`} d={pathData} stroke={color} strokeWidth="3" fill="none" />
                  )
                }
              })}
            </svg>

            {Array.from(nodes.values()).map((node) => {
              const isSelected = node.id === selectedNodeId
              const color = branchColors[node.branchIndex % branchColors.length]

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: `${node.x - 25}px`,
                    top: `${node.y - 25}px`,
                  }}
                >
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`
                      w-10 h-10 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-300 scale-110"
                          : "bg-white hover:bg-gray-50"
                      }
                    `}
                    style={{
                      borderColor: isSelected ? "#1d4ed8" : color,
                      borderWidth: "2px",
                    }}
                    onClick={() => onSelectedNodeChange(node.id)}
                  >
                    {node.turn}
                  </Button>

                  {node.id !== "root" && (
                    <div className="absolute text-xs font-semibold text-center w-10 mt-1" style={{ color }}>
                      {node.probability}%
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
