"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils/cn"
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
  readOnly?: boolean
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
  fontSizeRatio = 0.55, // Adjusted to prevent vertical truncation
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
  readOnly = false,
}: CustomTagProps) {
  // Parse tag for counter: "Name:Value"
  const splitIndex = tag.lastIndexOf(":")
  const namePart = useMemo(() => splitIndex !== -1 ? tag.substring(0, splitIndex) : tag, [tag, splitIndex])
  const counterPart = useMemo(() => splitIndex !== -1 ? tag.substring(splitIndex + 1) : "0", [tag, splitIndex])
  const hasCounter = splitIndex !== -1

  const [showCounter, setShowCounter] = useState(hasCounter)
  const [counterValue, setCounterValue] = useState(counterPart)
  const [isCounterMounting, setIsCounterMounting] = useState(hasCounter)

  // Sync internal state with prop changes (prevents full re-render flickering)
  useEffect(() => {
    if (counterPart !== counterValue) {
      setCounterValue(counterPart)
    }
    if (hasCounter !== showCounter) {
      setShowCounter(hasCounter)
      setIsCounterMounting(hasCounter)
    }
  }, [tag, counterPart, hasCounter])

  const handleTagChange = (newValue: string) => {
    const trimmed = newValue.trim()
    if (trimmed === "") {
      onDelete()
    } else {
      // If we have a counter, persist it
      const finalValue = showCounter ? `${trimmed}:${counterValue}` : trimmed
      onUpdate(finalValue)
    }
  }

  const handleToggleCounter = () => {
    if (showCounter) {
      setIsCounterMounting(false)
      setTimeout(() => {
        setShowCounter(false)
        setCounterValue("0")
        // Persist name only
        onUpdate(namePart)
      }, 300)
    } else {
      setShowCounter(true)
      setTimeout(() => setIsCounterMounting(true), 10)
      setCounterValue("0")
      // Persist with zero counter
      onUpdate(`${namePart}:0`)
    }
  }

  const handleCounterChange = (newValue: string) => {
    setCounterValue(newValue)
    onUpdate(`${namePart}:${newValue}`)
  }

  const handleCounterValidateEmpty = () => {
    setIsCounterMounting(false)
    setTimeout(() => {
      setShowCounter(false)
      setCounterValue("0")
      onUpdate(namePart)
    }, 300)
  }

  const numericFontSize = typeof fontSize === "number" ? fontSize : Number.parseFloat(fontSize as string) || 12
  const buttonDiameter = 10

  return (
    <div className={cn(
      "relative inline-flex items-center",
      showCounter ? (readOnly ? "mr-1" : "mr-1") : (readOnly ? "mr-1.5" : "mr-3"),
      "leading-none"
    )}>
      <div className="inline-flex items-center">
        <div className="relative inline-flex items-center">
          <EditableText
            value={namePart}
            onChange={handleTagChange}
            type="text"
            autoSelectOnClick={autoSelectOnClick}
            allowEmpty={true}
            defaultValue={defaultValue || "Tag"}
            placeholder={placeholder || defaultValue || "Tag"}
            autoWidth={true}
            fontSize={numericFontSize}
            fontSizeRatio={fontSizeRatio}
            rounded={rounded}
            mode={mode}
            textAlign="center"
            style={style}
            readOnly={readOnly}
          />

          <div className="absolute -bottom-1 -right-2">
            {!readOnly ? (
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
            ) : showCounter && (
               null
            )}
          </div>
        </div>

        {showCounter && (
          <div
            className={cn(
               "flex items-center transition-all duration-300 ease-in-out",
               readOnly ? "ml-0" : "ml-2",
               isCounterMounting ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-2 scale-95"
            )}
          >
            {readOnly && (
               <div 
                className="font-medium text-gray-400 select-none flex items-center justify-center -translate-y-[0.5px]" 
                style={{ fontSize: numericFontSize, height: numericFontSize / fontSizeRatio, width: "8px" }}
               >
                :
               </div>
            )}
            {readOnly ? (
              <div 
                className="font-medium text-gray-900 select-none flex items-center justify-center translate-y-[-0.5px]"
                style={{ fontSize: numericFontSize, height: numericFontSize / fontSizeRatio }}
              >
                {counterValue}
              </div>
            ) : (
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
                readOnly={false}
                fontSize={numericFontSize}
                fontSizeRatio={fontSizeRatio}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
