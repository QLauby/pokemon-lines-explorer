"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { detectCorruption } from "../../logic/corruption"
import { CombatSession } from "../../types"

interface CorruptionContextType {
  originalSession: CombatSession
  pendingSession: CombatSession
  setPendingSession: React.Dispatch<React.SetStateAction<CombatSession>>
  updatePendingParams: (params: Partial<CombatSession>) => void
  corruptedNodeIds: string[]
  isCorrupted: boolean
  reset: () => void
}

const CorruptionContext = createContext<CorruptionContextType | null>(null)

export function useCorruptionHandler() {
  const context = useContext(CorruptionContext)
  if (!context) {
    throw new Error("useCorruptionHandler must be used within a CorruptionProvider")
  }
  return context
}

interface CorruptionProviderProps {
  session: CombatSession
  children: React.ReactNode
}

export function CorruptionProvider({ session, children }: CorruptionProviderProps) {
  const [pendingSession, setPendingSession] = useState<CombatSession>(session)

  const corruptedNodeIds = useMemo(() => {
    return detectCorruption(session, pendingSession)
  }, [session, pendingSession])

  const isCorrupted = corruptedNodeIds.length > 0

  // Sync pendingSession when the session changes (e.g. loaded from disk or changed externally)
  useEffect(() => {
    if (!isCorrupted) {
       setPendingSession(session)
    }
  }, [session, isCorrupted])

  const updatePendingParams = useCallback((params: Partial<CombatSession>) => {
    setPendingSession((prev) => ({ ...prev, ...params }))
  }, [])

  const reset = useCallback(() => {
    setPendingSession(session)
  }, [session])

  return (
    <CorruptionContext.Provider
      value={{
        originalSession: session,
        pendingSession,
        setPendingSession,
        updatePendingParams,
        corruptedNodeIds,
        isCorrupted,
        reset,
      }}
    >
      {children}
    </CorruptionContext.Provider>
  )
}
