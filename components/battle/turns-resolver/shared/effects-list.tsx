import { Button } from "@/components/ui/button"
import { BattleEngine } from "@/lib/logic/battle-engine"
import { getPokemonHpFromState } from "@/lib/utils/turn-logic-helpers"
import { BattleState, Effect, SlotReference } from "@/types/types"
import { Plus } from "lucide-react"
import { EffectSelection } from "./effect-selection"

interface EffectsListProps {
  title?: string
  effects: Effect[]
  options: { label: string; value: SlotReference; isAlly: boolean }[]
  onAdd: () => void
  onUpdate: (index: number, newEffect: Effect) => void
  onRemove: (index: number) => void
  readOnly?: boolean
  baseState?: BattleState
  hpMode?: "percent" | "hp"
}

export function EffectsList({
  title = "Effects",
  effects,
  options,
  onAdd,
  onUpdate,
  onRemove,
  readOnly,
  baseState,
  hpMode = "percent"
}: EffectsListProps) {
  
  // Create an array of state snapshots, one BEFORE each effect
  let currentState = baseState;
  const effectStates = effects.map(effect => {
      const stateBeforeThisEffect = currentState;
      if (currentState) {
          for(const delta of effect.deltas) {
              currentState = BattleEngine.applyDelta(currentState, delta)
          }
      }
      return stateBeforeThisEffect;
  });

  return (
    <div className="flex flex-col gap-2">
       {/* Header row: title + add button */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
          {title}
        </span>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[10px] gap-0.5 px-1.5"
            onClick={onAdd}
            disabled={options.length === 0}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      {/* Effects List */}
      {effects.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic pl-1 border-l-2 py-1">
           No effects active
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {effects.map((effect, index) => (
            <EffectSelection
              key={`effect-${index}`}
              effect={effect}
              options={options}
              onUpdate={(newEffect) => onUpdate(index, newEffect)}
              onRemove={() => onRemove(index)}
              readOnly={readOnly}
              getPokemonHp={(side, slotIndex) => {
                  const stateForThisEffect = effectStates[index] || baseState
                  if (!stateForThisEffect) return undefined
                  return getPokemonHpFromState(stateForThisEffect, side, slotIndex)
              }}
              hpMode={hpMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
