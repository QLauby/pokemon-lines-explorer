import { cn } from "@/lib/utils"

interface BattleEndMessageProps {
  winner: 'player' | 'opponent'
}

export function BattleEndMessage({ winner }: BattleEndMessageProps) {
  const isVictory = winner === 'player'
  
  return (
    <div className={cn(
      "border rounded-lg p-12 text-center shadow-lg transition-all duration-300",
      isVictory 
        ? "bg-[var(--color-ally-bg)] border-[var(--color-ally)]" 
        : "bg-[var(--color-opp-bg)] border-[var(--color-opp)]"
    )}>
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-6xl mb-4">
          {isVictory ? "🎉" : "💔"}
        </div>
        
        <h2 className={cn(
          "text-4xl font-bold mb-2 uppercase tracking-tight",
          isVictory ? "text-[var(--color-ally-text)]" : "text-[var(--color-opp-text)]"
        )}>
          {isVictory ? "You won the battle !" : "Unfortunately you lost the battle."}
        </h2>
        
        <p className="text-lg font-medium opacity-80">
          {isVictory 
            ? "All opponent Pokémon have been defeated !" 
            : "All your Pokémon have been defeated !"}
        </p>
      </div>
    </div>
  )
}
