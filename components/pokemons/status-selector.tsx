"use client"

import { useState } from "react"

import { Minus, Plus } from "lucide-react"

import { exclusiveStatuses, independentStatuses, type PokemonStatus } from "@/lib/logos"

import { Pokemon } from "@/lib/types"
import { CircularButton } from "../shared/circular-button"
import { Counter } from "../shared/counter"


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
    },
  ) => void
}

const ConfusionIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.828 14.828 21 21" />
    <path d="M21 16v5h-5" />
    <path d="m21 3-9 9-4-4-6 6" />
    <path d="M21 8V3h-5" />
  </svg>
)

export function StatusSelector({ pokemon, isMyTeam, onUpdate }: StatusSelectorProps) {
  const [showSleepCounter, setShowSleepCounter] = useState(false)
  const [isCounterMounting, setIsCounterMounting] = useState(false)
  const [showConfusionCounter, setShowConfusionCounter] = useState(false)
  const [isConfusionCounterMounting, setIsConfusionCounterMounting] = useState(false)

  const handleExclusiveStatusClick = (statusType: PokemonStatus) => {
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
      setShowSleepCounter(false)
      setIsCounterMounting(false)
      onUpdate(pokemon.id, isMyTeam, { status: newStatus, sleepCounter: 0 })
    } else {
      onUpdate(pokemon.id, isMyTeam, { status: newStatus })
    }
  }

  const handleIndependentStatusClick = (statusType: "confusion" | "love") => {
    const newValue = !pokemon[statusType]
    if (statusType === "confusion" && !newValue) {
      setShowConfusionCounter(false)
      setIsConfusionCounterMounting(false)
      onUpdate(pokemon.id, isMyTeam, { [statusType]: newValue, confusionCounter: 0 })
    } else {
      onUpdate(pokemon.id, isMyTeam, { [statusType]: newValue })
    }
  }

  const handleToggleSleepCounter = () => {
    if (showSleepCounter) {
      setIsCounterMounting(false)
      setTimeout(() => {
        setShowSleepCounter(false)
        onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0 })
      }, 300)
    } else {
      setShowSleepCounter(true)
      setTimeout(() => setIsCounterMounting(true), 10)
      onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0 })
    }
  }

  const handleCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdate(pokemon.id, isMyTeam, { sleepCounter: numValue })
  }

  const handleCounterValidateEmpty = () => {
    setIsCounterMounting(false)
    setTimeout(() => {
      setShowSleepCounter(false)
      onUpdate(pokemon.id, isMyTeam, { sleepCounter: 0 })
    }, 300)
  }

  const handleToggleConfusionCounter = () => {
    if (showConfusionCounter) {
      setIsConfusionCounterMounting(false)
      setTimeout(() => {
        setShowConfusionCounter(false)
        onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0 })
      }, 300)
    } else {
      setShowConfusionCounter(true)
      setTimeout(() => setIsConfusionCounterMounting(true), 10)
      onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0 })
    }
  }

  const handleConfusionCounterChange = (newValue: string) => {
    const numValue = Number.parseInt(newValue) || 0
    onUpdate(pokemon.id, isMyTeam, { confusionCounter: numValue })
  }

  const handleConfusionCounterValidateEmpty = () => {
    setIsConfusionCounterMounting(false)
    setTimeout(() => {
      setShowConfusionCounter(false)
      onUpdate(pokemon.id, isMyTeam, { confusionCounter: 0 })
    }, 300)
  }

  const statusHeight = 24
  const buttonDiameter = Math.round(statusHeight * 0.9)
  const toggleButtonDiameter = 9
  const counterHeight = 22

  return (
    <div className="flex items-center gap-1 mb-2">
      <span className="text-xs text-gray-600 mr-1">Statut :</span>
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
                  iconRatio={0.6}
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
                      iconRatio={0.7}
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
                    height={counterHeight}
                    fontSizeRatio={0.6}
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
            iconRatio={0.6}
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
                  iconRatio={0.6}
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
                      iconRatio={0.7}
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
                    height={counterHeight}
                    fontSizeRatio={0.6}
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
            iconRatio={0.6}
          />
        )
      })}
    </div>
  )
}
