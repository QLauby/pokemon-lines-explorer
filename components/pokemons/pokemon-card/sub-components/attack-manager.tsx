"use client"

import { Plus, Trash2 } from "lucide-react"


import { Button } from "@/components/ui/button"

import { TypeLiseret } from "@/components/shared/type-liseret"
import { Attack, Pokemon } from "@/types/types"

import { Counter } from "@/components/shared/counter"
import { EditableText } from "@/components/shared/editable-text"
import { AutocompleteEditable } from "@/components/shared/autocomplete-editable"
import { type SuggestionItem } from "@/components/shared/suggestion-list"
import { searchMoves, getMoveDetails } from "@/lib/utils/pokedex-utils"
import { PokemonTypeDropdown } from "../shared/pokemon-type-dropdown"
import { THEME } from "@/lib/constants/color-constants"
import { useIsDark } from "@/lib/hooks/use-is-dark"

interface AttackManagerProps {
  pokemon: Pokemon
  onUpdate: (updatedPokemon: Pokemon) => void
  isMyTeam: boolean
  readOnly?: boolean
}

export function AttackManager({ pokemon, onUpdate, isMyTeam, readOnly = false }: AttackManagerProps) {
  const isDark = useIsDark();


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

  const handleMoveSelect = (attackId: string, suggestion: SuggestionItem) => {
    const updatedAttacks = pokemon.attacks.map((attack) => {
      if (attack.id === attackId) {
        const movePP = suggestion.metadata?.pp || attack.maxPP
        return { 
          ...attack, 
          name: suggestion.label, 
          type: (suggestion.types?.[0] || attack.type) as any,
          maxPP: movePP,
          currentPP: movePP
        }
      }
      return attack
    })

    onUpdate({
      ...pokemon,
      attacks: updatedAttacks,
    })
  }

  return (
    <div className="mt-1">
      <div 
        className="p-1.5 rounded-lg border"
        style={{ backgroundColor: "var(--bg-side)", borderColor: "var(--border-main)" }}
      >
        <div className="flex flex-col gap-1.5">
          {pokemon.attacks.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {pokemon.attacks.map((attack, index) => {
                const defaultName = getDefaultAttackName(index, isMyTeam)

                return (
                  <div 
                    key={attack.id} 
                    className="border rounded-lg p-2 space-y-1"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-main)" }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex-1 mr-1 h-5 flex items-center min-w-0">
                        {attack.type && (
                          <TypeLiseret types={[attack.type]} className="w-[3px] h-full mr-1" />
                        )}
                        {(() => {
                          const details = getMoveDetails(attack.name);
                          const tooltipContent = details ? (
                            <div className="space-y-1.5 p-1" style={{ color: THEME.tooltips.text }}>
                              <div 
                                className="font-bold text-sm border-b pb-1 flex justify-between items-center gap-4"
                                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
                              >
                                <span>{details.name}</span>
                                <span className="text-[10px] opacity-70 uppercase tracking-wider">{details.type}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span 
                                    className="px-1.5 py-0.5 rounded border text-[10px]"
                                    style={{ 
                                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                        opacity: 0.8
                                    }}
                                >
                                  {details.category}
                                </span>
                                <span 
                                    className="px-1.5 py-0.5 rounded border text-[10px]"
                                    style={{ 
                                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                        opacity: 0.8
                                    }}
                                >
                                  BP: {details.basePower || '--'}
                                </span>
                                <span 
                                    className="px-1.5 py-0.5 rounded border text-[10px]"
                                    style={{ 
                                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                                        opacity: 0.8
                                    }}
                                >
                                  Acc: {details.accuracy === true ? '100' : details.accuracy}%
                                </span>
                                <span 
                                    className="px-1.5 py-0.5 rounded border text-[10px] font-medium"
                                    style={{ 
                                        backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                                        borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"
                                    }}
                                >
                                  Pri: {details.priority > 0 ? `+${details.priority}` : details.priority}
                                </span>
                                {details.flags?.contact && (
                                   <span className="px-1.5 py-0.5 rounded bg-amber-600/20 border border-amber-600/40 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                      Contact
                                   </span>
                                )}
                              </div>
                              <p className="text-[11px] leading-snug italic opacity-85">
                                {details.shortDesc || details.desc}
                              </p>
                            </div>
                          ) : null;

                          return (
                            <AutocompleteEditable
                              value={attack.name}
                              placeholder={defaultName}
                              onChange={(newName) => handleAttackNameChange(attack.id, newName)}
                              getSuggestions={searchMoves}
                              onSuggestionSelect={(suggestion) => handleMoveSelect(attack.id, suggestion)}
                              autoWidth={false}
                              width="100%"
                              fontSize={12}
                              readOnly={readOnly}
                              tooltip={tooltipContent}
                              mainColor={isMyTeam ? THEME.common.ally : THEME.common.opponent}
                              isMyTeam={isMyTeam}
                            />
                          );
                        })()}
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
                        <span className="whitespace-nowrap" style={{ fontSize: "8px", color: "var(--text-dim)" }}>
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
                        <span style={{ color: "var(--text-dim)" }}>/</span>
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
                          mainColor={isMyTeam ? THEME.common.ally : THEME.common.opponent}
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
              className="h-6 text-xs w-full bg-transparent cursor-pointer border-dashed transition-colors"
              style={{ 
                  color: "var(--text-dim)", 
                  borderColor: "var(--border-main)",
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Attack
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
