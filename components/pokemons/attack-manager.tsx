"use client"

import { Plus, Trash2, Zap } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { pokemonTypeColors } from "@/lib/colors"
import { Attack, Pokemon } from "@/lib/types"

import { EditableText } from "@/components/shared/editable-text"
import { PokemonTypeDropdown } from "./pokemon-type-dropdown"

interface AttackManagerProps {
  pokemon: Pokemon
  onUpdate: (updatedPokemon: Pokemon) => void
  isMyTeam: boolean
}

export function AttackManager({ pokemon, onUpdate, isMyTeam }: AttackManagerProps) {
  const [showAttacks, setShowAttacks] = useState(false)

  const getDefaultAttackName = (index: number, isMyTeam: boolean) => {
    if (isMyTeam) {
      return `Move ${index + 1}` // Move 1, Move 2, Move 3, Move 4
    } else {
      return `Move ${String.fromCharCode(65 + index)}` // Move A, Move B, Move C, Move D
    }
  }

  const addAttack = () => {
    if (pokemon.attacks.length >= 4) return

    const newAttack: Attack = {
      id: Date.now().toString(),
      name: getDefaultAttackName(pokemon.attacks.length, isMyTeam),
      maxPP: 15,
      currentPP: 15,
    }

    onUpdate({
      ...pokemon,
      attacks: [...pokemon.attacks, newAttack],
    })
  }

  const updateAttack = (attackId: string, field: keyof Attack, value: string | number) => {
    const updatedAttacks = pokemon.attacks.map((attack) => {
      if (attack.id === attackId) {
        return { ...attack, [field]: value }
      }
      return attack
    })

    onUpdate({
      ...pokemon,
      attacks: updatedAttacks,
    })
  }

  const handleMaxPPChange = (attackId: string, newValue: string) => {
    const attack = pokemon.attacks.find((a) => a.id === attackId)
    if (!attack) return

    let numValue: number
    if (newValue === "") {
      // Empty input: keep previous value (no change)
      return
    } else {
      numValue = Number(newValue)
      if (isNaN(numValue) || numValue < 0) {
        numValue = 0
      }
    }

    if (numValue === attack.maxPP) {
      // Value hasn't changed, don't update anything
      return
    }

    const updatedAttacks = pokemon.attacks.map((attack) => {
      if (attack.id === attackId) {
        return { ...attack, maxPP: numValue, currentPP: numValue }
      }
      return attack
    })

    onUpdate({
      ...pokemon,
      attacks: updatedAttacks,
    })
  }

  const handleCurrentPPChange = (attackId: string, newValue: string) => {
    const attack = pokemon.attacks.find((a) => a.id === attackId)
    if (!attack) return

    let numValue: number
    if (newValue === "") {
      numValue = 0 // Empty input: default to 0
    } else {
      numValue = Number(newValue)
      if (isNaN(numValue) || numValue < 0) {
        numValue = 0
      }
    }

    const cappedValue = Math.min(numValue, attack.maxPP)
    updateAttack(attackId, "currentPP", cappedValue)
  }

  const removeAttack = (attackId: string) => {
    onUpdate({
      ...pokemon,
      attacks: pokemon.attacks.filter((attack) => attack.id !== attackId),
    })
  }

  const handleAttackNameChange = (attackId: string, newName: string) => {
    const attackIndex = pokemon.attacks.findIndex((a) => a.id === attackId)
    const finalName = newName.trim() || getDefaultAttackName(attackIndex, isMyTeam)
    updateAttack(attackId, "name", finalName)
  }

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAttacks(!showAttacks)}
        className="text-xs h-6 px-2 cursor-pointer"
      >
        <Zap className="h-3 w-3 mr-1" />
        Attaques ({pokemon.attacks.length}/4)
      </Button>

      {showAttacks && (
        <div className="mt-2 p-1.5 border rounded-lg bg-gray-50">
          <div className="flex flex-col gap-1.5">
            {pokemon.attacks.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {pokemon.attacks.map((attack, index) => {
                  const defaultName = getDefaultAttackName(index, isMyTeam)

                  return (
                    <div key={attack.id} className="border rounded-lg p-2 bg-white space-y-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 mr-1 h-5 flex items-center min-w-0">
                          {attack.type && (
                            <div 
                              className="w-[3px] h-full mr-1 rounded-full shrink-0" 
                              style={{ backgroundColor: pokemonTypeColors[attack.type] }}
                            />
                          )}
                          <EditableText
                            value={attack.name}
                            placeholder={defaultName}
                            defaultValue={defaultName}
                            onChange={(newName) => handleAttackNameChange(attack.id, newName)}
                            autoWidth={false}
                            width="100%"
                            fontSize={12}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttack(attack.id)}
                          className="h-4 w-4 p-0 cursor-pointer"
                        >
                          <Trash2 style={{ width: "12px", height: "12px" }} />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600 whitespace-nowrap" style={{ fontSize: "8px" }}>
                            PP :
                          </span>
                          <EditableText
                            value={attack.currentPP.toString()}
                            onChange={(newValue) => handleCurrentPPChange(attack.id, newValue)}
                            type="number"
                            numberMode="integer"
                            min={0}
                            dynamicMax={() => attack.maxPP}
                            width="25px"
                            fontSize={8}
                            fontSizeRatio={0.5}
                            rounded={true}
                            textAlign="center"
                            defaultValue="0"
                            placeholder=""
                          />
                          <span className="text-gray-500">/</span>
                          <EditableText
                            value={attack.maxPP.toString()}
                            onChange={(newValue) => handleMaxPPChange(attack.id, newValue)}
                            type="number"
                            numberMode="integer"
                            min={0}
                            width="25px"
                            fontSize={8}
                            fontSizeRatio={0.5}
                            rounded={true}
                            textAlign="center"
                            defaultValue={attack.maxPP.toString()}
                            placeholder=""
                          />
                        </div>
                        <div className="flex-1 flex justify-end">
                          <PokemonTypeDropdown 
                            selectedType={attack.type || null} 
                            onSelect={(type) => updateAttack(attack.id, "type", type as any)} 
                            includeNull 
                            buttonClassName="h-4 px-0.5 gap-0.5 rounded-full min-w-[24px]"
                            size={16}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {pokemon.attacks.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addAttack}
                className="h-6 text-xs w-full bg-transparent cursor-pointer"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter attaque
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
