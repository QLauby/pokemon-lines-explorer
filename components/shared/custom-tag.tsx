"use client"

import type React from "react"
import { useState } from "react"

import { Minus, Plus } from "lucide-react"

import { CircularButton } from "./circular-button"
import { Counter } from "./counter"
import { EditableText } from "./editable-text"

interface CustomTagProps {
  tag: string
  onUpdate: (newTag: string) => void
  onDelete: () => void
  buttonSize?: number
  autoSelectOnClick?: boolean
  defaultValue?: string
  placeholder?: string
  fontSize?: string | number
  fontSizeRatio?: number
  rounded?: boolean
  mode?: "text" | "button"
  visualMode?: "default" | "border"
  className?: string
  inputClassName?: string
  displayClassName?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  mainColor?: string
  darkTextColor?: string
  lightTextColor?: string
  transitionDuration?: string
}

export function CustomTag({
  tag,
  onUpdate,
  onDelete,
  buttonSize = 4.5,
  autoSelectOnClick = true,
  defaultValue,
  placeholder,
  fontSize = 12,
  fontSizeRatio = 0.4, // Small text for tags
  rounded = true,
  mode = "button",
  visualMode = "default",
  className,
  inputClassName,
  displayClassName,
  style,
  inputStyle,
  mainColor = "#6B7280", // gray-500
  darkTextColor = "#000000", // Black for dark text
  lightTextColor = "#FFFFFF", // White for light text
  transitionDuration = "0.3s", // Faster transition for tags
}: CustomTagProps) {
  const [showCounter, setShowCounter] = useState(false)
  const [counterValue, setCounterValue] = useState("0") // Default to "0" instead of ""
  const [isCounterMounting, setIsCounterMounting] = useState(false)

  const counterFontSizeRatio = fontSizeRatio * 1.5 > 1 ? 1 : fontSizeRatio * 1.5

  const numericFontSize = typeof fontSize === "number" ? fontSize : Number.parseFloat(fontSize as string) || 12
  const numericHeight = numericFontSize / fontSizeRatio
  const buttonDiameter = 10

  const handleTagChange = (newValue: string) => {
    if (newValue.trim() === "") {
      onDelete()
    } else {
      onUpdate(newValue.trim())
    }
  }

  const handleToggleCounter = () => {
    if (showCounter) {
      setIsCounterMounting(false)
      setTimeout(() => {
        setShowCounter(false)
        setCounterValue("0")
      }, 300)
    } else {
      setShowCounter(true)
      setTimeout(() => setIsCounterMounting(true), 10)
      setCounterValue("0")
    }
  }

  const handleCounterChange = (newValue: string) => {
    setCounterValue(newValue)
  }

  const handleCounterValidateEmpty = () => {
    setIsCounterMounting(false)
    setTimeout(() => {
      setShowCounter(false)
      setCounterValue("0")
    }, 300)
  }

  return (
    <div className={`relative inline-flex items-center ${showCounter ? "mr-1" : "mr-3"}`}>
      <div className="inline-flex items-center">
        <div className="relative inline-flex items-center">
          <EditableText
            value={tag}
            onChange={handleTagChange}
            type="text" // Forced to text
            autoSelectOnClick={autoSelectOnClick}
            allowEmpty={true} // Allow empty to trigger deletion
            defaultValue={defaultValue || "Tag"}
            placeholder={placeholder || defaultValue || "Tag"}
            autoWidth={true} // Always auto width for tags
            fontSize={numericFontSize}
            fontSizeRatio={fontSizeRatio}
            rounded={rounded}
            mode={mode}
            textAlign="center" // Center text for tags
            visualMode={visualMode}
            placeholderFirst={false} // Start with current value, not empty
            className={className}
            inputClassName={inputClassName}
            displayClassName={displayClassName}
            style={style}
            inputStyle={inputStyle}
            mainColor={mainColor}
            darkTextColor={darkTextColor}
            lightTextColor={lightTextColor}
            transitionDuration={transitionDuration}
          />

          <div className="absolute -bottom-1 -right-2">
            <CircularButton
              isActive={false}
              onClick={handleToggleCounter}
              icon={showCounter ? Minus : Plus}
              activeColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
              inactiveColor="bg-gray-200 text-gray-600 hover:bg-gray-300"
              title={showCounter ? "Masquer le compteur" : "Afficher le compteur"}
              diameter={buttonDiameter}
              iconRatio={0.7}
              variant="filled"
            />
          </div>
        </div>

        {showCounter && (
          <div
            className={`ml-2 flex items-center transition-all duration-300 ease-in-out ${
              isCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
            }`}
          >
            <Counter
              value={counterValue}
              onChange={handleCounterChange}
              onValidateEmpty={handleCounterValidateEmpty}
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
    </div>
  )
}
