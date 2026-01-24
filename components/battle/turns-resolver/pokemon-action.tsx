"use client"

import { ChevronDown, ChevronRight, ChevronUp, Package, Plus, Repeat, Swords } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Pokemon, TurnAction, TurnActionType } from "@/lib/types"
import { cn } from "@/lib/utils"

import { HpChangeRow } from "./hp-change-row"

interface PokemonActionProps {
  action: TurnAction
  index: number
  totalActions: number
  actor: { pokemon: Pokemon; isAlly: boolean } | undefined
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onMove: (direction: "up" | "down") => void
  onToggleCollapse: () => void
  onUpdateType: (type: TurnActionType) => void
  onAddHpChange: () => void
  onUpdateHpChange: (hpIndex: number, field: "pokemonId" | "value" | "isHealing", value: string | number | boolean) => void
  onRemoveHpChange: (hpIndex: number) => void
}

export function PokemonAction({
  action,
  index,
  totalActions,
  actor,
  activePokemon,
  onMove,
  onToggleCollapse,
  onUpdateType,
  onAddHpChange,
  onUpdateHpChange,
  onRemoveHpChange,
}: PokemonActionProps) {
  const isAlly = actor?.isAlly ?? true
  
  const typeIcons = {
    attack: <Swords className="h-3.5 w-3.5" />,
    switch: <Repeat className="h-3.5 w-3.5" />,
    item: <Package className="h-3.5 w-3.5" />
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-md border",
        isAlly 
          ? "border-blue-100 bg-blue-50/30 hover:bg-blue-50/50" 
          : "border-red-100 bg-red-50/30 hover:bg-red-50/50"
      )}
    >
      {/* Header Area */}
      <div className="flex items-center gap-2 px-2 py-1.5 min-h-[40px]">
        {/* Reordering Strip */}
        <div className="flex flex-col gap-0 bg-background/50 rounded overflow-hidden border border-transparent group-hover:border-input transition-colors shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-3.5 w-5 rounded-none hover:bg-background border-b border-transparent hover:border-input"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-3.5 w-5 rounded-none hover:bg-background"
            disabled={index === totalActions - 1}
            onClick={() => onMove("down")}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Actor Info */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className={cn(
            "text-sm font-bold truncate",
            isAlly ? "text-blue-700" : "text-red-700"
          )}>
            {actor?.pokemon.name || action.actorId}
          </div>
          <div className="text-muted-foreground opacity-40">
              {typeIcons[action.type]}
          </div>
        </div>

        {/* Action Type Select - Compact style */}
        <div className="flex items-center gap-2">
            <select
                className="h-7 text-[10px] font-bold bg-background border border-input rounded px-1.5 focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none text-center min-w-[65px] text-muted-foreground hover:text-foreground transition-colors"
                value={action.type}
                onChange={(e) => onUpdateType(e.target.value as TurnActionType)}
            >
                <option value="attack">ATTACK</option>
                <option value="switch">SWITCH</option>
                <option value="item">ITEM</option>
            </select>

            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 transition-transform"
                onClick={onToggleCollapse}
            >
                {action.isCollapsed ? (
                <ChevronRight className="h-4 w-4 opacity-40" />
                ) : (
                <ChevronDown className="h-4 w-4 opacity-40" />
                )}
            </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {!action.isCollapsed && (
        <div className="border-t border-dashed px-3 py-2 pb-3 bg-white/40">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">HP Changes</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] hover:bg-background/80"
                onClick={onAddHpChange}
              >
                <Plus className="h-2.5 w-2.5 mr-1" /> Add
              </Button>
           </div>

            <div className="space-y-1.5">
                {action.hpChanges.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground italic pl-1">No effects</div>
                ) : (
                    action.hpChanges.map((delta, deltaIndex) => (
                        <HpChangeRow
                            key={deltaIndex}
                            pokemonId={delta.targetId}
                            value={Math.abs(delta.amount)}
                            isHealing={delta.amount > 0}
                            activePokemon={activePokemon}
                            onUpdate={(field, value) => onUpdateHpChange(deltaIndex, field, value)}
                            onRemove={() => onRemoveHpChange(deltaIndex)}
                        />
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  )
}
