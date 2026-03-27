"use client"

import { Layers } from "lucide-react"

interface AppHeaderProps {
  currentView: "teams" | "combat"
  battleType: "simple" | "double"
  hpMode: "percent" | "hp" | "rolls"
  battleStarted: boolean
  onViewChange: (view: "teams" | "combat") => void
  onBattleTypeChange: (type: "simple" | "double") => void
  onHpModeChange: (mode: "percent" | "hp" | "rolls") => void
  onResetBattle: () => void
  onOpenSessions: () => void
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
  onOpenSessions,
  navigationDisabled = false,
}: AppHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onOpenSessions}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-semibold text-xs shadow-sm hover:shadow-md active:scale-95"
          title="Gérer les sessions de combat"
        >
          <Layers className="h-4 w-4 text-primary" />
          <span>Sessions</span>
        </button>
        <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Pokemon Lines Explorer</h1>
            <p className="text-base text-slate-500 font-medium italic mt-0.5">Trace your path to victory !</p>
        </div>
        <div className="w-[100px]" /> {/* Spacer to balance the header */}
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
              <button
                onClick={() => onHpModeChange("rolls")}
                title="Le mode Rolls (variance) permet d'entrer les dégâts Min et Max (issus de votre calculateur) pour simuler les ranges de K.O. La répartition des 16 rolls (85% à 100%) est reconstruite pour vous alerter des probabilités de survie. Les calculs asymétriques assurent une approche conservatrice (pire scénario pour vous)."
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  hpMode === "rolls"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Work with Rolls
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
