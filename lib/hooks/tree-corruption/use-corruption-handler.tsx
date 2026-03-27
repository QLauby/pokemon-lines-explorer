"use client"

import { CombatSession, BattleState, Pokemon, TreeNode } from "@/types/types"
import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { detectCorruption, isTreeSignificant } from "../../logic/corruption"
import { ModificationType, pruneTree, sanitizeTreeForModification } from "../../logic/tree-cleaner"
import { BattleEngine } from "../../logic/battle-engine"
/**
 * Convert all rollProfile deltas back to fixed HP scalars using Nuzlocke asymmetry:
 * - target is player's mon → keep maxDmg (worst case for player)
 * - target is opponent's mon → keep minDmg (best roll for opponent = min damage dealt)
 */
function stripRollProfiles(nodes: TreeNode[], _initialState: BattleState): TreeNode[] {
  const cloned: TreeNode[] = JSON.parse(JSON.stringify(nodes))

  const applyToDeltas = (deltas: any[]) => {
    for (const delta of deltas) {
      if (delta.type === 'HP_RELATIVE' && delta.rollProfile) {
        const targetSide: "my" | "opponent" = delta.target?.side ?? "opponent"
        // Nuzlocke rule: use worst case for our team (maxDmg), best case for opponent (minDmg)
        const fixedDmg = targetSide === "my"
          ? delta.rollProfile.maxDmg
          : delta.rollProfile.minDmg
        delta.amount = -fixedDmg
        delta.rollProfile = undefined
      }
    }
  }

  for (const node of cloned) {
    for (const action of node.turnData.actions) {
      applyToDeltas(action.actionDeltas ?? [])
      for (const effect of action.effects ?? []) {
        applyToDeltas(effect.deltas ?? [])
      }
    }
    for (const effect of node.turnData.endOfTurnEffects ?? []) {
      applyToDeltas(effect.deltas ?? [])
    }
    for (const action of node.turnData.postTurnActions ?? []) {
      applyToDeltas(action.actionDeltas ?? [])
      for (const effect of action.effects ?? []) {
        applyToDeltas(effect.deltas ?? [])
      }
    }
  }

  return cloned
}

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
      
      // ARBRE PROPRE: If the original tree was not significant, wipe all except root
      if (!isTreeSignificant(session.nodes)) {
          finalNodes = currentNodes.filter(n => n.id === 'root')
      }

      // b. Sanitize
      const enrichedPayload = type === 'CHANGE_HP_MODE'
          ? { ...payload, initialState: session.initialState }
          : payload

      finalNodes = sanitizeTreeForModification(finalNodes, type as ModificationType, enrichedPayload)

      // c. Apply
      if (type === 'CHANGE_HP_MODE') {
          const { newHpMode } = payload as { newHpMode: "percent" | "hp" | "rolls" }
          const currentHpMode = session.hpMode ?? "percent"

          if (newHpMode === currentHpMode) {
              setPendingModification(null)
              return
          }

          // ── percent → hp ──
          if (newHpMode === 'hp') {
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

          // ── hp → rolls ──
          // No tree conversion: existing deltas stay as fixed scalars (opt-in per line)
          } else if (newHpMode === 'rolls') {
              onUpdateSession({ hpMode: newHpMode, nodes: finalNodes })

          // ── rolls → hp ──
          // Convert every rollProfile to its Nuzlocke-asymmetric fixed scalar
          } else if (newHpMode === 'percent' && currentHpMode === 'rolls') {
              // Two-step: rolls → hp → percent
              // Step 1: strip rollProfiles (convert to fixed HP using asymmetric rule)
              const nodesWithStrippedRolls = stripRollProfiles(finalNodes, session.initialState)
              // Step 2: convert HP deltas to percent (reuse existing sanitize path)
              const enrichedPayload = { newHpMode: 'percent', currentHpMode: 'hp', initialState: session.initialState }
              const percentNodes = sanitizeTreeForModification(nodesWithStrippedRolls, 'CHANGE_HP_MODE', enrichedPayload)
              onUpdateSession({ hpMode: 'percent', nodes: percentNodes })

          // ── hp → percent ──
          } else {
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

          const normalized = BattleEngine.normalizeActiveSlots({
              ...session.initialState,
              activeSlots: newActiveSlots
          }, newBattleType || session.battleType)

          onUpdateSession({
              initialState: normalized,
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

          // Update activeSlots (shift indices and filter deleted)
          const newActiveSlots = { ...session.initialState.activeSlots }
          const targetSlots = [...(newActiveSlots[teamKey] || [])]
              .filter(idx => idx !== originalIndex) // Remove deleted
              .map(idx => (idx !== null && idx > originalIndex) ? idx - 1 : idx)

          const initialStateAfterDelete = {
              ...session.initialState,
              [teamSide]: newTeam,
              activeSlots: { ...newActiveSlots, [teamKey]: targetSlots }
          }
          
          // CRITICAL: Normalize to fill the gap if needed
          const normalized = BattleEngine.normalizeActiveSlots(initialStateAfterDelete, session.battleType)

          onUpdateSession({ 
              initialState: normalized,
              nodes: finalNodes
          })
      } else if (type === 'REORDER_POKEMON') {
          const { isMyTeam, oldIndex, newIndex } = payload as { isMyTeam: boolean, oldIndex: number, newIndex: number }
          const teamSide = isMyTeam ? 'myTeam' : 'enemyTeam'
          const teamKey = isMyTeam ? 'myTeam' : 'opponentTeam'
          
          const currentStateStore = session.initialState as any
          const newTeam = [...currentStateStore[teamSide]]
          const temp = newTeam[oldIndex]
          newTeam[oldIndex] = newTeam[newIndex]
          newTeam[newIndex] = temp

          // Update activeSlots (swap indices)
          const newActiveSlots = { ...session.initialState.activeSlots }
          const targetSlots = [...(newActiveSlots[teamKey] || [])].map(idx => {
              if (idx === oldIndex) return newIndex
              if (idx === newIndex) return oldIndex
              return idx
          })

          const initialStateAfterReorder = {
              ...session.initialState,
              [teamSide]: newTeam,
              activeSlots: { ...newActiveSlots, [teamKey]: targetSlots }
          }

          const normalized = BattleEngine.normalizeActiveSlots(initialStateAfterReorder, session.battleType)

          onUpdateSession({
              initialState: normalized,
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
         return `Deleting this Pokémon impacts ${count} turn(s) in the battle tree.`
     }
      if (pendingModification.type === 'CHANGE_DEPLOYMENT') {
          return `Changing deployment impacts ${count} turn(s) in the battle tree.`
      }
      if (pendingModification.type === 'REORDER_POKEMON') {
          return `Changing roster order impacts ${count} turn(s) in the battle tree.`
      }
     return "Modification causes conflicts in the battle tree."
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
