"use client"

import { THEME } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils/cn"
import { BattlefieldState, Pokemon, TreeNode } from "@/types/types"
import { CustomTagsManager } from "../shared/custom-tags-manager"
import { PokemonCardDisplay } from "./pokemon-card-display/pokemon-card-display"

interface CurrentStateProps {
  selectedNode: TreeNode
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots?: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  battlefieldState?: BattlefieldState
  battleType?: "simple" | "double"
  hpMode?: "percent" | "hp"
}

export function CurrentState({ 
  selectedNode, 
  myTeam, 
  enemyTeam, 
  activeSlots,
  battlefieldState, 
  battleType = "simple",
  hpMode = "percent" 
}: CurrentStateProps) {
  
  const activeCount = battleType === "double" ? 2 : 1

  const myActive = (activeSlots?.myTeam || [0, 1])
    .slice(0, activeCount)
    .map(idx => (idx !== null && idx !== undefined ? myTeam[idx] : null))

  const enemyActive = (activeSlots?.opponentTeam || [0, 1])
    .slice(0, activeCount)
    .map(idx => (idx !== null && idx !== undefined ? enemyTeam[idx] : null))

  const cleanForBench = (p: Pokemon): Pokemon => ({
    ...p,
    confusion: false, // Volatile removed
    love: false,      // Volatile removed
    confusionCounter: 0,
    // Status (Burn, Para, etc) remains.
  })

  // -- Render Helpers --
  const playerBorderColor = THEME.battlefield.side_border_ally
  const opponentBorderColor = THEME.battlefield.side_border_opponent

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      
      {/* 1. Main Battlefield Container */}
      <div className="border rounded-xl p-2 shadow-sm ring-1 ring-black/5" style={{ borderColor: THEME.battlefield.main_border, backgroundColor: THEME.battlefield.side_bg }}>
        <div className="mb-2">
          <h3 className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: THEME.battlefield.title_text }}>Battlefield</h3>
          {/* Global Field Tags */}
          <CustomTagsManager
            tags={battlefieldState?.customTags || []}
            onUpdateTags={() => {}}
            fontSize={8.5}
            label={null}
            readOnly={true}
          />
        </div>

        {/* 2. Player and Opponent Zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
           {/* Player Side */}
           <div
             className="border rounded-xl p-2 bg-white shadow-sm"
             style={{ borderColor: `${playerBorderColor}40` }} // 25% opacity
           >
             <h4 className="text-[9px] font-bold mb-1 uppercase tracking-tighter" style={{ color: THEME.battlefield.side_label_ally }}>
               Player
             </h4>
             
             {/* Player Side Tags */}
             <div className="mb-2">
                <CustomTagsManager
                    tags={battlefieldState?.playerSide?.customTags || []}
                    onUpdateTags={() => {}}
                    fontSize={8.5}
                    label={null}
                    readOnly={true}
                />
             </div>

             {/* Active Pokemon cards */}
             <div className={cn(
                "grid gap-2 items-start", 
                battleType === "double" ? "grid-cols-2" : "grid-cols-1 justify-items-center"
             )}>
                {myActive.map((pokemon, slotIndex) => (
                    pokemon ? (
                        <PokemonCardDisplay 
                            key={`active-${pokemon.id}`}
                            pokemon={pokemon}
                            mode="deployed"
                            isMyTeam={true}
                            hpMode={hpMode}
                            className={cn(battleType === "simple" && "w-[calc(50%-4px)]")}
                        />
                    ) : (
                        <div key={`empty-my-${slotIndex}`} className={cn(
                            "w-full h-full min-h-[50px] rounded-lg border-2 border-dashed flex items-center justify-center text-[10px] uppercase font-bold",
                            battleType === "simple" && "w-[calc(50%-4px)]"
                        )} style={{ borderColor: THEME.battlefield.main_border, color: THEME.pokemon_card.status.label, backgroundColor: THEME.battlefield.side_bg }}>
                            Empty Slot
                        </div>
                    )
                ))}
             </div>
           </div>

           {/* Opponent Side */}
           <div
             className="border rounded-xl p-2 bg-white shadow-sm"
             style={{ borderColor: `${opponentBorderColor}40` }}
           >
             <h4 className="text-[9px] font-bold mb-1 uppercase tracking-tighter" style={{ color: THEME.battlefield.side_label_opponent }}>
               Opponent
             </h4>

             {/* Opponent Side Tags */}
             <div className="mb-2">
                <CustomTagsManager
                    tags={battlefieldState?.opponentSide?.customTags || []}
                    onUpdateTags={() => {}}
                    fontSize={8.5}
                    label={null}
                    readOnly={true}
                />
             </div>

             {/* Active Enemy Pokemon Cards */}
             <div className={cn(
                "grid gap-2 items-start", 
                battleType === "double" ? "grid-cols-2" : "grid-cols-1 justify-items-center"
             )}>
                {enemyActive.map((pokemon, slotIndex) => (
                    pokemon ? (
                        <PokemonCardDisplay 
                            key={`active-enemy-${pokemon.id}`}
                            pokemon={pokemon}
                            mode="deployed"
                            isMyTeam={false}
                            hpMode={hpMode}
                            className={cn(battleType === "simple" && "w-[calc(50%-4px)]")}
                        />
                    ) : (
                        <div key={`empty-enemy-${slotIndex}`} className={cn(
                            "w-full h-full min-h-[64px] rounded-lg border-2 border-dashed flex items-center justify-center text-[10px] uppercase font-bold",
                            battleType === "simple" && "w-[calc(50%-4px)]"
                        )} style={{ borderColor: THEME.battlefield.main_border, color: THEME.pokemon_card.status.label, backgroundColor: THEME.battlefield.side_bg }}>
                            Empty Slot
                        </div>
                    )
                ))}
             </div>
           </div>
        </div>
      </div>

      {/* 3. Team Lists (The Bench) */}
      <div className="border-t pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
          
          {/* Player Team */}
          <div className="rounded-xl p-2 border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: THEME.common.ally_bg + "33", borderColor: THEME.common.ally_bg + "80" }}>
             <h4 className="text-[8px] font-bold mb-1 uppercase tracking-widest pl-1" style={{ color: THEME.common.ally_text }}>My Team</h4>
             <div className="grid grid-cols-2 gap-2">
                 {myTeam.map((pokemon, idx) => {
                    const isActive = (activeSlots?.myTeam || [0, 1]).slice(0, activeCount).includes(idx)
                    return (
                        <div key={pokemon.id} className={cn("transition-all duration-300", isActive ? "opacity-30 scale-[0.98] grayscale-[0.2]" : "opacity-100")}>
                             <PokemonCardDisplay 
                                pokemon={cleanForBench(pokemon)} 
                                mode="compact"
                                isMyTeam={true}
                                hpMode={hpMode}
                             />
                        </div>
                    )
                 })}
             </div>
          </div>

          {/* Opponent Team */}
          <div className="rounded-xl p-2 border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: THEME.common.opponent_bg + "33", borderColor: THEME.common.opponent_bg + "80" }}>
             <h4 className="text-[8px] font-bold mb-1 uppercase tracking-widest pl-1" style={{ color: THEME.common.opponent_text }}>Opponent Team</h4>
              <div className="grid grid-cols-2 gap-2">
                 {enemyTeam.map((pokemon, idx) => {
                    const isActive = (activeSlots?.opponentTeam || [0, 1]).slice(0, activeCount).includes(idx)
                    return (
                        <div key={pokemon.id} className={cn("transition-all duration-300", isActive ? "opacity-30 scale-[0.98] grayscale-[0.2]" : "opacity-100")}>
                             <PokemonCardDisplay 
                                pokemon={cleanForBench(pokemon)} 
                                mode="compact"
                                isMyTeam={false}
                                hpMode={hpMode}
                             />
                        </div>
                    )
                 })}
             </div>
          </div>

      </div>

    </div>
  )
}
