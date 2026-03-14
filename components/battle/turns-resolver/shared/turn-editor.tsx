"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useMemo } from "react"

import { useTurnSimulation } from "@/lib/hooks/use-turn-simulation"
import { BattleState, Pokemon, TurnData } from "@/types/types"

import { useKoFusion } from "@/lib/hooks/use-ko-fusion"
import { usePostTurnSwitches } from "@/lib/hooks/use-post-turn-switches"
import { EffectsList } from "../battle-effects/effects-list"
import { InitialDeploymentManager } from "./initial-deployment-manager"

import { useTurnEditorState } from "@/lib/hooks/use-turn-editor-state"
import { useTurnInitialization } from "@/lib/hooks/use-turn-initialization"
import { buildFallbackSimulationState, generateEffectOptions, patchSimulationState } from "@/lib/utils/turn-logic-helpers"
import { ActionItem } from "./action-item"

interface TurnEditorProps {
  initialTurnData?: TurnData
  initialBattleState?: BattleState | null
  activePokemon: { pokemon: Pokemon; isAlly: boolean; slotIndex?: number }[]
  onSave: (data: TurnData) => void
  saveLabel: string
  readOnly?: boolean
  onChange?: (data: TurnData) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  turnNumber: number
  battleFormat?: "simple" | "double"
  autoSave?: boolean
  hpMode?: "percent" | "hp"
}

export function TurnEditor({
  initialTurnData,
  initialBattleState,
  activePokemon: initialActivePokemon = [],
  onSave,
  saveLabel,
  readOnly = false,
  onChange,
  myTeam,
  enemyTeam,
  turnNumber,
  battleFormat = "simple",
  autoSave = false,
  hpMode = "percent",
}: TurnEditorProps) {

  // ── State & Handlers ─────────────────────────────────────────
  const {
    actions, setActions,
    endOfTurnEffects, setEndOfTurnEffects,
    postTurnActions, setPostTurnActions,
    canMoveActionUp, canMoveActionDown, moveAction,
    updateActionType, updateActionTarget, updateActionMetadata,
    updateActionAttack, updateActionPpAmount, toggleActionCollapse,
    handleDeleteAction, handleUpdateAction,
    addEffectToAction, updateEffectInAction, removeEffectFromAction,
    addEndOfTurnEffect, updateEndOfTurnEffect, removeEndOfTurnEffect,
  } = useTurnEditorState(readOnly, hpMode)

  // ── Simulation State ─────────────────────────────────────────
  const simulationState = useMemo(() => {
    if (initialBattleState) {
      return patchSimulationState(initialBattleState, battleFormat)
    }
    return buildFallbackSimulationState(initialActivePokemon, myTeam, enemyTeam, battleFormat)
  }, [initialBattleState, battleFormat, initialActivePokemon, myTeam, enemyTeam])

  // ── Simulation Engine ─────────────────────────────────────────
  const { detectedKOs, endOfTurnKOs, getStateAtAction, getPostTurnStateAt } = useTurnSimulation({
    initialState: simulationState,
    actions,
    endOfTurnEffects,
    postTurnActions,
    myTeam,
    enemyTeam,
    activeSlotsCount: battleFormat === "double" ? 2 : 1,
  })

  // ── Post-Turn Switches (End-of-Turn KOs) ─────────────────────
  usePostTurnSwitches({
    endOfTurnKOs: endOfTurnKOs || [],
    postTurnActions,
    onUpdatePostTurnActions: setPostTurnActions,
    myTeam,
    enemyTeam,
    activeSlotsCount: battleFormat === "double" ? 2 : 1,
  })

  // ── Initialization ────────────────────────────────────────────
  useTurnInitialization({
    initialTurnData,
    turnNumber,
    battleFormat,
    initialActivePokemon,
    myTeam,
    enemyTeam,
    setActions,
    setEndOfTurnEffects,
    setPostTurnActions,
    hpMode,
  })

  // ── KO Fusion (Automatic Forced Switch Management) ────────────
  useKoFusion({ actions, setActions, detectedKOs, getStateAtAction, readOnly })

  // ── Notify Parent & Auto-Save ─────────────────────────────────
  useEffect(() => {
    const data = { actions, endOfTurnEffects, postTurnActions }
    if (onChange) onChange(data)
    if (autoSave && !readOnly) onSave(data)
  }, [actions, endOfTurnEffects, postTurnActions, onChange, autoSave, readOnly])

  // ── Derived helpers for End-of-Turn ──────────────────────────
  const eotState = getStateAtAction(actions.length)
  const eotOptions = generateEffectOptions(eotState)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={`space-y-6 ${readOnly ? "opacity-80 pointer-events-none" : ""}`}>
      <div className="space-y-4">

        {/* Turn 0: Deployment Manager */}
        {turnNumber === 0 && (
          <InitialDeploymentManager
            actions={actions}
            myTeam={myTeam}
            enemyTeam={enemyTeam}
            activeSlots={simulationState.activeSlots}
            onUpdateAction={handleUpdateAction}
            hpMode={hpMode}
          />
        )}

        {/* Main Action List */}
        <div className="space-y-2">
          {actions.map((action, index) => (
            <ActionItem
              key={action.id}
              action={action}
              index={index}
              totalActions={actions.length}
              isDeployment={turnNumber === 0}
              readOnly={readOnly}
              battleFormat={battleFormat}
              stateBeforeAction={getStateAtAction(index)}
              stateAfterAction={getStateAtAction(index + 1)}
              onMove={direction => moveAction(
                index, direction,
                detectedKOs,
                simulationState.activeSlots,
                myTeam,
                enemyTeam
              )}
              onToggleCollapse={() => toggleActionCollapse(index)}
              onUpdateType={type => updateActionType(index, type)}
              onUpdateTarget={target => updateActionTarget(index, target)}
              onUpdateMetadata={metadata => updateActionMetadata(index, metadata)}
              onUpdateAttack={(name, moveId) => updateActionAttack(index, name, moveId)}
              onUpdatePpAmount={(amount) => updateActionPpAmount(index, amount)}
              onAddEffect={() => addEffectToAction(index)}
              onUpdateEffect={(effIdx, newEff) => updateEffectInAction(index, effIdx, newEff)}
              onRemoveEffect={effIdx => removeEffectFromAction(index, effIdx)}
              onDelete={() => handleDeleteAction(index)}
              canMoveUp={canMoveActionUp(index)}
              canMoveDown={canMoveActionDown(index)}
              hpMode={hpMode}
            />
          ))}
        </div>
      </div>

      {/* End of Turn Effects */}
      {turnNumber !== 0 && (
        <div className="border-t pt-4">
          <EffectsList
            title="End of Turn Effects"
            effects={endOfTurnEffects}
            options={eotOptions}
            onAdd={() => addEndOfTurnEffect(
              eotOptions.length > 0 ? eotOptions[0].value : { side: "my", slotIndex: 0 }
            )}
            onUpdate={!readOnly ? updateEndOfTurnEffect : () => {}}
            onRemove={!readOnly ? removeEndOfTurnEffect : () => {}}
            readOnly={readOnly}
            baseState={eotState}
            hpMode={hpMode}
          />
        </div>
      )}

      {/* Post-Turn Switches (End-of-Turn KOs) */}
      {postTurnActions.length > 0 && (
        <div className="pt-2">
          <div className="space-y-2">
            {postTurnActions.map((action, index) => {
              const stateForContext = getPostTurnStateAt(index)
              return (
                <ActionItem
                  key={action.id}
                  action={action}
                  index={index}
                  totalActions={postTurnActions.length}
                  isDeployment={false}
                  readOnly={readOnly}
                  battleFormat={battleFormat}
                  stateBeforeAction={stateForContext}
                  stateAfterAction={getPostTurnStateAt(index + 1)}
                  onMove={() => {}}
                  onToggleCollapse={() => toggleActionCollapse(index, true)}
                  onUpdateType={type => updateActionType(index, type, true)}
                  onUpdateTarget={t => updateActionTarget(index, t, true)}
                  onUpdateMetadata={metadata => updateActionMetadata(index, metadata, true)}
                  onUpdateAttack={(name, moveId) => updateActionAttack(index, name, moveId, true)}
                  onUpdatePpAmount={(amount) => updateActionPpAmount(index, amount, true)}
                  onAddEffect={() => addEffectToAction(index, true)}
                  onUpdateEffect={(ei, ne) => updateEffectInAction(index, ei, ne, true)}
                  onRemoveEffect={ei => removeEffectFromAction(index, ei, true)}
                  onDelete={() => {}}
                  canMoveUp={false}
                  canMoveDown={false}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Save Button */}
      {!readOnly && !autoSave && (
        <div className="pt-1 flex justify-center">
          <Button
            onClick={() => onSave({ actions, endOfTurnEffects, postTurnActions })}
            className="px-15"
          >
            {saveLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
