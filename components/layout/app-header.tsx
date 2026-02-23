"use client"

interface AppHeaderProps {
  currentView: "teams" | "combat"
  battleType: "simple" | "double"
  hpMode: "percent" | "hp"
  battleStarted: boolean
  onViewChange: (view: "teams" | "combat") => void
  onBattleTypeChange: (type: "simple" | "double") => void
  onHpModeChange: (mode: "percent" | "hp") => void
  onResetBattle: () => void
  navigationDisabled?: boolean
}

export function AppHeader({
  currentView,
  battleType,
  hpMode,
  battleStarted,
  onViewChange,
  onBattleTypeChange,
  onHpModeChange,
  onResetBattle,
  navigationDisabled = false,
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
        {/* Top row: navigation tabs */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex gap-6">
            <button
              onClick={() => !navigationDisabled && onViewChange("teams")}
              disabled={navigationDisabled}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                currentView === "teams"
                  ? "text-foreground border-foreground cursor-pointer"
                  : navigationDisabled
                      ? "text-muted-foreground/50 border-transparent cursor-not-allowed"
                      : "text-muted-foreground border-transparent hover:text-foreground cursor-pointer"
              }`}
            >
              Teams Preview
            </button>
            <button
              onClick={() => !navigationDisabled && onViewChange("combat")}
              disabled={!battleStarted || navigationDisabled}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                currentView === "combat"
                  ? "text-foreground border-foreground cursor-pointer"
                  : (battleStarted && !navigationDisabled)
                    ? "text-muted-foreground border-transparent hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/50 border-transparent cursor-not-allowed"
              }`}
            >
              Battle View
            </button>
          </div>

          {/* Battle mode toggles — right-aligned, same row */}
          <div className="flex items-center gap-4 pb-1">
            {/* Single / Double battle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => onBattleTypeChange("simple")}
                disabled={navigationDisabled}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  battleType === "simple"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } ${navigationDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Single Battle
              </button>
              <button
                onClick={() => onBattleTypeChange("double")}
                disabled={navigationDisabled}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  battleType === "double"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } ${navigationDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                Double Battle
              </button>
            </div>

            {/* Separator */}
            <div className="h-4 w-px bg-border" />

            {/* Work in % / Work in HP */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => onHpModeChange("percent")}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  hpMode === "percent"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Work in %
              </button>
              <button
                onClick={() => onHpModeChange("hp")}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  hpMode === "hp"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Work in HP
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
