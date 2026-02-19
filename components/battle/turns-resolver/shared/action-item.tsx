"use client"

/**
 * action-item.tsx
 * Wrapper component for a single action in the TurnEditor action list.
 * Responsible for resolving the dynamic "context" for a given action index:
 *   - The BattleState snapshot just before this action
 *   - The resolved actor Pokémon object
 *   - The defusion capability
 *   - The valid effect target options (respecting switch ordering)
 * Then renders the <PokemonAction> card with that context.
 */

import { generateEffectOptions, getActivePokemonFromState } from "@/lib/utils/turn-logic-helpers"
import { BattleState, Effect, TurnAction, TurnActionType } from "@/types/types"
import { PokemonAction } from "./pokemon-action"

interface ActionItemProps {
  action: TurnAction
  index: number
  totalActions: number
  isDeployment: boolean
  readOnly: boolean
  battleFormat: "simple" | "double"
  stateBeforeAction: BattleState
  stateAfterAction: BattleState

  // Handlers
  onMove: (direction: "up" | "down") => void
  onToggleCollapse: () => void
  onUpdateType: (type: TurnActionType) => void
  onUpdateTarget: (target: { side: "my" | "opponent"; slotIndex: number } | undefined) => void
  onUpdateMetadata: (metadata: { itemName?: string; attackName?: string }) => void
  onUpdateAttack: (attackName: string, moveName?: string) => void
  onAddEffect: () => void
  onUpdateEffect: (effectIndex: number, newEffect: Effect) => void
  onRemoveEffect: (effectIndex: number) => void
  onDelete: () => void

  // Movement capabilities from parent
  canMoveUp: boolean
  canMoveDown: boolean
}

export function ActionItem({
  action,
  index,
  totalActions,
  isDeployment,
  readOnly,
  battleFormat,
  stateBeforeAction,
  stateAfterAction,
  onMove,
  onToggleCollapse,
  onUpdateType,
  onUpdateTarget,
  onUpdateMetadata,
  onUpdateAttack,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onDelete,
  canMoveUp,
  canMoveDown,
}: ActionItemProps) {
  // Skip non-KO-switch actions during the deployment turn
  if (isDeployment && action.type !== "switch-after-ko") return null

  // Resolve the actor object from the current battlefield state
  const dynamicActivePokemon = getActivePokemonFromState(stateBeforeAction, battleFormat)

  const actorEntry =
    dynamicActivePokemon.find(
      ap =>
        (ap.isAlly ? "my" : "opponent") === action.actor.side &&
        (ap.slotIndex === action.actor.slotIndex ||
          (action.type === "switch-after-ko" && ap.slotIndex === action.target?.slotIndex))
    ) || dynamicActivePokemon.find(ap => (ap.isAlly ? "my" : "opponent") === action.actor.side)

  const actorObj = actorEntry
    ? { pokemon: actorEntry.pokemon, isAlly: actorEntry.isAlly }
    : undefined

  // Defusion is available when a fused switch-after-ko can be moved before its KO trigger
  const canDefuse =
    action.type === "switch-after-ko" &&
    (!!(action.metadata as any)?.fusedFrom || !!action.fusedFrom)

  // Effects targeting: use the post-switch state for switches so the incoming Pokémon is visible
  const isSwitchAction = action.type === "switch" || action.type === "switch-after-ko"
  const effectOptions = generateEffectOptions(isSwitchAction ? stateAfterAction : stateBeforeAction)

  return (
    <div key={action.id} className="space-y-2">
      <div className="relative">
        <PokemonAction
          action={action}
          index={index}
          totalActions={totalActions}
          actor={actorObj}
          activeSlots={stateBeforeAction.activeSlots}
          onMove={direction => !readOnly && onMove(direction)}
          onToggleCollapse={onToggleCollapse}
          onUpdateType={type => !readOnly && onUpdateType(type)}
          onUpdateTarget={target => !readOnly && onUpdateTarget(target)}
          onUpdateMetadata={metadata => !readOnly && onUpdateMetadata(metadata)}
          onUpdateAttack={(name, moveId) => !readOnly && onUpdateAttack(name, moveId)}
          onAddEffect={() => !readOnly && onAddEffect()}
          onUpdateEffect={(effIndex, newEff) => !readOnly && onUpdateEffect(effIndex, newEff)}
          onRemoveEffect={effIndex => !readOnly && onRemoveEffect(effIndex)}
          myTeam={stateBeforeAction.myTeam}
          enemyTeam={stateBeforeAction.enemyTeam}
          onDelete={() => !readOnly && onDelete()}
          canMoveUp={!readOnly && canMoveUp}
          canMoveDown={!readOnly && canMoveDown}
          canDefuse={!readOnly && canDefuse}
          effectOptions={effectOptions}
        />
      </div>
    </div>
  )
}
