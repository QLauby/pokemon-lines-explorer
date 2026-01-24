import { BattleState } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import { useBattleStorage } from "../use-battle-storage"

export function useBattleSession() {
  const { sessions, isLoaded, saveSession, createSession } = useBattleStorage()
  
  // UI State
  const [currentView, setCurrentView] = useState<"teams" | "combat">("teams")
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Initialize or Select Default Session
  useEffect(() => {
    if (isLoaded) {
      if (sessions.length === 0) {
        const session = createSession("Combat 1")
        setCurrentSessionId(session.id)
      } else if (!currentSessionId) {
        // Default to the first one or most recent
        setCurrentSessionId(sessions[0].id)
      }
    }
  }, [isLoaded, sessions, currentSessionId, createSession])

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId), 
    [sessions, currentSessionId]
  )

  const setBattleType = (type: "simple" | "double") => {
      if(currentSession) saveSession({ ...currentSession, battleType: type })
  }

  const updateInitialState = (updates: Partial<BattleState>) => {
    if (!currentSession) return
    const newSession = {
      ...currentSession,
      initialState: { ...currentSession.initialState, ...updates }
    }
    saveSession(newSession)
  }

  return {
    isLoaded,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    currentView,
    setCurrentView,
    sessions,
    saveSession,
    createSession,
    setBattleType,
    updateInitialState
  }
}
