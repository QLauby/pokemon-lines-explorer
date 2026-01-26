"use client"

import { BattleDelta, Pokemon, SlotReference, TurnAction } from "@/types/types"
import { EffectsList } from "./effects-list"

interface InitialDeploymentManagerProps {
  actions: TurnAction[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: number
  onUpdateAction: (index: number, action: TurnAction) => void
}

export function InitialDeploymentManager({
  actions,
  myTeam,
  enemyTeam,
  activeSlots,
  onUpdateAction,
}: InitialDeploymentManagerProps) {
  
  // 1. Collect entering pokemon info for the title
  const myEntering = actions
    .filter(a => a.actor.side === "my")
    .map(a => ({ name: myTeam[a.actor.slotIndex]?.name, side: "my" as const }))
    .filter(p => p.name)
  
  const enemyEntering = actions
    .filter(a => a.actor.side === "opponent")
    .map(a => ({ name: enemyTeam[a.actor.slotIndex]?.name, side: "opponent" as const }))
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

  // 2. Flatten deltas for the unified ConsequencesList
  const flattenedDeltasWithMeta = actions.flatMap((action, actionIndex) => 
    action.deltas.map((delta, deltaIndex) => ({
      delta,
      actionIndex,
      deltaIndex
    }))
  )

  const flattenedDeltas = flattenedDeltasWithMeta.map(item => item.delta)

  // 3. Prepare Options (Sorted: My Team then Enemy Team)
  const options: { label: string; value: SlotReference; isAlly: boolean }[] = []
  
  for (let i = 0; i < activeSlots; i++) {
      const p = myTeam[i]
      if (p) {
          options.push({ label: p.name, value: { side: "my", slotIndex: i }, isAlly: true })
      }
  }
  for (let i = 0; i < activeSlots; i++) {
      const p = enemyTeam[i]
      if (p) {
          options.push({ label: p.name, value: { side: "opponent", slotIndex: i }, isAlly: false })
      }
  }

  // 4. Handlers
  const handleAdd = () => {
    const firstAction = actions[0]
    if (!firstAction) return

    const newDelta: BattleDelta = {
      type: "HP_RELATIVE",
      target: firstAction.actor, 
      amount: -0,
    }

    onUpdateAction(0, {
      ...firstAction,
      deltas: [...firstAction.deltas, newDelta]
    })
  }

  const handleUpdate = (
    flatIndex: number, 
    field: "slot" | "value" | "isHealing", 
    value: any
  ) => {
    const meta = flattenedDeltasWithMeta[flatIndex]
    if (!meta) return

    const action = actions[meta.actionIndex]
    const newDeltas = [...action.deltas]
    const delta = { ...newDeltas[meta.deltaIndex] } as BattleDelta

    if (delta.type !== "HP_RELATIVE") return

    if (field === "slot" && value && typeof value === "object" && "side" in value) {
        delta.target = value
    }

    if (field === "value" || field === "isHealing") {
        const currentAmount = Math.abs(delta.amount)
        const isHealing = field === "isHealing" 
            ? (value as boolean) 
            : (delta.amount > 0 || (delta.amount === 0 && !Object.is(delta.amount, -0)))
        const amountVal = field === "value" ? (value as number) : currentAmount
        delta.amount = isHealing ? amountVal : -amountVal
    }

    newDeltas[meta.deltaIndex] = delta
    onUpdateAction(meta.actionIndex, { ...action, deltas: newDeltas })
  }

  const handleRemove = (flatIndex: number) => {
    const meta = flattenedDeltasWithMeta[flatIndex]
    if (!meta) return

    const action = actions[meta.actionIndex]
    const newDeltas = action.deltas.filter((_, i) => i !== meta.deltaIndex)
    
    onUpdateAction(meta.actionIndex, { ...action, deltas: newDeltas })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">
        {renderTitle()}
      </div>
      
      <div className="pt-1">
        <EffectsList
          title="Entry effects"
          deltas={flattenedDeltas}
          options={options}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          addButtonLabel="Add Effect"
        />
      </div>
    </div>
  )
}
