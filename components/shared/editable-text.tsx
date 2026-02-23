"use client"

import { Input } from "@/components/ui/input"
import type React from "react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils/cn"
import { darkenColor, getTextColorForBackground, lightenColor } from "@/lib/utils/colors-utils"
import { floatToFraction } from "@/lib/utils/math-utils"


interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  type?: "text" | "number"
  numberMode?: "integer" | "float" | "percent"
  min?: number
  max?: number
  dynamicMax?: () => number
  decimals?: number
  autoSelectOnClick?: boolean
  allowEmpty?: boolean
  defaultValue?: string
  placeholder?: string
  autoWidth?: boolean
  width?: string | number
  editWidth?: string | number
  fontSize?: string | number
  fontSizeRatio?: number
  fontWeight?: React.CSSProperties["fontWeight"]
  rounded?: boolean
  mode?: "text" | "button"
  textAlign?: "left" | "center" | "right"
  visualMode?: "default" | "border"
  emptyInputAtFocus?: boolean
  startInEditMode?: boolean
  placeholderFirst?: boolean
  onCancel?: () => void
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
  rawEquationString?: string
  onEquationChange?: (eq: string | undefined) => void
}

const DEFAULT_TEXT_IF_VOID = "Click to edit ..."
const DEFAULT_MAIN_COLOR = "#E0E0E0"
const DEFAULT_DARK_TEXT_COLOR = "#000000"
const DEFAULT_LIGHT_TEXT_COLOR = "#ffffff"
const DEFAULT_TRANSITION_DURATION = "0.8s"

const evaluateExpression = (expr: string): number | null => {
  if (typeof expr !== "string") return null
  const allowed = /^[0-9+*/()\s.,%-]+$/
  if (!allowed.test(expr)) return null
  let transformed = expr.replace(/,/g, ".")
  transformed = transformed.replace(/(\\d+(?:\\.\\d+)?)%/g, "($1/100)")
  try {
    const fn = new Function(`return (${transformed})`)
    const res = fn()
    if (typeof res === "number" && Number.isFinite(res)) return res
    return null
  } catch (e) {
    return null
  }
}



export function EditableText({
  value,
  onChange,
  type = "text",
  numberMode,
  min,
  max,
  dynamicMax,
  decimals = 1,
  autoSelectOnClick = true,
  allowEmpty = false,
  defaultValue,
  placeholder,
  width = "120px",
  autoWidth = false,
  editWidth,
  fontSize = 16,
  fontSizeRatio = 0.6,
  fontWeight,
  rounded = false,
  mode = "text",
  textAlign = "left",
  visualMode = "default",
  emptyInputAtFocus = false,
  startInEditMode = false,
  placeholderFirst = false,
  onCancel,
  className,
  inputClassName,
  displayClassName,
  style,
  inputStyle,
  mainColor = DEFAULT_MAIN_COLOR,
  darkTextColor = DEFAULT_DARK_TEXT_COLOR,
  lightTextColor = DEFAULT_LIGHT_TEXT_COLOR,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
  readOnly = false,
  rawEquationString,
  onEquationChange,
}: EditableTextProps) {
  // 1. Hook State
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState("")
  const [currentWidth, setCurrentWidth] = useState<string | number>(width)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isInitialMount, setIsInitialMount] = useState(true)
  const [hasRendered, setHasRendered] = useState(false)
  const [isInDelayedTransition, setIsInDelayedTransition] = useState(false)

  // 2. Refs
  const prevValueRef = useRef<string>(value)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const measurerRef = useRef<HTMLSpanElement | null>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)

  // 3. Constants & Derived State
  const resolvedDefault = defaultValue || (type === "number" ? "0" : DEFAULT_TEXT_IF_VOID)
  const resolvedPlaceholder = placeholder ?? resolvedDefault
  const resolvedNumberMode: "integer" | "float" | "percent" | undefined =
    type === "number" ? (numberMode ?? "integer") : undefined
  const resolvedMin: number | undefined = min
  const resolvedMax: number | undefined = dynamicMax ? dynamicMax() : max
  const resolvedDecimals = decimals

  const darkenedMainColor = darkenColor(mainColor, 10)
  const lightenedMainColor = lightenColor(mainColor, 95)

  const numericFontSizePx = useMemo(() => {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") return Number.parseFloat(fontSize) || 16
    return 16
  }, [fontSize])

  const numericHeightPx = numericFontSizePx / fontSizeRatio
  const calculatedHeight = `${numericHeightPx}px`
  const calculatedFontSize = `${numericFontSizePx}px`

  const verticalSpacePx = Math.max(0, numericHeightPx - numericFontSizePx)
  const verticalPaddingPx = Math.max(0, Math.floor(verticalSpacePx / 2))
  // Proportional horizontal padding based on vertical padding
  const baseHorizontalPaddingPx = Math.max(Math.round(verticalPaddingPx * 1.3), 2)
  const horizontalPaddingPx = rounded
    ? Math.max(baseHorizontalPaddingPx + Math.round(numericHeightPx * 0.15), 2)
    : baseHorizontalPaddingPx

  const borderRadiusPx = rounded ? Math.round(numericHeightPx / 2) : Math.round(numericHeightPx * 0.125)
  const borderRadius = `${borderRadiusPx}px`

  const textStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: calculatedFontSize,
    lineHeight: "normal",
    minHeight: calculatedHeight,
    height: calculatedHeight,
    textAlign: textAlign,
    fontWeight: fontWeight,
    ...style,
  }

  const commonWidthStyle: React.CSSProperties = {
    width: currentWidth,
  }

  const alignmentStyle: React.CSSProperties = { textAlign: textAlign }

  const shouldAnimate =
    isTransitioning || (hasRendered && (autoWidth || (!autoWidth && editWidth !== undefined && editWidth !== width)))

  const transitionStyle = {
    transition: shouldAnimate ? `width ${transitionDuration}` : "none",
  }

  const defaultFontWeightClass = fontWeight ? "" : (mode === "button" ? "font-semibold" : "font-normal")
  const finalClassName = cn(defaultFontWeightClass, className)

  const effectiveType = type === "number" ? "text" : type
  const effectiveInputMode = type === "number" ? "decimal" : undefined
  let effectivePattern = undefined
  if (type === "number") {
    if (resolvedNumberMode === "integer") {
      effectivePattern = "[0-9+-]*"
    } else if (resolvedNumberMode === "percent") {
      effectivePattern = "[0-9.,+*/()=\\s-]*"
    } else {
      effectivePattern = "[0-9.,+-]*"
    }
  }

  // Calculate display text for render
  let displayText = value === "" ? defaultValue || resolvedPlaceholder : value
  const isPlaceholderLook = value === ""

  if (type === "number" && value !== "") {
    const numeric = Number(String(value).replace(",", "."))
    if (Number.isFinite(numeric)) {
      if (resolvedNumberMode === "percent") {
        const pct = numeric * 100
        displayText = `${pct.toFixed(resolvedDecimals).replace(".", ",")} %`
      } else if (resolvedNumberMode === "float") {
        displayText = `${numeric.toFixed(resolvedDecimals).replace(".", ",")}`
      } else {
        displayText = `${Math.trunc(numeric)}`
      }
    } else {
      displayText = resolvedPlaceholder
    }
  }

  // 4. Effects
  useLayoutEffect(() => {
    if (!autoWidth) return

    const measurer = measurerRef.current
    if (!measurer) return

    const textToMeasure = isEditing
      ? editingValue === ""
        ? resolvedPlaceholder
        : editingValue
      : displayText || " "

    measurer.textContent = textToMeasure
    const textWidth = Math.ceil(measurer.getBoundingClientRect().width)
    const finalPaddingPx = horizontalPaddingPx
    const SAFETY_OFFSET_PX = 4 // Consistent safety offset
    const computedWidth = textWidth + Math.ceil(finalPaddingPx * 2) + SAFETY_OFFSET_PX
    const calculatedWidth = Math.max(Math.ceil(computedWidth), 1)

    if (isInitialMount) {
      setCurrentWidth(calculatedWidth)
      setIsInitialMount(false)
      setTimeout(() => setHasRendered(true), 0)
    } else if (!isInDelayedTransition) {
      if (hasRendered && isEditing) {
        setIsTransitioning(true)
        setCurrentWidth(calculatedWidth)
      } else if (!isEditing) {
        setCurrentWidth(calculatedWidth)
      }
    }
  }, [
    autoWidth,
    value,
    editingValue,
    isEditing,
    resolvedPlaceholder,
    width,
    horizontalPaddingPx,
    isInitialMount,
    hasRendered,
    isInDelayedTransition,
    displayClassName,
    fontSize,
    numericFontSizePx,
    fontWeight,
    mode,
    style,
    fontSizeRatio,
  ])

  useEffect(() => {
    if (!isEditing && !autoWidth) {
      setCurrentWidth(width)
    }
  }, [width, isEditing, autoWidth])

  useEffect(() => {
    if (isTransitioning) {
      const endTimer = setTimeout(
        () => {
          setIsTransitioning(false)
          setIsInDelayedTransition(false)
        },
        Number.parseFloat(transitionDuration) * 1000,
      )
      return () => clearTimeout(endTimer)
    }
  }, [isTransitioning, transitionDuration])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (autoSelectOnClick && !emptyInputAtFocus) inputRef.current.select()
    }
  }, [isEditing, autoSelectOnClick, emptyInputAtFocus])

  // 5. Functions
  const getDisplayStyles = () => {
    if (visualMode === "default") {
      if (mode === "button") {
        const textColor = getTextColorForBackground(mainColor, darkTextColor, lightTextColor)
        const hoverTextColor = getTextColorForBackground(darkenedMainColor, darkTextColor, lightTextColor)
        return {
          backgroundColor: mainColor,
          color: textColor,
          border: `1px solid ${mainColor}`,
          hover: {
            backgroundColor: darkenedMainColor,
            color: hoverTextColor,
            border: `1px solid ${darkenedMainColor}`,
          },
        }
      }
      return {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: "1px solid transparent",
        hover: {
          backgroundColor: mainColor,
          color: getTextColorForBackground(mainColor, darkTextColor, lightTextColor),
          border: `1px solid ${mainColor}`,
        },
      }
    }
    if (mode === "button") {
      return {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: `1px solid ${mainColor}`,
        hover: {
          backgroundColor: lightenedMainColor,
          color: darkTextColor,
          border: `1px solid ${mainColor}`,
        },
      }
    }
    return {
      backgroundColor: "transparent",
      color: darkTextColor,
      border: "1px solid transparent",
      hover: {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: `1px solid ${mainColor}`,
      },
    }
  }

  const getEditingStyles = () => {
    const editingBackgroundColor = "white"
    return {
      backgroundColor: editingBackgroundColor,
      border: `1px solid ${mainColor}`,
      color: darkTextColor,
    }
  }

  const startEditing = () => {
    prevValueRef.current = value
    let initialValue = ""
    if (placeholderFirst || emptyInputAtFocus) {
      initialValue = ""
    } else {
      if (rawEquationString) {
          initialValue = rawEquationString
      } else {
          initialValue = type === "number" && (value === "" || value == null) ? resolvedDefault : value
          if (resolvedNumberMode === "percent" && initialValue !== "") {
              const num = Number(initialValue.replace(",", "."))
              if (!isNaN(num)) {
                  initialValue = String(Math.round(num * 100 * 10) / 10).replace(".", ",")
              }
          }
      }
    }

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      setCurrentWidth(width)
      setIsEditing(true)
      setEditingValue(initialValue)
      setIsHovered(false)
      requestAnimationFrame(() => {
        setIsTransitioning(true)
        setCurrentWidth(editWidth)
      })
    } else {
      setIsEditing(true)
      setEditingValue(initialValue)
      setIsHovered(false)
    }
  }

  const handleStartEditing = () => {
    if (readOnly) return
    startEditing()
  }

  const finishEditing = () => {
    const current = editingValue
    let final: string

    if (current === "" || current.trim() === "") {
      if (placeholderFirst || emptyInputAtFocus) {
        final = prevValueRef.current
      } else {
        if (!allowEmpty) {
          toast.error("Erreur", { description: "You cannot enter an empty input" })
          cancelEditing()
          return
        }
        final = ""
      }
    } else {
      if (type === "number") {
        let numericValue: number | null = null
        if (current.trim().startsWith("=")) {
          numericValue = evaluateExpression(current.trim().slice(1))
        } else {
          numericValue = Number(current.replace(",", ".").trim())
        }
        if (numericValue === null || !Number.isFinite(numericValue)) {
          final = prevValueRef.current
        } else {
          if (resolvedNumberMode === "percent" && !current.trim().startsWith("=") && Number.isFinite(numericValue)) {
            numericValue = numericValue / 100
          }
          
          let clamped = numericValue as number
          if (resolvedNumberMode === "integer") clamped = Math.trunc(clamped)
          if (typeof resolvedMin === "number" && clamped < resolvedMin) clamped = resolvedMin
          const curMax = dynamicMax ? dynamicMax() : resolvedMax
          if (typeof curMax === "number" && clamped > curMax) clamped = curMax
          final = String(clamped)
          
          if (current.trim().startsWith("=") && onEquationChange) {
              onEquationChange("= " + floatToFraction(clamped))
          } else if (onEquationChange) {
              onEquationChange(undefined)
          }
        }
      } else {
        final = current
      }
    }

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      setIsTransitioning(true)
      setCurrentWidth(width)
    }

    if (final !== prevValueRef.current) onChange(final)
    setIsEditing(false)
    setEditingValue("")
  }

  const cancelEditing = () => {
    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      setIsTransitioning(true)
      setCurrentWidth(width)
    }
    setIsEditing(false)
    setEditingValue("")
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") finishEditing()
    else if (e.key === "Escape") cancelEditing()
  }

  useEffect(() => {
    if (startInEditMode && !isEditing) startEditing()
  }, [])

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (autoSelectOnClick && !emptyInputAtFocus && !placeholderFirst) {
      ;(e.target as HTMLInputElement).select()
    }
  }

  const displayStyles = getDisplayStyles()
  const editingStyles = getEditingStyles()
  const currentDisplayStyles = {
    backgroundColor: (isHovered && !readOnly)
      ? displayStyles.hover?.backgroundColor || displayStyles.backgroundColor
      : displayStyles.backgroundColor,
    color: (isHovered && !readOnly) ? displayStyles.hover?.color || displayStyles.color : displayStyles.color,
    border: (isHovered && !readOnly) ? displayStyles.hover?.border || displayStyles.border : displayStyles.border,
  }

  return (
    <div
      ref={displayRef}
      className={cn(
        "inline-flex items-center overflow-hidden box-border",
        !isEditing && !readOnly && "cursor-pointer",
        autoWidth && textAlign === "center" && "justify-center",
        autoWidth && textAlign === "left" && "justify-start",
        autoWidth && textAlign === "right" && "justify-end",
        !autoWidth && textAlign === "center" && "justify-center",
        !autoWidth && textAlign === "right" && "justify-end",
        !autoWidth && textAlign === "left" && "justify-start",
        isEditing ? "" : displayClassName,
        finalClassName,
      )}
      style={{
        ...textStyle,
        ...commonWidthStyle,
        ...alignmentStyle,
        backgroundColor: isEditing ? editingStyles.backgroundColor : currentDisplayStyles.backgroundColor,
        color: isEditing ? editingStyles.color : currentDisplayStyles.color,
        border: isEditing ? editingStyles.border : currentDisplayStyles.border,
        borderRadius: borderRadius,
        paddingLeft: `${horizontalPaddingPx}px`,
        paddingRight: `${horizontalPaddingPx}px`,
        verticalAlign: "middle",
        position: "relative",
        ...transitionStyle,
      }}
      onClick={!isEditing ? handleStartEditing : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={!isEditing && !readOnly ? "button" : undefined}
      tabIndex={!isEditing && !readOnly ? 0 : undefined}
      onKeyDown={(e) => {
        if (!isEditing && !readOnly && (e.key === "Enter" || e.key === " ")) startEditing()
      }}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              let val = e.target.value;
              if (type === "number") {
                  if (resolvedNumberMode === "integer") {
                      val = val.replace(/[^0-9+-]/g, "");
                  } else if (resolvedNumberMode === "percent") {
                      val = val.replace(/[^0-9.,+*/()=\s-]/g, "");
                  } else {
                      val = val.replace(/[^0-9.,+-]/g, "");
                  }
              }
              setEditingValue(val)
          }}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          className={cn(
            "focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
            "h-full w-full p-0 border-none bg-transparent flex items-center",
            inputClassName,
          )}
          style={{
            fontSize: "inherit",
            lineHeight: "inherit",
            color: "inherit",
            textAlign: "inherit",
            fontWeight: "inherit",
            ...inputStyle,
          }}
          placeholder={resolvedPlaceholder}
          type={effectiveType}
          inputMode={effectiveInputMode}
          pattern={effectivePattern}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            isPlaceholderLook && "text-gray-400 italic",
            "block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
          )}
          title={displayText}
        >
          {displayText}
        </span>
      )}
      {autoWidth && (
        <span
          ref={measurerRef}
          className="absolute invisible h-0 overflow-hidden whitespace-pre pl-0 pr-0"
          style={{
            fontFamily: textStyle.fontFamily,
            fontSize: textStyle.fontSize,
            lineHeight: textStyle.lineHeight,
            fontWeight: textStyle.fontWeight || (mode === "button" ? "600" : "400"),
          }}
          aria-hidden
        />
      )}
    </div>
  )
}

export default EditableText
