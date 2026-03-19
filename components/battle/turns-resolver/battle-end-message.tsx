import { cn } from "@/lib/utils"

interface BattleEndMessageProps {
  winner: 'player' | 'opponent'
}

export function BattleEndMessage({ winner }: BattleEndMessageProps) {
  const isVictory = winner === 'player'
  
  return (
    <div className={cn(
      "border rounded-lg p-12 text-center shadow-lg",
      isVictory 
        ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300" 
        : "bg-gradient-to-br from-red-50 to-rose-50 border-red-300"
    )}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-6xl mb-4">
          {isVictory ? "🎉" : "💔"}
        </div>
        
        <h2 className={cn(
          "text-4xl font-bold mb-2",
          isVictory ? "text-green-700" : "text-red-700"
        )}>
          {isVictory ? "You won the battle !" : "Unfortunately you lost the battle."}
        </h2>
        
        <p className="text-lg text-muted-foreground">
          {isVictory 
            ? "All opponent Pokémon have been defeated !" 
            : "All your Pokémon have been defeated !"}
        </p>
      </div>
    </div>
  )
}
