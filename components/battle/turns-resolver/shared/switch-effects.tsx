"use client"

import { Pokemon, SlotReference, TurnAction } from "@/types/types"
import { EffectsList } from "./effects-list"

interface SwitchEffectsProps {
  action: TurnAction
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  onAddEntryHpChange: () => void
  onUpdateHpChange: (index: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemoveHpChange: (index: number) => void
  onMoveHpChange: (fromIndex: number, toIndex: number) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
}

export function SwitchEffects({
  action,
  activeSlots,
  onAddEntryHpChange,
  onUpdateHpChange,
  onRemoveHpChange,
  onMoveHpChange,
  myTeam,
  enemyTeam,
}: SwitchEffectsProps) {
  if (!action.target) {
    return (
      <div className="p-4 border border-dashed rounded-md bg-muted/30 text-center text-muted-foreground text-sm italic">
        Select a replacement Pokémon to add effects
      </div>
    )
  }

  const switchDeltaIndex = action.deltas.findIndex((d) => d.type === "SWITCH")
  const isAllySwitch = action.actor.side === "my"

  // --- 1. Construction of the options list (Strict sorting) ---
  
  const buildOptions = () => {
    const opts: { label: string; value: SlotReference; isAlly: boolean }[] = []

    // A. The incoming (action.target)
    const incomingRef = action.target!
    const incomingTeam = incomingRef.side === "my" ? myTeam : enemyTeam
    const incomingPokemon = incomingTeam[incomingRef.slotIndex]
    
    // Find the Battlefield Slot where this switch is happening
    const actorSlots = isAllySwitch ? activeSlots.myTeam : activeSlots.opponentTeam
    const outgoingBattlefieldSlot = actorSlots.findIndex(idx => idx === action.actor.slotIndex)

    if (incomingPokemon && outgoingBattlefieldSlot !== -1) {
      opts.push({
        label: incomingPokemon.name,
        value: { side: incomingRef.side, slotIndex: outgoingBattlefieldSlot }, // Use Battlefield Slot!
        isAlly: incomingRef.side === "my"
      })
    }

    // B. The outgoing (action.actor) - Get from activeSlots
    const actorTeam = isAllySwitch ? myTeam : enemyTeam
    const outgoingTeamIndex = actorSlots[action.actor.slotIndex] ?? -1
    
    if (outgoingTeamIndex !== -1 && actorTeam[outgoingTeamIndex]) {
      opts.push({
        label: actorTeam[outgoingTeamIndex].name,
        value: { side: action.actor.side, slotIndex: outgoingTeamIndex },
        isAlly: isAllySwitch
      })
    }

    // C. The other allies (Partners) - From activeSlots
    actorSlots.forEach((slotIdx, fieldPos) => {
      if (slotIdx !== null && slotIdx !== -1 && slotIdx !== outgoingTeamIndex && actorTeam[slotIdx]) {
        opts.push({
          label: actorTeam[slotIdx].name,
          value: { side: action.actor.side, slotIndex: slotIdx },
          isAlly: isAllySwitch
        })
      }
    })

    // D. The opposing side (opponents) - From activeSlots
    const oppSlots = isAllySwitch ? activeSlots.opponentTeam : activeSlots.myTeam
    const oppTeam = isAllySwitch ? enemyTeam : myTeam
    const oppSide = isAllySwitch ? "opponent" : "my"
    
    oppSlots.forEach((slotIdx) => {
      if (slotIdx !== null && slotIdx !== -1 && oppTeam[slotIdx]) {
        opts.push({
          label: oppTeam[slotIdx].name,
          value: { side: oppSide, slotIndex: slotIdx },
          isAlly: !isAllySwitch
        })
      }
    })

    return opts
  }

  const options = buildOptions()

  // --- 2. Update Handler (Logic de Time Travel) ---
  
  const handleSlotUpdate = (deltaIndex: number, selectedSlot: SlotReference) => {
    onUpdateHpChange(deltaIndex, "slot", selectedSlot)

    if (switchDeltaIndex === -1) return
    
  }

  // Wrapper for onUpdate to intercept slot changes
  const handleUpdate = (index: number, field: "slot" | "value" | "isHealing", val: any) => {
      if (field === "slot") {
          handleSlotUpdate(index, val)
      } else {
          onUpdateHpChange(index, field, val)
      }
  }

  return (
    <EffectsList 
        title="Entry Effects"
        deltas={action.deltas}
        options={options}
        onAdd={onAddEntryHpChange}
        onUpdate={handleUpdate}
        onRemove={onRemoveHpChange}
        addButtonLabel="Add Effect"
    />
  )
}
