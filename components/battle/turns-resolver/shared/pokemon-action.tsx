"use client"

import { useEffect } from "react"

import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Package, Repeat, Swords } from "lucide-react"

import { Button } from "@/components/ui/button"
import { KO_BG_COLOR, KO_BORDEAUX } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils"
import { Pokemon, SlotReference, TurnAction, TurnActionType } from "@/types/types"

import { EffectsList } from "./effects-list"
import { SwitchEffects } from "./switch-effects"

interface PokemonActionProps {
  action: TurnAction
  index: number
  totalActions: number
  actor: { pokemon: Pokemon; isAlly: boolean } | undefined
  onMove: (direction: "up" | "down") => void
  onToggleCollapse: () => void
  onUpdateType: (type: TurnActionType) => void
  onUpdateTarget: (target: { side: "my" | "opponent", slotIndex: number } | undefined) => void
  onUpdateMetadata: (metadata: { itemName?: string; attackName?: string }) => void
  onAddHpChange: () => void
  onUpdateHpChange: (deltaIndex: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemoveHpChange: (deltaIndex: number) => void
  onMoveHpChange: (fromIndex: number, toIndex: number) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  // Optional props for Forced Switch mode
  onDelete?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  canDefuse?: boolean
}

export function PokemonAction({
  action,
  index,
  totalActions,
  actor,
  onMove,
  onToggleCollapse,
  onUpdateType,
  onUpdateTarget,
  onUpdateMetadata,
  onAddHpChange,
  onUpdateHpChange,
  onRemoveHpChange,
  onMoveHpChange,
  myTeam,
  enemyTeam,
  activeSlots,
  onDelete,
  canMoveUp = true,
  canMoveDown = true,
  canDefuse = false,
}: PokemonActionProps) {
  const isAlly = action.actor.side === "my"
  const isSwitchAfterKo = action.type === "switch-after-ko"
  
  const typeIcons = {
    attack: <Swords className="h-3.5 w-3.5" />,
    switch: <Repeat className="h-3.5 w-3.5" />,
    item: <Package className="h-3.5 w-3.5" />,
    "switch-after-ko": <Repeat className="h-3.5 w-3.5" />
  }
  
  // --- 1. Available Attack Targets (Everyone on field) ---
  const activeTargets: { label: string; value: string; isAlly: boolean; side: "my" | "opponent"; slotIndex: number }[] = []

  // Add My Active Pokemon
  activeSlots.myTeam.forEach((teamMemberIndex, battlefieldSlotIndex) => {
      if (teamMemberIndex !== null && teamMemberIndex !== undefined && myTeam[teamMemberIndex]) {
          const pokemon = myTeam[teamMemberIndex]
          if (pokemon.hpPercent > 0) {
              activeTargets.push({
                  label: pokemon.name,
                  value: JSON.stringify({ side: "my", slotIndex: battlefieldSlotIndex }),
                  isAlly: true,
                  side: "my",
                  slotIndex: battlefieldSlotIndex
              })
          }
      }
  })

  // Add Opponent Active Pokemon
  activeSlots.opponentTeam.forEach((teamMemberIndex, battlefieldSlotIndex) => {
      if (teamMemberIndex !== null && teamMemberIndex !== undefined && enemyTeam[teamMemberIndex]) {
          const pokemon = enemyTeam[teamMemberIndex]
          if (pokemon.hpPercent > 0) {
              activeTargets.push({
                  label: pokemon.name,
                  value: JSON.stringify({ side: "opponent", slotIndex: battlefieldSlotIndex }),
                  isAlly: false,
                  side: "opponent",
                  slotIndex: battlefieldSlotIndex
              })
          }
      }
  })
  
  // Sort: Opponents first, then Allies
  activeTargets.sort((a, b) => {
      if (a.isAlly === b.isAlly) return 0
      return a.isAlly === isAlly ? 1 : -1 
  })

  // Cleanup effect: If current target becomes invalid (e.g. KO or switched out), clear it
  useEffect(() => {
    // Only apply cleanup for ATTACKS. Switches have their own target logic (bench members)
    if (action.type === "attack" && action.target) {
        // Special case: Slot targeting means we check if ANY valid target exists for this slot
        const isValid = activeTargets.some(t => 
            t.side === action.target!.side && t.slotIndex === action.target!.slotIndex
        )
        
        if (!isValid) {
            // Only update if it's not already cleared to avoid infinite loops
            onUpdateTarget(undefined)
        }
    }
  }, [JSON.stringify(activeTargets), action.target])

  // --- 2. Available Switch Candidates (Bench only) ---
  const teamArray = isAlly ? myTeam : enemyTeam
  const teamActiveSlots = isAlly ? activeSlots.myTeam : activeSlots.opponentTeam
  
  const benchMembers = teamArray.map((p, idx) => {
      // Is this index currently active?
      if (teamActiveSlots.includes(idx)) return null
      
      return {
          label: p.name,
          value: JSON.stringify({ side: isAlly ? "my" : "opponent", slotIndex: idx }),
          isAlly: isAlly,
          slotIndex: idx,
          pokemon: p
      }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  // Filter out KO'd Pokémon from available switch targets
  const availableBenchMembers = benchMembers.filter(member => member.pokemon.hpPercent > 0)

  const getActorName = () => {
      if (actor) return actor.pokemon.name.toUpperCase()
      // Fallback if we have raw slot info
      if (action.actor) {
          const team = action.actor.side === "my" ? myTeam : enemyTeam
          return team[action.actor.slotIndex]?.name.toUpperCase() || "UNKNOWN"
      }
      return "UNKNOWN"
  }

  const getSortedOptions = () => {
      const opts: { label: string; value: SlotReference; isAlly: boolean }[] = []
      
      // 1. Determine Primary Reference
      let refSide: "my" | "opponent"
      let refSlotIndex: number
      
      if (action.target) {
          refSide = action.target.side
          refSlotIndex = action.target.slotIndex
      } else {
          refSide = action.actor.side
          refSlotIndex = action.actor.slotIndex
      }

      const refTeam = refSide === "my" ? myTeam : enemyTeam
      
      // Look for the reference in our pre-calculated activeTargets which correctly maps slots to current Pokemon
      const refTargetOption = activeTargets.find(t => t.side === refSide && t.slotIndex === refSlotIndex)
      const refPokemon = refTargetOption ? { name: refTargetOption.label } : refTeam[refSlotIndex]

      // A. The Reference
      if (refPokemon) {
          opts.push({
              label: refPokemon.name,
              value: { side: refSide, slotIndex: refSlotIndex },
              isAlly: refSide === "my"
          })
      }

      // B. Partners (Same Side)
      activeTargets
          .filter(t => t.side === refSide && t.value !== (refPokemon ? JSON.stringify({ side: refSide, slotIndex: refSlotIndex }) : ""))
          .forEach(t => {
              opts.push({
                  label: t.label,
                  value: { side: t.side, slotIndex: t.slotIndex },
                  isAlly: t.isAlly
              })
          })

      // C. Opposing Side
      activeTargets
          .filter(t => t.side !== refSide)
          .forEach(t => {
              opts.push({
                  label: t.label,
                  value: { side: t.side, slotIndex: t.slotIndex },
                  isAlly: t.isAlly
              })
          })
      
      return opts
  }

  // Define Styles
  let containerStyle = {}
  let borderColorClass = isAlly ? "border-blue-200" : "border-red-200"
  let containerClass = isAlly 
          ? "border-blue-100 bg-blue-50/30 hover:bg-blue-50/50" 
          : "border-red-100 bg-red-50/30 hover:bg-red-50/50"

  if (isSwitchAfterKo) {
      containerStyle = {
          borderColor: KO_BORDEAUX,
          backgroundColor: KO_BG_COLOR,
      }
      borderColorClass = "" // Remove border color class
      containerClass = "hover:bg-gray-200/50" // Add hover state
  }


  
  const commonElementStyle = isSwitchAfterKo 
    ? { borderColor: KO_BORDEAUX } 
    : { borderColor: isAlly ? "#dbeafe" : "#fee2e2" } // Matches border-blue-100 / border-red-100

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-md border",
        containerClass
      )}
      style={containerStyle}
    >
      {/* Header Area */}
      <div className="flex items-center gap-2 px-2 py-1.5 min-h-[40px]">
        {/* Reordering Strip */}
        <div 
            className={cn(
                "flex flex-col gap-0 bg-background/50 rounded overflow-hidden border group-hover:border-input transition-colors shrink-0",
                !isSwitchAfterKo && borderColorClass
            )}
            style={commonElementStyle}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-3.5 w-5 rounded-none hover:bg-background border-b border-transparent hover:border-input"
            disabled={isSwitchAfterKo ? !canDefuse : !canMoveUp}
            onClick={() => onMove("up")}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          
          {!isSwitchAfterKo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-3.5 w-5 rounded-none hover:bg-background"
                disabled={!canMoveDown}
                onClick={() => onMove("down")}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
          )}
        </div>

        {/* Action Controls Row */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {/* 1. Actor Name */}
          <div className="flex items-center gap-1.5 shrink-0 max-w-[200px]">
              {isSwitchAfterKo && <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />}
              
              <div className={cn(
                "text-[11px] font-extrabold truncate shrink-0 max-w-[120px]",
                isAlly ? "text-blue-700" : "text-red-700"
              )}>
                {getActorName()}
              </div>

              {isSwitchAfterKo && (
                  <span className="text-[10px] uppercase font-bold text-gray-700 opacity-70">
                      is KO
                  </span>
              )}


          </div>

          {/* 2. Action Type */}
          <div className="flex items-center shrink-0">
                  {isSwitchAfterKo ? (
                      // Locked Badge for Forced Switch
                      <div className="flex items-center shrink-0 opacity-80">
                          <div 
                            className="h-6 px-1.5 text-[9px] font-bold bg-background/50 border rounded-l flex items-center justify-center text-muted-foreground border-r-0"
                            style={commonElementStyle}
                          >
                            SWT
                          </div>
                          <div 
                            className="h-6 px-1 flex items-center justify-center bg-background/50 border rounded-r border-l-0 text-muted-foreground"
                            style={commonElementStyle}
                          >
                            <Repeat className="h-3.5 w-3.5" />
                          </div>
                    </div>
                  ) : (
                      // Selectable Type for Normal Action
                      <>
                        <select
                            className={cn(
                                "h-6 text-[9px] font-bold bg-background/50 border rounded-l px-1 focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none text-muted-foreground hover:text-foreground transition-colors border-r-0",
                                borderColorClass
                            )}
                            value={action.type}
                            onChange={(e) => onUpdateType(e.target.value as TurnActionType)}
                        >
                            <option value="attack">ATK</option>
                            <option value="switch">SWT</option>
                            <option value="item">ITM</option>
                        </select>
                        <div className={cn(
                            "h-6 px-1 flex items-center justify-center bg-background/50 border rounded-r border-l-0 text-muted-foreground opacity-60",
                            borderColorClass
                        )}>
                            {typeIcons[action.type]}
                        </div>
                      </>
                  )}
              </div>

              {/* 3. Specific Details (Target/Input) */}
              <div className="shrink-0 flex items-center min-w-0">
                {/* ATTACK TARGETS */}
                {action.type === "attack" && (
                    <select
                      className={cn(
                          "h-6 w-[130px] text-[10px] font-medium bg-background/50 border rounded px-1.5 outline-none focus:ring-1 focus:ring-ring truncate",
                          borderColorClass
                      )}
                      value={action.target ? JSON.stringify(action.target) : ""}
                      onChange={(e) => onUpdateTarget(e.target.value ? JSON.parse(e.target.value) : undefined)}
                    >
                      <option value="">No Target</option>
                      {activeTargets.map(t => (
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
                {(action.type === "switch" || action.type === "switch-after-ko") && (
                    availableBenchMembers.length === 0 && action.type === "switch-after-ko" ? (
                        // No switch available for KO'd Pokémon
                        <div 
                          className={cn(
                              "h-6 w-[130px] text-[10px] font-medium bg-background/50 border rounded px-1.5 flex items-center text-muted-foreground italic",
                              !isSwitchAfterKo && borderColorClass
                          )}
                          style={commonElementStyle}
                        >
                          No switch available
                        </div>
                    ) : (
                        <select
                          className={cn(
                              "h-6 w-[130px] text-[10px] font-medium bg-background/50 border rounded px-1.5 outline-none focus:ring-1 focus:ring-ring truncate",
                              !isSwitchAfterKo && borderColorClass
                          )}
                          style={commonElementStyle}
                          value={action.target ? JSON.stringify(action.target) : ""}
                          onChange={(e) => onUpdateTarget(e.target.value ? JSON.parse(e.target.value) : undefined)}
                        >
                          <option value="">Select...</option>
                          {availableBenchMembers.map(t => (
                              <option 
                                key={t.value} 
                                value={t.value}
                                className={t.isAlly ? "text-blue-600" : "text-red-600"}
                              >
                                {"\u2192 "}{t.label}
                              </option>
                          ))}
                        </select>
                    )
                )}

                {/* ITEM INPUT */}
                {action.type === "item" && (
                    <input 
                      className={cn(
                          "h-6 w-[130px] text-[10px] bg-background/50 border rounded px-2 outline-none focus:ring-1 focus:ring-ring placeholder:italic",
                          borderColorClass
                      )}
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
        <div 
            className="border-t border-dashed px-3 py-2 pb-3 bg-white/40"
            style={commonElementStyle}
        >
           {action.type === "switch" || action.type === "switch-after-ko" ? (
             <SwitchEffects
               action={action}
               activeSlots={activeSlots}
               onAddEntryHpChange={onAddHpChange}
               onUpdateHpChange={onUpdateHpChange}
               onRemoveHpChange={onRemoveHpChange}
               onMoveHpChange={onMoveHpChange}
               myTeam={myTeam}
               enemyTeam={enemyTeam}
             />
           ) : (
             <>
                <EffectsList 
                    title="Effects"
                    deltas={action.deltas}
                    options={getSortedOptions()}
                    onAdd={onAddHpChange}
                    onUpdate={(idx, field, val) => onUpdateHpChange(idx, field, val)}
                    onRemove={onRemoveHpChange}
                    addButtonLabel="Add Effect"
                />
             </>
           )}
        </div>
      )}
    </div>
  )
}
