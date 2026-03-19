"use client"

import type React from "react"
import { useEffect, useState } from "react"

import { CustomTagData } from "@/types/types"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils/cn"
import { CircularButton } from "./circular-button"
import { Counter } from "./counter"
import { EditableText } from "./editable-text"

import { THEME } from "@/lib/constants/color-constants"

interface CustomTagProps {
  tag: CustomTagData
  onUpdate: (newTag: CustomTagData) => void
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
  toggleColor?: string
  counterColor?: string
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
  mainColor,
  toggleColor,
  counterColor,
  darkTextColor = THEME.common.black,
  lightTextColor = THEME.common.white,
  transitionDuration = "0.3s",
  readOnly = false,
}: CustomTagProps) {
  const namePart = tag.name
  const counterValue = String(tag.count ?? "0")
  const showCounter = tag.showCount

  const [isCounterMounting, setIsCounterMounting] = useState(showCounter)

  useEffect(() => {
    setIsCounterMounting(showCounter)
  }, [showCounter])

  const handleTagChange = (newValue: string) => {
    const trimmed = newValue.trim()
    if (trimmed === "") {
      onDelete()
    } else {
      onUpdate({ ...tag, name: trimmed })
    }
  }

  const handleToggleCounter = () => {
    if (showCounter) {
      setIsCounterMounting(false)
      setTimeout(() => {
        onUpdate({ ...tag, showCount: false, count: 0 })
      }, 300)
    } else {
      setTimeout(() => setIsCounterMounting(true), 10)
      onUpdate({ ...tag, showCount: true, count: 0 })
    }
  }

  const handleCounterChange = (newValue: string) => {
    const val = parseInt(newValue) || 0
    onUpdate({ ...tag, count: val })
  }

  const handleCounterValidateEmpty = () => {
    setIsCounterMounting(false)
    setTimeout(() => {
      onUpdate({ ...tag, showCount: false, count: 0 })
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
            mainColor={mainColor}
            readOnly={readOnly}
          />

          <div className="absolute -bottom-1 -right-2">
            {!readOnly ? (
               <CircularButton
                isActive={!!toggleColor}
                onClick={handleToggleCounter}
                icon={showCounter ? Minus : Plus}
                activeColor={toggleColor || ""}
                 inactiveColor={toggleColor ? "bg-[var(--toggle-color)]" : "bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-bg)]"}
                 title={showCounter ? "Masquer le compteur" : "Afficher le compteur"}
                 diameter={buttonDiameter}
                 iconRatio={0.7}
                 variant="filled"
                 style={{
                    "--btn-bg": THEME.pokemon_card.status.toggle_plus,
                    "--btn-text": THEME.pokemon_card.status.toggle_text,
                    "--toggle-color": toggleColor,
                 } as React.CSSProperties}
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
                className={cn("font-medium select-none flex items-center justify-center -translate-y-[0.5px]")} 
                style={{ fontSize: numericFontSize, height: numericFontSize / fontSizeRatio, width: "8px", color: counterColor || THEME.pokemon_card.header.expand_icon }}
               >
                :
               </div>
            )}
            {readOnly ? (
              <div 
                className={cn("font-medium select-none flex items-center justify-center translate-y-[-0.5px]")}
                style={{ 
                    fontSize: numericFontSize, 
                    height: numericFontSize / fontSizeRatio, 
                    color: counterColor || THEME.pokemon_card.status.counter_text
                }}
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
                mainColor={counterColor || THEME.pokemon_card.status.counter_text}
                darkTextColor={counterColor || THEME.common.black}
                lightTextColor={THEME.common.white}
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
