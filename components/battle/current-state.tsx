"use client"

import { BattlefieldState, Pokemon, TreeNode } from "@/lib/types"
import { cn } from "@/lib/utils/cn"
import { CustomTagsManager } from "../shared/custom-tags-manager"
import { PokemonCardDisplay } from "./pokemon-card-display"

interface CurrentStateProps {
  selectedNode: TreeNode
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  battlefieldState?: BattlefieldState
  battleType?: "simple" | "double"
}

export function CurrentState({ 
  selectedNode, 
  myTeam, 
  enemyTeam, 
  battlefieldState, 
  battleType = "simple" 
}: CurrentStateProps) {
  
  const activeCount = battleType === "double" ? 2 : 1

  const myActive = myTeam.slice(0, activeCount)
  const enemyActive = enemyTeam.slice(0, activeCount)

  const cleanForBench = (p: Pokemon): Pokemon => ({
    ...p,
    confusion: false, // Volatile removed
    love: false,      // Volatile removed
    confusionCounter: 0,
    // Status (Burn, Para, etc) remains.
  })

  // -- Render Helpers --
  const playerBorderColor = "#3B82F6" // blue-500
  const opponentBorderColor = "#EF4444" // red-500

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      
      {/* 1. Main Battlefield Container */}
      <div className="border border-gray-200 rounded-xl p-2 bg-gray-50/30 shadow-sm ring-1 ring-black/5">
        <div className="mb-2">
          <h3 className="text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Battlefield</h3>
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
             <h4 className="text-[9px] font-bold mb-1 uppercase tracking-tighter" style={{ color: playerBorderColor }}>
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

             {/* Active Pokemon Cards */}
             <div className={cn("grid gap-2 items-start", battleType === "double" ? "grid-cols-2" : "grid-cols-1")}>
                {myActive.map((pokemon) => (
                    <PokemonCardDisplay 
                        key={`active-${pokemon.id}`}
                        pokemon={pokemon}
                        mode="deployed"
                        isMyTeam={true}
                    />
                ))}
                {myActive.length === 0 && (
                    <div className="h-16 rounded-lg border border-dashed border-gray-100 flex items-center justify-center text-gray-400 text-[9px] uppercase font-bold bg-gray-50/50">
                        None active
                    </div>
                )}
             </div>
           </div>

           {/* Opponent Side */}
           <div
             className="border rounded-xl p-2 bg-white shadow-sm"
             style={{ borderColor: `${opponentBorderColor}40` }}
           >
             <h4 className="text-[9px] font-bold mb-1 uppercase tracking-tighter" style={{ color: opponentBorderColor }}>
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
             <div className={cn("grid gap-2 items-start", battleType === "double" ? "grid-cols-2" : "grid-cols-1")}>
                {enemyActive.map((pokemon) => (
                    <PokemonCardDisplay 
                        key={`active-enemy-${pokemon.id}`}
                        pokemon={pokemon}
                        mode="deployed"
                        isMyTeam={false}
                    />
                ))}
                {enemyActive.length === 0 && (
                    <div className="h-16 rounded-lg border border-dashed border-gray-100 flex items-center justify-center text-gray-400 text-[9px] uppercase font-bold bg-gray-50/50">
                        None active
                    </div>
                )}
             </div>
           </div>
        </div>
      </div>

      {/* 3. Team Lists (The Bench) */}
      <div className="border-t pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
          
          {/* Player Team */}
          <div className="bg-blue-50/20 rounded-xl p-2 border border-blue-100/50 shadow-sm transition-all hover:shadow-md">
             <h4 className="text-[8px] font-bold text-blue-800 mb-1 uppercase tracking-widest pl-1">My Team</h4>
             <div className="grid grid-cols-2 gap-2">
                 {myTeam.map((pokemon, idx) => {
                    const isActive = idx < activeCount
                    return (
                        <div key={pokemon.id} className={cn("transition-all duration-300", isActive ? "opacity-30 scale-[0.98] grayscale-[0.2]" : "opacity-100")}>
                             <PokemonCardDisplay 
                                pokemon={cleanForBench(pokemon)} 
                                mode="compact"
                                isMyTeam={true}
                             />
                        </div>
                    )
                 })}
             </div>
          </div>

          {/* Opponent Team */}
          <div className="bg-red-50/20 rounded-xl p-2 border border-red-100/50 shadow-sm transition-all hover:shadow-md">
             <h4 className="text-[8px] font-bold text-red-800 mb-1 uppercase tracking-widest pl-1">Opponent Team</h4>
              <div className="grid grid-cols-2 gap-2">
                 {enemyTeam.map((pokemon, idx) => {
                    const isActive = idx < activeCount
                    return (
                        <div key={pokemon.id} className={cn("transition-all duration-300", isActive ? "opacity-30 scale-[0.98] grayscale-[0.2]" : "opacity-100")}>
                             <PokemonCardDisplay 
                                pokemon={cleanForBench(pokemon)} 
                                mode="compact"
                                isMyTeam={false}
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
