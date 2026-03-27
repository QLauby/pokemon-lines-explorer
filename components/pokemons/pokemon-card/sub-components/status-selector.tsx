"use client"

import { useState } from "react"

import { Minus, Plus } from "lucide-react"

import { exclusiveStatuses, independentStatuses, type PokemonStatus } from "@/lib/constants/logos-constants"

import { CircularButton } from "@/components/shared/circular-button"
import { Counter } from "@/components/shared/counter"
import { THEME } from "@/lib/constants/color-constants"
import { Pokemon } from "@/types/types"


interface StatusSelectorProps {
  pokemon: Pokemon
  isMyTeam: boolean
  onUpdate: (
    id: string,
    isMyTeam: boolean,
    updates: {
      status?: PokemonStatus
      confusion?: boolean
      love?: boolean
      sleepCounter?: number
      confusionCounter?: number
      toxicCounter?: number
      showSleepCounter?: boolean
      showConfusionCounter?: boolean
      showToxicCounter?: boolean
    },
  ) => void
  readOnly?: boolean
  showLabel?: boolean
  centerItems?: boolean
}


export function StatusSelector({ pokemon, isMyTeam, onUpdate, readOnly = false, showLabel = true, centerItems = false }: StatusSelectorProps) {
  const showSleepCounter = pokemon.showSleepCounter
  const showConfusionCounter = pokemon.showConfusionCounter
  const showToxicCounter = pokemon.showToxicCounter
  const [isCounterMounting, setIsCounterMounting] = useState(showSleepCounter)
  const [isConfusionCounterMounting, setIsConfusionCounterMounting] = useState(showConfusionCounter)
  const [isToxicCounterMounting, setIsToxicCounterMounting] = useState(showToxicCounter)

  // Synchronize mounting state for animations
  if (showSleepCounter !== isCounterMounting) {
      setTimeout(() => setIsCounterMounting(showSleepCounter), 10)
  }
  if (showConfusionCounter !== isConfusionCounterMounting) {
      setTimeout(() => setIsConfusionCounterMounting(showConfusionCounter), 10)
  }
  if (showToxicCounter !== isToxicCounterMounting) {
      setTimeout(() => setIsToxicCounterMounting(showToxicCounter), 10)
  }
  const handleExclusiveStatusClick = (statusType: PokemonStatus) => {
    if (readOnly) return;
    let newStatus: PokemonStatus = null

    if (statusType === "poison" || statusType === "badly-poison") {
      if (pokemon.status === null) {
        newStatus = "poison"
      } else if (pokemon.status === "poison") {
        newStatus = "badly-poison"
      } else if (pokemon.status === "badly-poison") {
        newStatus = null
      } else {
        newStatus = "poison"
      }
    } else {
      newStatus = pokemon.status === statusType ? null : statusType
    }

    const updates: any = { status: newStatus }

    if (pokemon.status === "sleep" && newStatus !== "sleep") {
      setIsCounterMounting(false)
      updates.sleepCounter = 0
      updates.showSleepCounter = false
    }
    
    // Explicitly reset toxic counter if we leave badly-poison
    if (pokemon.status === "badly-poison" && newStatus !== "badly-poison") {
        setIsToxicCounterMounting(false)
        updates.toxicCounter = 0
        updates.showToxicCounter = false
    }

    onUpdate(pokemon.id, isMyTeam, updates)
  }

  const handleIndependentStatusClick = (statusType: "confusion" | "love") => {
    if (readOnly) return;
    const newValue = !pokemon[statusType]
    if (statusType === "confusion" && !newValue) {
      setIsConfusionCounterMounting(false)
      onUpdate(pokemon.id, isMyTeam, { [statusType]: newValue, confusionCounter: 0, showConfusionCounter: false })
    } else {
      onUpdate(pokemon.id, isMyTeam, { [statusType]: newValue })
    }
  }

  const handleToggleSleepCounter = () => {
    if (showSleepCounter) {
      setIsCounterMounting(false)
      setTimeout(() => {
        onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0, showSleepCounter: false })
      }, 300)
    } else {
      onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0, showSleepCounter: true })
    }
  }

  const handleCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdate(pokemon.id, isMyTeam, { sleepCounter: numValue })
  }

  const handleCounterValidateEmpty = () => {
    setIsCounterMounting(false)
    setTimeout(() => {
      onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0, showSleepCounter: false })
    }, 300)
  }

  const handleToggleConfusionCounter = () => {
    if (showConfusionCounter) {
      setIsConfusionCounterMounting(false)
      setTimeout(() => {
        onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0, showConfusionCounter: false })
      }, 300)
    } else {
      onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0, showConfusionCounter: true })
    }
  }

  const handleConfusionCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdate(pokemon.id, isMyTeam, { confusionCounter: numValue })
  }

  const handleConfusionCounterValidateEmpty = () => {
    setIsConfusionCounterMounting(false)
    setTimeout(() => {
      onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0, showConfusionCounter: false })
    }, 300)
  }

  const handleToggleToxicCounter = () => {
    if (showToxicCounter) {
      setIsToxicCounterMounting(false)
      setTimeout(() => {
        onUpdate(pokemon.id, isMyTeam, { toxicCounter: 0, showToxicCounter: false })
      }, 300)
    } else {
      onUpdate(pokemon.id, isMyTeam, { toxicCounter: 0, showToxicCounter: true })
    }
  }

  const handleToxicCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdate(pokemon.id, isMyTeam, { toxicCounter: numValue })
  }

  const handleToxicCounterValidateEmpty = () => {
    setIsToxicCounterMounting(false)
    setTimeout(() => {
      onUpdate(pokemon.id, isMyTeam, { toxicCounter: 0, showToxicCounter: false })
    }, 300)
  }

  const statusHeight = 24
  const buttonDiameter = Math.round(statusHeight * 0.9)
  const toggleButtonDiameter = 10

  return (
    <div className={`flex items-center gap-1 flex-wrap ${centerItems ? "justify-center" : ""}`}>
      {showLabel && <span className="text-xs mr-1" style={{ color: THEME.pokemon_card.status.label }}>Status :</span>}
      {exclusiveStatuses.map(({ type, icon, activeColor, title }) => {
        if (type === "badly-poison") return null

        const isActive =
          type === "poison" ? pokemon.status === "poison" || pokemon.status === "badly-poison" : pokemon.status === type

        const displayColor =
          type === "poison" && pokemon.status === "badly-poison"
            ? exclusiveStatuses.find((s) => s.type === "badly-poison")?.activeColor || activeColor
            : activeColor

        if (type === "sleep") {
          return (
            <div key={type} className={`inline-flex items-center gap-2 ${isActive && !showSleepCounter ? "mr-2" : ""}`}>
              <div className="relative inline-flex items-center">
                <CircularButton
                  isActive={isActive}
                  onClick={() => handleExclusiveStatusClick(type as PokemonStatus)}
                  icon={icon}
                  activeColor={displayColor}
                  title={title}
                  variant="filled"
                  diameter={buttonDiameter}
                  readOnly={readOnly}
                />

                {isActive && (
                  <div className="absolute -bottom-1 -right-2">
                    <CircularButton
                      isActive={false}
                      onClick={handleToggleSleepCounter}
                      icon={showSleepCounter ? Minus : Plus}
                      activeColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      inactiveColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      title={showSleepCounter ? "Hide counter" : "Show counter"}
                      diameter={toggleButtonDiameter}
                      iconRatio={0.8}
                      variant="filled"
                      style={{
                        "--toggle-bg": THEME.pokemon_card.status.toggle_plus,
                        "--toggle-text": THEME.pokemon_card.status.toggle_text,
                        "--toggle-hover": THEME.pokemon_card.status.toggle_plus, // Using same for hover or a variant
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>

              {showSleepCounter && isActive && (
                <div
                  className={`flex items-center transition-all duration-300 ease-in-out ${
                    isCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
                  }`}
                >
                  <Counter
                    value={(pokemon.sleepCounter || 0).toString()}
                    onChange={handleCounterChange}
                    onValidateEmpty={handleCounterValidateEmpty}
                    min={0}
                    max={4}
                    doubleClickStep={2}
                    autoSelectOnClick={true}
                    defaultValue="0"
                    placeholder="0"
                    autoWidth={true}
                    rounded={false}
                    mode="text"
                    visualMode="border"
                    mainColor={THEME.pokemon_card.status.counter_text}
                    darkTextColor={THEME.common.black}
                    lightTextColor={THEME.common.white}
                    transitionDuration="0.3s"
                  />
                </div>
              )}
            </div>
          )
        }

        if (type === "poison") {
          const isBadlyPoisoned = pokemon.status === "badly-poison"
          return (
            <div key={type} className={`inline-flex items-center gap-2 ${isActive && !showToxicCounter ? "mr-2" : ""}`}>
              <div className="relative inline-flex items-center">
                <CircularButton
                  isActive={isActive}
                  onClick={() => handleExclusiveStatusClick(type as PokemonStatus)}
                  icon={icon}
                  activeColor={displayColor}
                  title={isBadlyPoisoned ? "Badly Poisoned" : title}
                  variant="filled"
                  diameter={buttonDiameter}
                  readOnly={readOnly}
                />

                {isBadlyPoisoned && (
                  <div className="absolute -bottom-1 -right-2">
                    <CircularButton
                      isActive={false}
                      onClick={handleToggleToxicCounter}
                      icon={showToxicCounter ? Minus : Plus}
                      activeColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      inactiveColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      title={showToxicCounter ? "Hide counter" : "Show counter"}
                      diameter={toggleButtonDiameter}
                      iconRatio={0.8}
                      variant="filled"
                      style={{
                        "--toggle-bg": THEME.pokemon_card.status.toggle_plus,
                        "--toggle-text": THEME.pokemon_card.status.toggle_text,
                        "--toggle-hover": THEME.pokemon_card.status.toggle_plus,
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>

              {showToxicCounter && isBadlyPoisoned && (
                <div
                  className={`flex items-center transition-all duration-300 ease-in-out ${
                    isToxicCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
                  }`}
                >
                  <Counter
                    value={(pokemon.toxicCounter || 0).toString()}
                    onChange={handleToxicCounterChange}
                    onValidateEmpty={handleToxicCounterValidateEmpty}
                    min={1}
                    max={15}
                    doubleClickStep={2}
                    autoSelectOnClick={true}
                    defaultValue="1"
                    placeholder="1"
                    autoWidth={true}
                    rounded={false}
                    mode="text"
                    visualMode="border"
                    mainColor={THEME.pokemon_card.status.counter_text}
                    darkTextColor={THEME.common.black}
                    lightTextColor={THEME.common.white}
                    transitionDuration="0.3s"
                  />
                </div>
              )}
            </div>
          )
        }

        return (
          <CircularButton
            key={type}
            isActive={isActive}
            onClick={() => handleExclusiveStatusClick(type as PokemonStatus)}
            icon={icon}
            activeColor={displayColor}
            title={title}
            variant="filled"
            diameter={buttonDiameter}
            readOnly={readOnly}
          />
        )
      })}
      {independentStatuses.map(({ type, icon, activeColor, title }) => {
        if (type === "confusion") {
          const isActive = pokemon.confusion
          return (
            <div
              key={type}
              className={`inline-flex items-center gap-2 ${isActive && !showConfusionCounter ? "mr-2" : ""}`}
            >
              <div className="relative inline-flex items-center">
                <CircularButton
                  isActive={isActive}
                  onClick={() => handleIndependentStatusClick(type as "confusion" | "love")}
                  icon={icon}
                  activeColor={activeColor}
                  title={title}
                  variant="filled"
                  diameter={buttonDiameter}
                />

                {isActive && (
                  <div className="absolute -bottom-1 -right-2">
                    <CircularButton
                      isActive={false}
                      onClick={handleToggleConfusionCounter}
                      icon={showConfusionCounter ? Minus : Plus}
                      activeColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      inactiveColor="bg-[var(--toggle-bg)] text-[var(--toggle-text)] hover:bg-[var(--toggle-hover)]"
                      title={showConfusionCounter ? "Hide counter" : "Show counter"}
                      diameter={toggleButtonDiameter}
                      iconRatio={0.8}
                      variant="filled"
                      style={{
                        "--toggle-bg": THEME.pokemon_card.status.toggle_plus,
                        "--toggle-text": THEME.pokemon_card.status.toggle_text,
                        "--toggle-hover": THEME.pokemon_card.status.toggle_plus,
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>

              {showConfusionCounter && isActive && (
                <div
                  className={`flex items-center transition-all duration-300 ease-in-out ${
                    isConfusionCounterMounting
                      ? "opacity-100 translate-x-0 scale-100"
                      : "opacity-0 -translate-x-2 scale-95"
                  }`}
                >
                  <Counter
                    value={(pokemon.confusionCounter || 0).toString()}
                    onChange={handleConfusionCounterChange}
                    onValidateEmpty={handleConfusionCounterValidateEmpty}
                    min={0}
                    max={4}
                    doubleClickStep={2}
                    autoSelectOnClick={true}
                    defaultValue="0"
                    placeholder="0"
                    autoWidth={true}
                    rounded={false}
                    mode="text"
                    visualMode="border"
                    mainColor={THEME.pokemon_card.status.counter_text}
                    darkTextColor={THEME.common.black}
                    lightTextColor={THEME.common.white}
                    transitionDuration="0.3s"
                  />
                </div>
              )}
            </div>
          )
        }

        return (
          <CircularButton
            key={type}
            isActive={pokemon[type as "confusion" | "love"]}
            onClick={() => handleIndependentStatusClick(type as "confusion" | "love")}
            icon={icon}
            activeColor={activeColor}
            title={title}
            variant="filled"
            diameter={buttonDiameter}
          />
        )
      })}
    </div>
  )
}
