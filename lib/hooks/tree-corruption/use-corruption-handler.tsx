"use client"

import { CombatSession, Pokemon, TreeNode } from "@/types/types"
import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { detectCorruption } from "../../logic/corruption"
import { ModificationType, pruneTree, sanitizeTreeForModification } from "../../logic/tree-cleaner"

// Define the shape of a pending modification
export type ModificationRequest = 
  | { type: ModificationType, payload: any }
  | null

interface CorruptionContextType {
  originalSession: CombatSession
  pendingModification: ModificationRequest
  setPendingModification: (mod: ModificationRequest) => void
  
  // Actions
  requestModification: (type: ModificationType, payload: any) => boolean // Returns true if corruption detected (pending)
  confirmModification: (mode: 'prune' | 'reset') => void
  cancelModification: () => void
  
  // State
  corruptedNodeIds: string[]
  isCorrupted: boolean
  corruptionMessage: string | null
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
  onUpdateSession: (updates: Partial<CombatSession>) => void
  children: React.ReactNode
}

export function CorruptionProvider({ session, onUpdateSession, children }: CorruptionProviderProps) {
  const [pendingModification, setPendingModification] = useState<ModificationRequest>(null)

  // 1. Detect Corruption based on pending modification
  const corruptedNodeIds = useMemo(() => {
    if (!pendingModification) return []
    const roots = detectCorruption(session, pendingModification)
    
    // Expand to all descendants for UI highlighting
    const allIds = new Set<string>()
    const traverse = (id: string) => {
        if (allIds.has(id)) return
        allIds.add(id)
        const node = session.nodes.find(n => n.id === id)
        node?.children.forEach(traverse)
    }
    roots.forEach(traverse)
    return Array.from(allIds)
  }, [session, pendingModification])

  const isCorrupted = corruptedNodeIds.length > 0

  // 2. Entry point: Request a modification
  const requestModification = useCallback((type: ModificationType, payload: any): boolean => {
      const testIds = detectCorruption(session, { type, payload } as any)
      
      if (testIds.length === 0) {
          // SAFE: Apply immediately
          applyModification(type, payload, session.nodes)
          return false
      } else {
          // CORRUPTED: Set pending to trigger UI
          setPendingModification({ type, payload } as any)
          return true
      }
  }, [session])

  // 3. Apply Logic (Clean -> Correct -> Apply)
  const applyModification = (type: string, payload: any, currentNodes: TreeNode[]) => {
      let finalNodes = currentNodes
      
      // a. Pruning: already done via currentNodes
      // b. Sanitize
      const enrichedPayload = type === 'CHANGE_HP_MODE'
          ? { ...payload, initialState: session.initialState }
          : payload

      finalNodes = sanitizeTreeForModification(finalNodes, type as ModificationType, enrichedPayload)

      // c. Apply
      if (type === 'CHANGE_HP_MODE') {
          const { newHpMode } = payload as { newHpMode: "percent" | "hp" }

          if (newHpMode === 'hp') {
              // % → HP: sanitizeTree was a no-op on the tree.
              const normalizeTeam = (team: Pokemon[]): Pokemon[] =>
                  team.map(p => ({
                      ...p,
                      hpMax:     p.hpMax     ?? 100,
                      hpCurrent: p.hpCurrent ?? (p.hpMax ?? 100),
                  }))

              onUpdateSession({
                  hpMode: newHpMode,
                  nodes:  finalNodes,
                  initialState: {
                      ...session.initialState,
                      myTeam:    normalizeTeam(session.initialState.myTeam),
                      enemyTeam: normalizeTeam(session.initialState.enemyTeam),
                  },
              })
          } else {
              // HP → %: sanitizeTree converted deltas using the existing hpMax values.
              // No initialState change needed.
              onUpdateSession({
                  hpMode: newHpMode,
                  nodes:  finalNodes,
              })
          }
      } else if (type === 'CHANGE_DEPLOYMENT') {
          const { newActiveSlots, newBattleType } = payload as { 
              newActiveSlots: { myTeam: number[], opponentTeam: number[] },
              newBattleType?: "simple" | "double"
          }

          onUpdateSession({
              initialState: {
                  ...session.initialState,
                  activeSlots: newActiveSlots
              },
              battleType: newBattleType || session.battleType,
              nodes: finalNodes
          })
      } else if (type === 'DELETE_POKEMON') {
          const { id, isMyTeam } = payload
          const teamSide = isMyTeam ? 'myTeam' : 'enemyTeam'
          const teamKey = isMyTeam ? 'myTeam' : 'opponentTeam'
          
          const currentTeam = (session.initialState as any)[teamSide] as Pokemon[]
          const originalIndex = currentTeam.findIndex((p: Pokemon) => p.id === id)
          const newTeam = currentTeam.filter((p: Pokemon) => p.id !== id)

          // Update activeSlots (shift indices and clear deleted)
          const newActiveSlots = { ...session.initialState.activeSlots }
          const targetSlots = [...newActiveSlots[teamKey]]
          for (let i = 0; i < targetSlots.length; i++) {
              if (targetSlots[i] === originalIndex) {
                  targetSlots[i] = null
              } else if (targetSlots[i] !== null && (targetSlots[i] as number) > originalIndex) {
                  targetSlots[i] = (targetSlots[i] as number) - 1
              }
          }
          newActiveSlots[teamKey] = targetSlots

          onUpdateSession({ 
              initialState: { 
                  ...session.initialState, 
                  [teamSide]: newTeam,
                  activeSlots: newActiveSlots
              },
              nodes: finalNodes
          })
      } else if (type === 'REORDER_POKEMON') {
          const { isMyTeam, oldIndex, newIndex } = payload as { isMyTeam: boolean, oldIndex: number, newIndex: number }
          const teamSide = isMyTeam ? 'myTeam' : 'enemyTeam'
          const teamKey = isMyTeam ? 'myTeam' : 'opponentTeam'
          
          const currentState = session.initialState as any
          const newTeam = [...currentState[teamSide]]
          const temp = newTeam[oldIndex]
          newTeam[oldIndex] = newTeam[newIndex]
          newTeam[newIndex] = temp

          // Update activeSlots (swap indices)
          const newActiveSlots = { ...session.initialState.activeSlots }
          const targetSlots = [...newActiveSlots[teamKey]]
          for (let i = 0; i < targetSlots.length; i++) {
              if (targetSlots[i] === oldIndex) targetSlots[i] = newIndex
              else if (targetSlots[i] === newIndex) targetSlots[i] = oldIndex
          }
          newActiveSlots[teamKey] = targetSlots

          onUpdateSession({
              initialState: { 
                  ...session.initialState, 
                  [teamSide]: newTeam,
                  activeSlots: newActiveSlots
              },
              nodes: finalNodes
          })
      }

      
      // Cleanup
      setPendingModification(null)
  }

  // 4. Confirmation Handler
  const confirmModification = useCallback((mode: 'prune' | 'reset') => {
      if (!pendingModification) return
      
      let nodesToKeep = session.nodes
      
      if (mode === 'reset') {
          nodesToKeep = [] // Delete all
      } else {
          // Mode Prune
          nodesToKeep = pruneTree(session.nodes, corruptedNodeIds)
      }
      
      applyModification(pendingModification.type, pendingModification.payload, nodesToKeep)
  }, [pendingModification, corruptedNodeIds, session.nodes])

  const cancelModification = useCallback(() => {
      setPendingModification(null)
  }, [])
  
  const corruptionMessage = useMemo(() => {
     if (!isCorrupted || !pendingModification) return null
     
     const count = corruptedNodeIds.length // This is number of roots, or total? detectCorruption returns roots usually?
     // Actually pruneTree cleans descendants. detectCorruption logic in my previous step returned "first node of branch".
     // So count is number of branches impacted.
     
     if (pendingModification.type === 'DELETE_POKEMON') {
         return `Deleting this Pokémon impacts ${count} active turn branch(es).`
     }
      if (pendingModification.type === 'CHANGE_DEPLOYMENT') {
          return `Changing deployment invalidates ${count} turns.`
      }
      if (pendingModification.type === 'REORDER_POKEMON') {
          return `Changing character order impact the combat sequence.`
      }
     return "Modification causes conflicts."
  }, [isCorrupted, pendingModification, corruptedNodeIds])


  return (
    <CorruptionContext.Provider
      value={{
        originalSession: session,
        pendingModification,
        setPendingModification,
        requestModification,
        confirmModification,
        cancelModification,
        corruptedNodeIds,
        isCorrupted,
        corruptionMessage // Helper for UI
      }}
    >
      {children}
    </CorruptionContext.Provider>
  )
}
