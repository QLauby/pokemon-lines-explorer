import { BattleState } from "@/types/types"
import { useEffect, useMemo, useState } from "react"
import { useBattleStorage } from "../use-battle-storage"
import { BattleEngine } from "../../../logic/battle-engine"

export function useBattleSession() {
  const { 
    sessions, 
    isLoaded, 
    saveSession, 
    createSession,
    deleteSession: deleteSessionFromStorage,
    updateSessionsOrder,
    duplicateSession,
    updateSessionName
  } = useBattleStorage()
  
  // UI State
  const [currentView, setCurrentView] = useState<"teams" | "combat">("teams")
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Initialize or Select Default Session
  useEffect(() => {
    if (isLoaded) {
      if (sessions.length === 0) {
        const session = createSession("Fight 1")
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
      if(currentSession) {
          const normalized = BattleEngine.normalizeActiveSlots(currentSession.initialState, type)
          saveSession({ ...currentSession, battleType: type, initialState: normalized })
      }
  }

  const setHpMode = (mode: "percent" | "hp" | "rolls") => {
      if(currentSession) saveSession({ ...currentSession, hpMode: mode })
  }

  const updateInitialState = (updates: Partial<BattleState>) => {
    if (!currentSession) return
    const mergedState = { ...currentSession.initialState, ...updates }
    const normalized = BattleEngine.normalizeActiveSlots(mergedState, currentSession.battleType)
    
    const newSession = {
      ...currentSession,
      initialState: normalized
    }
    saveSession(newSession)
  }

  return {
    isLoaded,
    currentSession,
    currentSessionId,
    setCurrentSessionId: (id: string | null) => {
      setCurrentSessionId(id)
      setCurrentView("teams")
    },
    currentView,
    setCurrentView,
    sessions,
    saveSession,
    deleteSession: (id: string) => {
      if (id === currentSessionId) {
        const remaining = sessions.filter(s => s.id !== id);
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
          setCurrentView("teams")
        }
      }
      return deleteSessionFromStorage(id);
    },
    updateSessionsOrder,
    duplicateSession,
    updateSessionName,
    createSession,
    setBattleType,
    setHpMode,
    updateInitialState
  }
}
