"use client"

import { Pokemon, SlotReference, TurnAction } from "@/lib/types"
import { EffectsList } from "./effects-list"

interface SwitchEffectsProps {
  action: TurnAction
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onAddEntryHpChange: () => void
  onUpdateHpChange: (index: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemoveHpChange: (index: number) => void
  onMoveHpChange: (fromIndex: number, toIndex: number) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
}

export function SwitchEffects({
  action,
  activePokemon,
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
    
    if (incomingPokemon) {
      opts.push({
        label: incomingPokemon.name,
        value: incomingRef,
        isAlly: incomingRef.side === "my"
      })
    }

    // B. The outgoing (action.actor)
    const actorFieldSlot = action.actor.slotIndex
    const sameSideActive = activePokemon.filter(p => p.isAlly === isAllySwitch)
    const outgoingPokemon = sameSideActive[actorFieldSlot]

    let outgoingTeamIndex = -1
    if (outgoingPokemon) {
      const fullTeam = isAllySwitch ? myTeam : enemyTeam
      outgoingTeamIndex = fullTeam.findIndex(p => p.id === outgoingPokemon.pokemon.id)
      
      opts.push({
        label: `${outgoingPokemon.pokemon.name}`,
        value: { side: action.actor.side, slotIndex: outgoingTeamIndex },
        isAlly: isAllySwitch
      })
    }

    // C. The other allies (Partners)
    sameSideActive.forEach((ap) => {
      const fullTeam = ap.isAlly ? myTeam : enemyTeam
      const teamIndex = fullTeam.findIndex(p => p.id === ap.pokemon.id)
      // Exclude the outgoing (already added)
      if (teamIndex !== -1 && teamIndex !== outgoingTeamIndex) {
        opts.push({
          label: ap.pokemon.name,
          value: { side: ap.isAlly ? "my" : "opponent", slotIndex: teamIndex },
          isAlly: ap.isAlly
        })
      }
    })

    // D. The opposing side (opponents)
    const opposingSideActive = activePokemon.filter(p => p.isAlly !== isAllySwitch)
    opposingSideActive.forEach((ap) => {
      const oppTeam = ap.isAlly ? myTeam : enemyTeam
      const teamIndex = oppTeam.findIndex(p => p.id === ap.pokemon.id)
      if (teamIndex !== -1) {
        opts.push({
          label: ap.pokemon.name,
          value: { side: ap.isAlly ? "my" : "opponent", slotIndex: teamIndex },
          isAlly: ap.isAlly
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

    const sameSideActive = activePokemon.filter(p => p.isAlly === isAllySwitch)
    const outgoingPokemon = sameSideActive[action.actor.slotIndex]
    const outgoingTeam = isAllySwitch ? myTeam : enemyTeam
    const outgoingTeamIndex = outgoingTeam.findIndex(p => p.id === outgoingPokemon?.pokemon.id)
    
    const isOutgoing = selectedSlot.side === action.actor.side && selectedSlot.slotIndex === outgoingTeamIndex

    if (isOutgoing) {
      if (deltaIndex > switchDeltaIndex) {
        onMoveHpChange(deltaIndex, switchDeltaIndex)
      }
    } else {
      if (deltaIndex < switchDeltaIndex) {
        onMoveHpChange(deltaIndex, switchDeltaIndex + 1)
      }
    }
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
        addButtonLabel="Add Entry Damage"
    />
  )
}
