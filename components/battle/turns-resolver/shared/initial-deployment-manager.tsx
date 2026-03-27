"use client"

import { BattleState, Effect, Pokemon, SlotReference, TurnAction } from "@/types/types"
import { EffectsList } from "../battle-effects/effects-list"

interface InitialDeploymentManagerProps {
  actions: TurnAction[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  onUpdateAction: (index: number, action: TurnAction) => void
  hpMode?: "percent" | "hp" | "rolls"
}

export function InitialDeploymentManager({
  actions,
  myTeam,
  enemyTeam,
  activeSlots,
  onUpdateAction,
  hpMode = "percent",
}: InitialDeploymentManagerProps) {
  
  // 1. Collect entering pokemon info for the title (Only initial deployments)
  const deploymentActions = actions.filter(a => a.type !== "switch-after-ko")

  const myEntering = deploymentActions
    .filter(a => a.actor.side === "my")
    .map(a => {
        // Resolve the team index from the mapping
        const teamIndex = activeSlots.myTeam[a.actor.slotIndex]
        return { 
            name: (teamIndex !== undefined && teamIndex !== null) ? myTeam[teamIndex]?.name : "Unknown", 
            side: "my" as const 
        }
    })
    .filter(p => p.name)
  
  const enemyEntering = deploymentActions
    .filter(a => a.actor.side === "opponent")
    .map(a => {
        const teamIndex = activeSlots.opponentTeam[a.actor.slotIndex]
        return { 
            name: (teamIndex !== undefined && teamIndex !== null) ? enemyTeam[teamIndex]?.name : "Unknown", 
            side: "opponent" as const 
        }
    })
    .filter(p => p.name)

  const allEntering = [...myEntering, ...enemyEntering]

  const renderTitle = () => {
    if (allEntering.length === 0) return "Deployment"

    const elements: React.ReactNode[] = []
    
    allEntering.forEach((p, i) => {
      const isLast = i === allEntering.length - 1
      const isSecondToLast = i === allEntering.length - 2
      
      elements.push(
        <span 
          key={`${p.side}-${i}`} 
          className={p.side === "my" ? "text-blue-600 font-bold" : "text-red-600 font-bold"}
        >
          {p.name}
        </span>
      )

      if (isSecondToLast) {
        elements.push(" & ")
      } else if (!isLast) {
        elements.push(", ")
      }
    })

    elements.push(<span key="suffix"> enter the battlefield</span>)
    return <span>&quot;<i>{elements}</i>&quot;</span>
  }

  // 2. Flatten effects for the unified ConsequencesList (Only for deployment actions)
  const flattenedEffectsWithMeta = actions.flatMap((action, actionIndex) => {
    if (action.type === "switch-after-ko") return []
    
    return action.effects.map((effect, effectIndex) => ({
      effect,
      actionIndex,
      effectIndex
    }))
  })

  const flattenedEffects = flattenedEffectsWithMeta.map(item => item.effect)

  // 3. Prepare Options (Sorted: My Team then Enemy Team)
  const options: { label: string; value: SlotReference; isAlly: boolean }[] = []
  
  const myLimit = activeSlots.myTeam.length
  for (let i = 0; i < myLimit; i++) {
      const teamIndex = activeSlots.myTeam[i]
      if (teamIndex !== undefined && teamIndex !== null) {
          const p = myTeam[teamIndex]
          if (p) {
              options.push({ label: p.name, value: { side: "my", slotIndex: i }, isAlly: true })
          }
      }
  }
  const opponentLimit = activeSlots.opponentTeam.length
  for (let i = 0; i < opponentLimit; i++) {
      const teamIndex = activeSlots.opponentTeam[i]
      if (teamIndex !== undefined && teamIndex !== null) {
          const p = enemyTeam[teamIndex]
          if (p) {
              options.push({ label: p.name, value: { side: "opponent", slotIndex: i }, isAlly: false })
          }
      }
  }

  // 4. Handlers
  const handleAdd = () => {
    if (options.length === 0) return

    // Default target: first available option
    const defaultTarget = options[0].value

    // Determine which action this effect belongs to
    const targetActionIndex = actions.findIndex(a => 
        a.type !== 'switch-after-ko' && 
        a.actor.side === defaultTarget.side && 
        a.actor.slotIndex === defaultTarget.slotIndex
    )

    // Fallback: Add to first action if exact match not found
    const actionIndex = targetActionIndex !== -1 ? targetActionIndex : 0
    const action = actions[actionIndex]
    if (!action) return

    const newEffect: Effect = {
      type: "hp-change",
      target: defaultTarget,
      deltas: [{
          type: "HP_RELATIVE",
          target: defaultTarget,
          amount: 0,
          unit: hpMode === "rolls" ? "hp" : hpMode
      }]
    }

    onUpdateAction(actionIndex, {
      ...action,
      effects: [...action.effects, newEffect]
    })
  }

  const handleUpdate = (flatIndex: number, newEffect: Effect) => {
    const meta = flattenedEffectsWithMeta[flatIndex]
    if (!meta) return

    const action = actions[meta.actionIndex]
    const newEffects = [...action.effects]
    newEffects[meta.effectIndex] = newEffect

    onUpdateAction(meta.actionIndex, { ...action, effects: newEffects })
  }

  const handleRemove = (flatIndex: number) => {
    const meta = flattenedEffectsWithMeta[flatIndex]
    if (!meta) return

    const action = actions[meta.actionIndex]
    const newEffects = action.effects.filter((_, i) => i !== meta.effectIndex)
    
    onUpdateAction(meta.actionIndex, { ...action, effects: newEffects })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-slate-700">
        {renderTitle()}
      </div>
      
      <div className="pt-1">
        <EffectsList
          title="Pre-Battle Entry Effects"
          effects={flattenedEffects} 
          options={options} 
          onAdd={handleAdd} 
          onUpdate={handleUpdate} 
          onRemove={handleRemove} 
          baseState={{ activeSlots, myTeam, enemyTeam } as unknown as BattleState}
          hpMode={hpMode}
        />
      </div>
    </div>
  )
}
