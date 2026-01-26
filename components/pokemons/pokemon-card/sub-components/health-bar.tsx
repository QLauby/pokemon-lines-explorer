"use client"

import { EditableText } from "@/components/shared/editable-text"
import { Pokemon } from "@/types/types"
import { useEffect, useRef, useState } from "react"

interface HealthBarProps {
  pokemon?: Pokemon
  isMyTeam?: boolean
  onUpdate?: (id: string, isMyTeam: boolean, newHP: number) => void
  hpPercent?: number
  showText?: boolean
  editable?: boolean
}

export function HealthBar({
  pokemon,
  isMyTeam,
  onUpdate,
  hpPercent: propHpPercent,
  showText = true,
  editable = false,
}: HealthBarProps) {
  const hpPercent = pokemon?.hpPercent ?? propHpPercent ?? 0
  const [inputValue, setInputValue] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isEditing])

  const getHealthColor = (hp: number) => {
    if (hp < 20) return "bg-red-500"
    if (hp < 50) return "bg-orange-500"
    return "bg-green-500"
  }

  const handleHpPercentChange = (newValue: string) => {
    if (!pokemon || !onUpdate || isMyTeam === undefined) return

    const numericValue = Number.parseFloat(newValue)
    if (!isNaN(numericValue)) {
      const percentageValue = numericValue * 100 // Conversion fraction vers pourcentage
      const clampedValue = Math.max(0, Math.min(100, percentageValue))
      onUpdate(pokemon.id, isMyTeam!, clampedValue)
    }
  }

  return (
    <div className="flex items-center w-full">
      {showText && <span className="text-xs font-medium text-gray-600 w-6 flex-shrink-0">HP</span>}

      <div className="flex items-center flex-1">
        <div className="flex items-center h-6 flex-1">
          <div className="bg-gray-200 rounded-full h-2 w-full">
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-in-out ${getHealthColor(hpPercent)}`}
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        </div>

        {showText && editable && pokemon && onUpdate && isMyTeam !== undefined ? (
          <div className="ml-2 flex-shrink-0 h-6 flex items-center">
            <EditableText
              value={(hpPercent / 100).toString()}
              onChange={handleHpPercentChange}
              type="number"
              numberMode="percent"
              min={0}
              max={1}
              decimals={1}
              defaultValue="1"
              placeholder="ex : 0.596 ou = 127/213"
              placeholderFirst={true}
              autoWidth={false}
              width="65px"
              editWidth="144px"
              fontSize={10}
              fontSizeRatio={0.4}
              rounded={true}
              textAlign="center"
            />
          </div>
        ) : showText ? (
          <span className="text-xs font-medium w-12 text-center ml-2 flex-shrink-0 h-6 flex items-center justify-center">
            {hpPercent.toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  )
}
