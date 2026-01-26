"use client"

import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { KO_BG_COLOR, KO_BORDEAUX } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils"
import { Pokemon, TurnAction } from "@/types/types"

import { SwitchEffects } from "./switch-effects"

interface SwitchActionAfterKoProps {
  action: TurnAction
  index: number
  totalActions: number
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  onUpdateTarget: (target: { side: "my" | "opponent", slotIndex: number }) => void
  onAddHpChange: () => void
  onUpdateHpChange: (index: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemoveHpChange: (index: number) => void
  onMoveHpChange: (fromIndex: number, toIndex: number) => void
  onMove: (direction: "up" | "down") => void
  onDelete: () => void
}

export function SwitchActionAfterKo({
  action,
  index,
  totalActions,
  activePokemon,
  myTeam,
  enemyTeam,
  onUpdateTarget,
  onAddHpChange,
  onUpdateHpChange,
  onRemoveHpChange,
  onMoveHpChange,
  onMove,
  onDelete,
}: SwitchActionAfterKoProps) {
  const isAlly = action.actor.side === "my"
  const team = isAlly ? myTeam : enemyTeam
  const actorPokemon = team[action.actor.slotIndex]
  const actorName = actorPokemon?.name || "Unknown"

  // Prepare Switch Options (Bench only, excluding actor)
  const teamMembers = team.map((p: Pokemon, idx: number) => ({
    value: JSON.stringify({ side: isAlly ? "my" : "opponent", slotIndex: idx }),
    slotIndex: idx,
    label: p.name,
    isAlly: isAlly,
    id: p.id
  }))

  const validOptions = teamMembers.filter(m => m.slotIndex !== action.actor.slotIndex)

  return (
    <div 
      className="relative flex rounded-r-md border border-l-4 shadow-sm mb-4"
      style={{ 
        borderLeftColor: KO_BORDEAUX,
        backgroundColor: KO_BG_COLOR,
        borderColor: "#e5e7eb" // gray-200
      }}
    >
       {/* Reordering Strip */}
       <div className="flex flex-col gap-0 border-r border-gray-200/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-1/2 w-6 rounded-none rounded-tl-sm hover:bg-black/5"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-3 w-3 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-1/2 w-6 rounded-none rounded-bl-sm hover:bg-black/5"
            disabled={index === totalActions - 1}
            onClick={() => onMove("down")}
          >
            <ChevronDown className="h-3 w-3 text-gray-500" />
          </Button>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50">
            <div className="flex items-center gap-2 text-xs text-gray-700">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>
                Replacement for KOed <span className="font-bold text-gray-900">{actorName}</span>
            </span>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-400 hover:text-red-700 hover:bg-red-50"
                onClick={onDelete}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
            {/* Selector Row */}
            <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">In</span>
                <select
                    className={cn(
                        "h-8 flex-1 text-sm bg-white border border-gray-300 rounded-md px-2 outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-colors shadow-sm",
                        !action.target && "border-dashed text-muted-foreground"
                    )}
                    value={action.target ? JSON.stringify(action.target) : ""}
                    onChange={(e) => e.target.value && onUpdateTarget(JSON.parse(e.target.value))}
                >
                    <option value="">Select replacement...</option>
                    {validOptions.map(t => (
                        <option 
                        key={t.value} 
                        value={t.value}
                        className="text-gray-900 font-medium"
                        >
                        {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Effects (Hazards) */}
            <div className="pt-1">
                <SwitchEffects
                    action={action}
                    activePokemon={activePokemon}
                    onAddEntryHpChange={onAddHpChange}
                    onUpdateHpChange={onUpdateHpChange}
                    onRemoveHpChange={onRemoveHpChange}
                    onMoveHpChange={onMoveHpChange}
                    myTeam={myTeam}
                    enemyTeam={enemyTeam}
                />
            </div>
        </div>
      </div>
    </div>
  )
}
