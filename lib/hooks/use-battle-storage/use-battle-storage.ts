"use client"

import { CombatSession } from "@/types/types"
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
        const parsed = JSON.parse(stored)
        // CRITICAL GUARD: Ensure that the stored data is actually an array!
        // If the user's storage was corrupted (e.g. saved as an object or null), this prevents fatal crashes
        if (Array.isArray(parsed)) {
          setSessions(parsed)
        } else {
          console.warn("Corrupted battle storage detected (not an array). Resetting.")
          setSessions([])
        }
      }
    } catch (e) {
      console.error("Failed to load battles", e)
      setSessions([]) // Fallback to empty array on fatal parse error
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save to local storage whenever sessions change
  const saveToStorage = (newSessions: CombatSession[]) => {
    // ALWAYS set React state first to prevent infinite loops if localStorage throws!
    setSessions(newSessions)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions))
    } catch (e) {
      console.error("Failed to save battles to device storage (possibly full)", e)
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

  const updateSessionName = (id: string, name: string) => {
    const newSessions = sessions.map((s) => 
      s.id === id ? { ...s, name } : s
    )
    saveToStorage(newSessions)
  }

  const updateSessionsOrder = (newSessions: CombatSession[]) => {
    saveToStorage(newSessions)
  }

  const duplicateSession = (id: string) => {
    const session = sessions.find((s) => s.id === id)
    if (!session) return null
    
    // Deep clone the entire session
    const duplicated: CombatSession = JSON.parse(JSON.stringify(session))
    duplicated.id = Date.now().toString()
    duplicated.name = `${session.name} (Copy)`
    
    // Insert new session after the original one
    const originalIndex = sessions.findIndex((s) => s.id === id)
    const newSessions = [...sessions]
    newSessions.splice(originalIndex + 1, 0, duplicated)
    
    saveToStorage(newSessions)
    return duplicated
  }

  const createSession = (name: string): CombatSession => {
    const newSession: CombatSession = {
      id: Date.now().toString(),
      name,
      battleType: "simple",
      initialState: {
        myTeam: [],
        enemyTeam: [],
        activeSlots: { myTeam: [0], opponentTeam: [0] },
        battlefieldState: { customTags: [], playerSide: { customTags: [] }, opponentSide: { customTags: [] } },
      },
      nodes: [{
        id: "root",
        description: "État Initial",
        probability: 100,
        cumulativeProbability: 100,
        turnData: { actions: [], endOfTurnEffects: [] },
        children: [],
        parentId: undefined,
        createdAt: Date.now(),
        turn: 0,
        branchIndex: 0,
        x: 32,
        y: 32
      }],
      lastSelectedNodeId: "root"
    }
    const newSessions = [...sessions, newSession]
    saveToStorage(newSessions)
    return newSession
  }

  return {
    sessions,
    isLoaded,
    saveSession,
    deleteSession,
    updateSessionName,
    updateSessionsOrder,
    duplicateSession,
    createSession,
  }
}
