"use client"

import { CombatSession } from "@/lib/types"
import { useEffect, useState } from "react"

const STORAGE_KEY = "pokemon-lines-explorer-battles"

export function useBattleStorage() {
  const [sessions, setSessions] = useState<CombatSession[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSessions(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Failed to load battles", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to local storage whenever sessions change
  const saveToStorage = (newSessions: CombatSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions))
      setSessions(newSessions)
    } catch (e) {
      console.error("Failed to save battles", e)
    }
  }

  const saveSession = (session: CombatSession) => {
    const existingIndex = sessions.findIndex((s) => s.id === session.id)
    let newSessions: CombatSession[]
    
    if (existingIndex !== -1) {
      newSessions = [...sessions]
      newSessions[existingIndex] = session
    } else {
      newSessions = [...sessions, session]
    }
    
    saveToStorage(newSessions)
  }

  const deleteSession = (id: string) => {
    const newSessions = sessions.filter((s) => s.id !== id)
    saveToStorage(newSessions)
  }

  const createSession = (name: string): CombatSession => {
    const newSession: CombatSession = {
      id: Date.now().toString(),
      name,
      battleType: "simple",
      initialState: {
        myTeam: [],
        enemyTeam: [],
        activeStarters: { myTeam: [0, 1], opponentTeam: [0, 1] },
        battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } },
      },
      nodes: [],
    }
    saveSession(newSession)
    return newSession
  }

  return {
    sessions,
    isLoaded,
    saveSession,
    deleteSession,
    createSession,
  }
}
