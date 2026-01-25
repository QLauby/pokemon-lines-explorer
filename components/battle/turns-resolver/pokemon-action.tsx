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
  onUpdateTarget: (target: { side: "my" | "opponent", slotIndex: number }) => void
  onUpdateMetadata: (metadata: { itemName?: string; attackName?: string }) => void
  onAddHpChange: () => void
  onUpdateHpChange: (deltaIndex: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemoveHpChange: (deltaIndex: number) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
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
  onUpdateTarget,
  onUpdateMetadata,
  onAddHpChange,
  onUpdateHpChange,
  onRemoveHpChange,
  myTeam,
  enemyTeam,
}: PokemonActionProps) {
  const isAlly = action.actor.side === "my"
  
  const typeIcons = {
    attack: <Swords className="h-3.5 w-3.5" />,
    switch: <Repeat className="h-3.5 w-3.5" />,
    item: <Package className="h-3.5 w-3.5" />
  }
  
  const allActiveTargets = activePokemon.map(ap => {
      const side = ap.isAlly ? "my" : "opponent"
      const team = ap.isAlly ? myTeam : enemyTeam
      const slotIndex = team.findIndex(p => p.id === ap.pokemon.id)
      return {
          value: JSON.stringify({ side, slotIndex }),
          side,
          slotIndex,
          label: ap.pokemon.name,
          isAlly: ap.isAlly
      }
  }).sort((a,b) => {
      if (a.isAlly === b.isAlly) return 0
      return a.isAlly === isAlly ? 1 : -1 // Opponents first
  })

  // For Switch: Bench slots
  const teamMembers = (isAlly ? myTeam : enemyTeam).map((p, idx) => ({
    value: JSON.stringify({ side: isAlly ? "my" : "opponent", slotIndex: idx }),
    slotIndex: idx,
    label: p.name,
    isAlly: isAlly,
    id: p.id // for filtering
  }))

  const getActorName = () => {
      if (actor) return actor.pokemon.name.toUpperCase()
      // Fallback if we have raw slot info
      if (action.actor) {
          const team = action.actor.side === "my" ? myTeam : enemyTeam
          return team[action.actor.slotIndex]?.name.toUpperCase() || "UNKNOWN"
      }
      return "UNKNOWN"
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

        {/* Action Controls Row */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {/* 1. Actor Name */}
          <div className={cn(
            "text-[11px] font-extrabold truncate shrink-0 max-w-[90px]",
            isAlly ? "text-blue-700" : "text-red-700"
          )}>
            {getActorName()}
          </div>

          {/* 2. Action Type (Moved here) */}
          <div className="flex items-center shrink-0">
              <select
                  className="h-6 text-[9px] font-bold bg-background/50 border border-input rounded-l px-1 focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none text-muted-foreground hover:text-foreground transition-colors border-r-0"
                  value={action.type}
                  onChange={(e) => onUpdateType(e.target.value as TurnActionType)}
              >
                  <option value="attack">ATK</option>
                  <option value="switch">SWT</option>
                  <option value="item">ITM</option>
              </select>
              <div className="h-6 px-1 flex items-center justify-center bg-background/50 border border-input rounded-r border-l-0 text-muted-foreground opacity-60">
                {typeIcons[action.type]}
              </div>
          </div>

          {/* 3. Specific Details (Target/Input) */}
          <div className="shrink-0 flex items-center min-w-0">
             {/* ATTACK TARGETS */}
             {action.type === "attack" && (
                <select
                   className="h-6 w-[130px] text-[10px] font-medium bg-background/50 border border-input rounded px-1.5 outline-none focus:ring-1 focus:ring-ring truncate"
                   value={action.target ? JSON.stringify(action.target) : ""}
                   onChange={(e) => e.target.value && onUpdateTarget(JSON.parse(e.target.value))}
                >
                   <option value="">No Target</option>
                   {allActiveTargets.map(t => (
                      <option 
                        key={t.value} 
                        value={t.value}
                        className={t.isAlly ? "text-blue-600" : "text-red-600"}
                      >
                        {t.label}
                      </option>
                   ))}
                </select>
             )}

             {/* SWITCH TARGETS */}
             {action.type === "switch" && (
                <select
                   className="h-6 w-[130px] text-[10px] font-medium bg-background/50 border border-input rounded px-1.5 outline-none focus:ring-1 focus:ring-ring truncate"
                   value={action.target ? JSON.stringify(action.target) : ""}
                   onChange={(e) => e.target.value && onUpdateTarget(JSON.parse(e.target.value))}
                >
                   <option value="">Select...</option>
                   {teamMembers.filter(m => m.slotIndex !== action.actor.slotIndex).map(t => (
                      <option 
                        key={t.value} 
                        value={t.value}
                        className={t.isAlly ? "text-blue-600" : "text-red-600"}
                      >
                        {/* Always show arrow for switch targets as requested */}
                        {"\u2192 "}{t.label}
                      </option>
                   ))}
                </select>
             )}

             {/* ITEM INPUT */}
             {action.type === "item" && (
                <input 
                   className="h-6 w-[130px] text-[10px] bg-background/50 border border-input rounded px-2 outline-none focus:ring-1 focus:ring-ring placeholder:italic"
                   placeholder="Item name..."
                   value={action.metadata?.itemName || ""}
                   onChange={(e) => onUpdateMetadata({ itemName: e.target.value })}
                />
             )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onToggleCollapse}
        >
            {action.isCollapsed ? (
            <ChevronRight className="h-4 w-4 opacity-40" />
            ) : (
            <ChevronDown className="h-4 w-4 opacity-40" />
            )}
        </Button>
      </div>

      {/* Expanded Content */}
      {!action.isCollapsed && (
        <div className="border-t border-dashed px-3 py-2 pb-3 bg-white/40">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Consequences</span>
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
                {action.deltas.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground italic pl-1">No effects</div>
                ) : (
                    action.deltas.map((delta, deltaIndex) => {
                        if (delta.type !== "HP_RELATIVE") return null // Only show HP rows for now
                        return (
                          <HpChangeRow
                              key={deltaIndex}
                              target={delta.target}
                              value={Math.abs(delta.amount)}
                              isHealing={delta.amount > 0}
                              activePokemon={activePokemon}
                              onUpdate={(field, value) => onUpdateHpChange(deltaIndex, field, value)}
                              onRemove={() => onRemoveHpChange(deltaIndex)}
                              autoFocus={deltaIndex === action.deltas.length - 1}
                          />
                        )
                    })
                )}
            </div>
        </div>
      )}
    </div>
  )
}
