"use client"

import { useState } from "react"

import { Minus, Plus } from "lucide-react"

import { exclusiveStatuses, independentStatuses, type PokemonStatus } from "@/lib/constants/logos-constants"

import { CircularButton } from "@/components/shared/circular-button"
import { Counter } from "@/components/shared/counter"
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
      showSleepCounter?: boolean
      showConfusionCounter?: boolean
    },
  ) => void
  readOnly?: boolean
  showLabel?: boolean
  centerItems?: boolean
}


export function StatusSelector({ pokemon, isMyTeam, onUpdate, readOnly = false, showLabel = true, centerItems = false }: StatusSelectorProps) {
  const showSleepCounter = pokemon.showSleepCounter
  const showConfusionCounter = pokemon.showConfusionCounter
  const [isCounterMounting, setIsCounterMounting] = useState(showSleepCounter)
  const [isConfusionCounterMounting, setIsConfusionCounterMounting] = useState(showConfusionCounter)

  // Synchronize mounting state for animations
  if (showSleepCounter !== isCounterMounting) {
      setTimeout(() => setIsCounterMounting(showSleepCounter), 10)
  }
  if (showConfusionCounter !== isConfusionCounterMounting) {
      setTimeout(() => setIsConfusionCounterMounting(showConfusionCounter), 10)
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

    if (statusType === "sleep" && newStatus !== "sleep") {
      setIsCounterMounting(false)
      onUpdate(pokemon.id, isMyTeam, { status: newStatus, sleepCounter: 0, showSleepCounter: false })
    } else {
      onUpdate(pokemon.id, isMyTeam, { status: newStatus })
    }
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

  const statusHeight = 24
  const buttonDiameter = Math.round(statusHeight * 0.9)
  const toggleButtonDiameter = 10
  const counterHeight = 22

  return (
    <div className={`flex items-center gap-1 flex-wrap ${centerItems ? "justify-center" : ""}`}>
      {showLabel && <span className="text-xs text-gray-600 mr-1">Statut :</span>}
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
                      activeColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
                      inactiveColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
                      title={showSleepCounter ? "Masquer le compteur" : "Afficher le compteur"}
                      diameter={toggleButtonDiameter}
                      iconRatio={0.8}
                      variant="filled"
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
                    mainColor="#6B7280"
                    darkTextColor="#000000"
                    lightTextColor="#FFFFFF"
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
            title={pokemon.status === "badly-poison" && type === "poison" ? "Badly Poisoned" : title}
            variant="filled"
            diameter={buttonDiameter}
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
                      activeColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
                      inactiveColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
                      title={showConfusionCounter ? "Masquer le compteur" : "Afficher le compteur"}
                      diameter={toggleButtonDiameter}
                      iconRatio={0.8}
                      variant="filled"
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
                    mainColor="#6B7280"
                    darkTextColor="#000000"
                    lightTextColor="#FFFFFF"
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
