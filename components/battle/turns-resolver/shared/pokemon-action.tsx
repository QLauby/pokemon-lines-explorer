"use client"

import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Package, Repeat, Swords } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { THEME } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils"
import { PokemonType } from "@/lib/utils/colors-utils"
import { BattleState, Effect, Pokemon, SlotReference, TurnAction, TurnActionType } from "@/types/types"

import { Counter } from "@/components/shared/counter"
import { TypeLiseret } from "@/components/shared/type-liseret"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EffectsList } from "../battle-effects/effects-list"

interface PokemonActionProps {
  action: TurnAction
  index: number
  totalActions: number
  actor: { pokemon: Pokemon; isAlly: boolean, teamIndex?: number } | undefined
  onMove: (direction: "up" | "down") => void
  onToggleCollapse: () => void
  onUpdateType: (type: TurnActionType) => void
  onUpdateTarget: (target: SlotReference | undefined) => void
  onUpdateMetadata: (metadata: { itemName?: string; attackName?: string }) => void
  onUpdateAttack: (attackName: string, moveName?: string) => void
  onUpdatePpAmount: (amount: number) => void
  
  // New Effect Handlers
  onAddEffect: () => void
  onUpdateEffect: (index: number, newEffect: Effect) => void
  onRemoveEffect: (index: number) => void
  
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  effectOptions: { label: string; value: SlotReference; isAlly: boolean }[] // Passed from parent
  
  // Optional props for Forced Switch mode
  onDelete?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  canDefuse?: boolean
  hpMode?: "percent" | "hp" | "rolls"
  readOnly?: boolean
  baseState?: BattleState
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
  onUpdateAttack,
  onUpdatePpAmount,
  
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  
  myTeam,
  enemyTeam,
  activeSlots,
  effectOptions,
  
  onDelete,
  canMoveUp = true,
  canMoveDown = true,
  canDefuse = false,
  hpMode = "percent",
  readOnly = false,
  baseState,
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
  const activeTargets: { label: string; value: string; isAlly: boolean; side: "my" | "opponent"; slotIndex: number; types: PokemonType[] }[] = []

  // Add My Active Pokemon
  activeSlots.myTeam.forEach((teamMemberIndex, battlefieldSlotIndex) => {
      if (teamMemberIndex !== null && teamMemberIndex !== undefined && myTeam[teamMemberIndex]) {
          const pokemon = myTeam[teamMemberIndex]
          if (pokemon.hpPercent > 0) {
              activeTargets.push({
                  label: pokemon.name,
                  value: JSON.stringify({ type: "battlefield_slot", side: "my", slotIndex: battlefieldSlotIndex }),
                  isAlly: true,
                  side: "my",
                  slotIndex: battlefieldSlotIndex,
                  types: pokemon.types
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
                  value: JSON.stringify({ type: "battlefield_slot", side: "opponent", slotIndex: battlefieldSlotIndex }),
                  isAlly: false,
                  side: "opponent",
                  slotIndex: battlefieldSlotIndex,
                  types: pokemon.types
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
          value: JSON.stringify({ type: "team_index", side: isAlly ? "my" : "opponent", teamIndex: idx, slotIndex: idx }),
          isAlly: isAlly,
          slotIndex: idx,
          pokemon: p,
          types: p.types
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
  
  // Define Styles (Premium Bordered logic)
  let containerStyle: React.CSSProperties = {
      backgroundColor: THEME.battlefield.main_bg,
      borderColor: isAlly ? THEME.common.ally : THEME.common.opponent,
      borderWidth: '1px',
      "--action-border-strong": isAlly ? THEME.common.ally : THEME.common.opponent,
      boxShadow: `0 4px 12px -2px ${isAlly ? THEME.common.ally : THEME.common.opponent}25`,
  } as React.CSSProperties
  
  let borderColorClass = "border-[var(--action-border-strong)]/40"
  let containerClass = "hover:shadow-md transition-all duration-200"

  if (isSwitchAfterKo) {
      containerStyle = {
          ...containerStyle,
          borderColor: THEME.ko.bordeaux,
          backgroundColor: THEME.ko.bg,
          boxShadow: `0 4px 12px -2px ${THEME.ko.bordeaux}25`,
          "--action-border-strong": THEME.ko.bordeaux,
      } as React.CSSProperties
      borderColorClass = "border-[var(--action-border-strong)]/40" 
      containerClass = "hover:brightness-95" 
  }

  const commonElementStyle = {
      borderColor: isSwitchAfterKo ? THEME.ko.bordeaux : (isAlly ? THEME.common.ally_bg + "80" : THEME.common.opponent_bg + "80")
  }

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
                "flex flex-col gap-0 bg-background/80 rounded overflow-hidden border transition-colors shrink-0",
                borderColorClass
            )}
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
              {isSwitchAfterKo && <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: THEME.ko.bordeaux }} />}
              
              {actor && <TypeLiseret types={actor.pokemon.types} className="w-1 h-3 rounded-full mr-0.5" />}

              <div className={cn(
                "text-[11px] font-extrabold truncate shrink-0 max-w-[65px]",
              )} 
              style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}
              title={actor?.pokemon.name}
              >
                {getActorName()}
              </div>

              {isSwitchAfterKo && (
                  <span className="text-[10px] uppercase font-bold opacity-70" style={{ color: THEME.pokemon_card.status.label }}>
                      is KO
                  </span>
              )}


          </div>

          {/* 2. Action Type */}
          <div className="flex items-center shrink-0">
                  {isSwitchAfterKo ? (
                      // Locked Badge for Forced Switch
                      <div className="flex items-center shrink-0">
                          <div 
                            className="h-6 px-1.5 text-[9px] font-black bg-background/80 border rounded-l flex items-center justify-center text-muted-foreground border-r-0"
                            style={{ borderColor: THEME.ko.bordeaux + "60" }}
                          >
                            SWT
                          </div>
                          <div 
                            className="h-6 px-1 flex items-center justify-center bg-background border rounded-r border-l-0"
                            style={{ borderColor: THEME.ko.bordeaux + "60" }}
                          >
                            <Repeat className="h-4 w-4" style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }} />
                          </div>
                    </div>
                  ) : (
                      // Selectable Type for Normal Action
                      <>
                        <select
                            className={cn(
                                "h-6 text-[9px] font-black bg-background/80 border rounded-l px-1 focus:ring-1 outline-none cursor-pointer appearance-none text-muted-foreground hover:text-foreground transition-colors border-r-0",
                                "focus:ring-[var(--action-border-strong)]",
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
                            "h-6 px-1 flex items-center justify-center bg-background border rounded-r border-l-0 transition-colors",
                            borderColorClass
                        )}>
                            <div className="flex items-center justify-center" style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}>
                                {typeIcons[action.type]}
                            </div>
                        </div>
                      </>
                  )}
              </div>

                {/* 3. Specific Details (Target/Input) */}
                <div className="shrink-0 flex items-center min-w-0">
                  {/* ATTACK TARGETS */}
                  {action.type === "attack" && (
                    <>
                      <Select
                        value={action.target ? JSON.stringify(action.target) : "none"}
                        onValueChange={(val: string) => onUpdateTarget(val === "none" ? undefined : JSON.parse(val))}
                      >
                        <SelectTrigger 
                            className={cn(
                                "h-6 w-[100px] text-[10px] font-bold bg-background/80 px-1.5 transition-colors overflow-hidden min-w-0 shadow-none",
                                "focus:ring-1 focus:ring-[var(--action-border-strong)]",
                                borderColorClass
                            )}
                            title={(() => {
                                const selected = activeTargets.find(t => JSON.stringify(action.target) === t.value)
                                return selected?.label || "No Target"
                            })()}
                            style={{ 
                                color: (() => {
                                    const selected = activeTargets.find(t => JSON.stringify(action.target) === t.value)
                                    return selected ? (selected.isAlly ? THEME.common.ally_text : THEME.common.opponent_text) : THEME.common.neutral
                                })()
                            }}
                        >
                          <SelectValue placeholder="Target Pokémon..." className="truncate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-[10px]">Target Pokémon...</SelectItem>
                          {activeTargets.map(t => (
                            <SelectItem key={t.value} value={t.value} className="text-[10px]">
                                <div className="flex items-center gap-2">
                                    <TypeLiseret types={t.types} className="w-1 h-3 rounded-full" />
                                    <span style={{ color: t.isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}>
                                        {t.label}
                                    </span>
                                </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-muted-foreground px-0.5 leading-[24px]">with</span>
                    </>
                  )}
  
                  {/* ATTACK NAME INPUT / DROPDOWN */}
                  {action.type === "attack" && actor && (
                     (() => {
                           const moves = actor.pokemon.attacks || []
                           const availableMoves = moves.filter(m => m.currentPP > 0)
                           const hasMoves = availableMoves.length > 0
                           
                           if (hasMoves) {
                               return (
                                   <div className="flex items-center gap-1 ml-1 shrink-0">
                                       <Select
                                         value={action.metadata?.attackName || "none"}
                                         onValueChange={(val: string) => {
                                             if (val === "none") {
                                                 onUpdateAttack("", "")
                                                 return
                                             }
                                             const move = availableMoves.find(m => m.name === val)
                                             if (move) onUpdateAttack(move.name, move.name)
                                         }}
                                       >
                                         <SelectTrigger 
                                            className={cn(
                                                "h-6 w-[100px] text-[10px] font-bold bg-background/80 px-1.5 transition-colors overflow-hidden min-w-0 shadow-none",
                                                "focus:ring-1 focus:ring-[var(--action-border-strong)]",
                                                borderColorClass
                                            )}
                                            style={{ color: action.metadata?.attackName ? (isAlly ? THEME.common.ally_text : THEME.common.opponent_text) : THEME.common.neutral }}
                                            title={action.metadata?.attackName || "Move name..."}
                                         >
                                            <SelectValue placeholder="Move name..." className="truncate" />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="none" className="text-[10px]">Move name...</SelectItem>
                                           {availableMoves.map(m => (
                                               <SelectItem key={m.name} value={m.name} className="text-[10px]">
                                                   <div className="flex items-center gap-2">
                                                       <TypeLiseret types={m.type ? [m.type] : []} className="w-1 h-3 rounded-full" />
                                                       <span style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}>
                                                            {m.name}
                                                       </span>
                                                   </div>
                                               </SelectItem>
                                           ))}
                                         </SelectContent>
                                       </Select>
  
                                       {action.metadata?.attackName && (
                                           (() => {
                                               const selectedMoveObj = availableMoves.find(m => m.name === action.metadata?.attackName)
                                               return (
                                                  <div className="flex items-center gap-1 bg-background/80 px-1 rounded-sm border border-dashed border-muted-foreground/20" title={`Consommer x PP (Max : ${selectedMoveObj?.currentPP || ' ?'})`}>
                                                      <span className="text-[10px] font-bold text-muted-foreground opacity-70">-</span>
                                                      <Counter
                                                          value={(action.metadata?.ppAmount || 1).toString()}
                                                          onChange={(val) => onUpdatePpAmount(Math.max(1, parseInt(val) || 1))}
                                                          min={1}
                                                          max={selectedMoveObj?.currentPP}
                                                          fontSize={10}
                                                          width={24}
                                                          className="h-5"
                                                          visualMode="default"
                                                           mainColor={isAlly ? THEME.common.ally : THEME.common.opponent}
                                                      />
                                                      <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">PP</span>
                                                  </div>
                                               )
                                           })()
                                       )}
                                   </div>
                               )
                           } else {
                             return (
                                 <div className="flex items-center gap-1 ml-1 shrink-0">
                                     <input 
                                        className={cn(
                                            "h-6 w-[100px] text-[10px] bg-background/80 border rounded px-2 outline-none focus:ring-1 transition-colors",
                                            "focus:ring-[var(--action-border-strong)] placeholder:italic",
                                            borderColorClass
                                        )}
                                        style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}
                                        placeholder="Move name..."
                                        value={action.metadata?.attackName || ""}
                                        onChange={(e) => onUpdateAttack(e.target.value)}
                                      />
                                 </div>
                             )
                           }
                     })()
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
                          <Select
                            value={action.target ? JSON.stringify(action.target) : "none"}
                            onValueChange={(val: string) => onUpdateTarget(val === "none" ? undefined : JSON.parse(val))}
                          >
                            <SelectTrigger 
                              className={cn(
                                "h-6 w-[110px] text-[10px] font-bold bg-background/80 px-1.5 transition-colors overflow-hidden min-w-0 shadow-none",
                                "focus:ring-1 focus:ring-[var(--action-border-strong)]",
                                borderColorClass
                              )} 
                              title={(() => {
                                  const selected = availableBenchMembers.find(t => JSON.stringify(action.target) === t.value)
                                  return selected?.label || "Select..."
                              })()}
                              style={{ 
                                ...commonElementStyle,
                                color: (() => {
                                    const selected = availableBenchMembers.find(t => JSON.stringify(action.target) === t.value)
                                    return selected ? (selected.isAlly ? THEME.common.ally_text : THEME.common.opponent_text) : THEME.common.neutral
                                })()
                             }}
                            >
                                <SelectValue placeholder="Select..." className="truncate" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-[10px]">Select...</SelectItem>
                              {availableBenchMembers.map(t => (
                                <SelectItem key={t.value} value={t.value} className="text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <TypeLiseret types={t.types} className="w-1 h-3 rounded-full" />
                                        <span style={{ color: t.isAlly ? THEME.common.ally_text : THEME.common.opponent_text }}>
                                            {"\u2192 "}{t.label}
                                        </span>
                                    </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      )
                  )}
  
                  {/* ITEM INPUT */}
                  {action.type === "item" && (
                      <input 
                        className={cn(
                            "h-6 w-[130px] text-[10px] bg-background/50 border rounded px-2 outline-none focus:ring-1 transition-colors",
                            "focus:ring-[var(--action-border-strong)] placeholder:italic",
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
            className="h-7 w-7 shrink-0 transition-all"
            onClick={onToggleCollapse}
        >
            {action.isCollapsed ? (
            <ChevronRight className="h-4 w-4" style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }} />
            ) : (
            <ChevronDown className="h-4 w-4" style={{ color: isAlly ? THEME.common.ally_text : THEME.common.opponent_text }} />
            )}
        </Button>
      </div>

      {/* Expanded Content */}
      {!action.isCollapsed && (
        <div 
            className="border-t border-dashed px-3 py-2 pb-3 bg-white/40"
            style={commonElementStyle}
        >
           {/* Entry effects for switches, regular effects for attacks */}
           {action.type === "switch" || action.type === "switch-after-ko" ? (
               <EffectsList 
                   title="Entry Effects"
                   effects={action.effects}
                   action={action}
                   actor={actor}
                   options={effectOptions}
                   onAdd={onAddEffect}
                   onUpdate={onUpdateEffect}
                   onRemove={onRemoveEffect}
                   baseState={baseState || ({ 
                       activeSlots, 
                       myTeam, 
                       enemyTeam,
                       battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } }
                   } as unknown as BattleState)}
                   hpMode={hpMode}
               />
           ) : (
             <>
                <EffectsList 
                     title="Effects"
                     effects={action.effects}
                     action={action}
                     actor={actor}
                     options={effectOptions}
                     onAdd={onAddEffect}
                     onUpdate={onUpdateEffect}
                     onRemove={onRemoveEffect}
                     baseState={baseState || ({ 
                         activeSlots, 
                         myTeam, 
                         enemyTeam,
                         battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } }
                     } as unknown as BattleState)}
                     hpMode={hpMode}
                 />
             </>
           )}
        </div>
      )}
    </div>
  )
}
