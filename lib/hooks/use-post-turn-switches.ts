import { KODetected } from "@/lib/hooks/use-turn-simulation"
import { Pokemon, TurnAction } from "@/types/types"
import { useEffect } from "react"


interface UsePostTurnSwitchesProps {
  endOfTurnKOs: KODetected[]
  postTurnActions: TurnAction[]
  onUpdatePostTurnActions: (actions: TurnAction[]) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlotsCount?: number
}

export function usePostTurnSwitches({
  endOfTurnKOs,
  postTurnActions,
  onUpdatePostTurnActions,
  myTeam,
  enemyTeam,
  activeSlotsCount = 1
}: UsePostTurnSwitchesProps) {

  // Process KOs and ensure actions exist
  useEffect(() => {
    if (endOfTurnKOs.length === 0 && postTurnActions.length === 0) return

    let nextActions = [...postTurnActions]
    let changed = false

    // Filter out actions that don't match any current KO
    const validActions = nextActions.filter(action => {
      if (action.type !== "switch-after-ko") return true 
      return endOfTurnKOs.some(ko => {
        const koSide = ko.isAlly ? "my" : "opponent"
        const team = ko.isAlly ? myTeam : enemyTeam
        const teamIndex = team.findIndex(p => p.id === ko.pokemon.id)
        
        return action.actor.side === koSide && action.actor.slotIndex === ko.slotIndex
      })
    })

    if (validActions.length !== nextActions.length) {
      nextActions = validActions
      changed = true
    }

    // Add missing actions for new KOs
    endOfTurnKOs.forEach(ko => {
      const koSide = ko.isAlly ? "my" : "opponent"
      const team = ko.isAlly ? myTeam : enemyTeam
      const teamIndex = team.findIndex(p => p.id === ko.pokemon.id)
      
      if (teamIndex === -1) return // Should not happen

      const existingActionIndex = nextActions.findIndex(
        a => a.actor.side === koSide && a.actor.slotIndex === ko.slotIndex
      )

      if (existingActionIndex === -1) {
        // Create new action
        const newAction: TurnAction = {
          id: crypto.randomUUID(),
          type: "switch-after-ko",
          actor: { side: koSide, slotIndex: ko.slotIndex },
          target: undefined,
          actionDeltas: [],
          effects: [],
          isCollapsed: true,
          metadata: {},
          faintedPokemonId: ko.pokemon.id
        }
        nextActions.push(newAction)
        changed = true
      }
    })

    if (changed) {
      onUpdatePostTurnActions(nextActions)
    }
  }, [endOfTurnKOs, postTurnActions, myTeam, enemyTeam])
}
