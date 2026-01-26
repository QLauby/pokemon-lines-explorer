"use client"

import { Plus, Trash2 } from "lucide-react"


import { Button } from "@/components/ui/button"

import { TypeLiseret } from "@/components/shared/type-liseret"
import { Attack, Pokemon } from "@/types/types"

import { Counter } from "@/components/shared/counter"
import { EditableText } from "@/components/shared/editable-text"
import { PokemonTypeDropdown } from "../shared/pokemon-type-dropdown"

interface AttackManagerProps {
  pokemon: Pokemon
  onUpdate: (updatedPokemon: Pokemon) => void
  isMyTeam: boolean
  readOnly?: boolean
}

export function AttackManager({ pokemon, onUpdate, isMyTeam, readOnly = false }: AttackManagerProps) {


  const getDefaultAttackName = (index: number, isMyTeam: boolean) => {
    if (isMyTeam) {
      return `Move ${index + 1}` // Move 1, Move 2, Move 3, Move 4
    } else {
      return `Move ${String.fromCharCode(65 + index)}` // Move A, Move B, Move C, Move D
    }
  }

  const addAttack = () => {
    if (readOnly) return
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

    if (numValue > attack.maxPP) {
        // Logic 2: if current PP > max PP, update max PP to match
        const updatedAttacks = pokemon.attacks.map((attack) => {
            if (attack.id === attackId) {
                return { ...attack, currentPP: numValue, maxPP: numValue }
            }
            return attack
        })
        onUpdate({
            ...pokemon,
            attacks: updatedAttacks,
        })
    } else {
        updateAttack(attackId, "currentPP", numValue)
    }
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
    <div className="mt-1">
      <div className="p-1.5 border rounded-lg bg-gray-50">
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
                          <TypeLiseret types={[attack.type]} className="w-[3px] h-full mr-1" />
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
                      {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttack(attack.id)}
                        className="h-4 w-4 p-0 cursor-pointer"
                      >
                        <Trash2 style={{ width: "12px", height: "12px" }} />
                      </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 whitespace-nowrap" style={{ fontSize: "8px" }}>
                          PP :
                        </span>
                        <Counter
                          value={attack.currentPP.toString()}
                          onChange={(newValue) => handleCurrentPPChange(attack.id, newValue)}
                          min={0}
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
                          readOnly={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!readOnly && pokemon.attacks.length < 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addAttack}
              className="h-6 text-xs w-full bg-transparent cursor-pointer dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter attaque
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
