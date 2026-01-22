"use client"

interface AppHeaderProps {
  currentView: "teams" | "combat"
  battleType: "simple" | "double"
  battleStarted: boolean
  onViewChange: (view: "teams" | "combat") => void
  onBattleTypeChange: (type: "simple" | "double") => void
  onResetBattle: () => void
}

export function AppHeader({
  currentView,
  battleType,
  battleStarted,
  onViewChange,
  onBattleTypeChange,
  onResetBattle,
}: AppHeaderProps) {
  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Pokémon Lines Explorer</h1>
        <p className="text-muted-foreground">
          {currentView === "teams" ? "Définissez vos équipes de Pokémon" : "Tracez votre chemin vers la victoire !"}
        </p>
      </div>

      <div className="border-b border-border mb-6">
        <div className="flex gap-6 pb-1">
          <button
            onClick={() => onViewChange("teams")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors cursor-pointer ${
              currentView === "teams"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            Teams Preview
          </button>
          <button
            onClick={() => onViewChange("combat")}
            disabled={!battleStarted}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              currentView === "combat"
                ? "text-foreground border-foreground cursor-pointer"
                : battleStarted
                  ? "text-muted-foreground border-transparent hover:text-foreground cursor-pointer"
                  : "text-muted-foreground/50 border-transparent cursor-not-allowed"
            }`}
          >
            Battle View
          </button>
        </div>
      </div>
    </>
  )
}
