"use client"

import type React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"

import { cn } from "@/lib/utils/cn"

import { darkenColor, getTextColorForBackground, lightenColor } from "@/lib/colors"

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
  height?: string | number
  fontSizeRatio?: number
  rounded?: boolean
  mode?: "text" | "button"
  textAlign?: "left" | "center" | "right"
  visualMode?: "default" | "border"
  placeholderFirst?: boolean
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

const DEFAULT_TEXT_IF_VOID = "Click to edit ..."
const DEFAULT_MAIN_COLOR = "#E0E0E0"
const DEFAULT_DARK_TEXT_COLOR = "#000000"
const DEFAULT_LIGHT_TEXT_COLOR = "#ffffff"
const DEFAULT_TRANSITION_DURATION = "0.8s"

const evaluateExpression = (expr: string): number | null => {
  if (typeof expr !== "string") return null
  const allowed = /^[0-9+\-*/()\\s.,%]+$/
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
  height = "32px",
  fontSizeRatio = 0.6,
  rounded = false,
  mode = "text",
  textAlign = "left",
  visualMode = "default",
  placeholderFirst = false,
  className,
  inputClassName,
  displayClassName,
  style,
  inputStyle,
  mainColor = DEFAULT_MAIN_COLOR,
  darkTextColor = DEFAULT_DARK_TEXT_COLOR,
  lightTextColor = DEFAULT_LIGHT_TEXT_COLOR,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: EditableTextProps) {
  const resolvedDefault = defaultValue || (type === "number" ? "0" : DEFAULT_TEXT_IF_VOID)
  const resolvedPlaceholder = placeholder ?? resolvedDefault
  const resolvedNumberMode: "integer" | "float" | "percent" | undefined =
    type === "number" ? (numberMode ?? "integer") : undefined
  const resolvedMin: number | undefined = min
  const resolvedMax: number | undefined = dynamicMax ? dynamicMax() : max
  const resolvedDecimals = decimals // Declare resolvedDecimals variable

  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState("")
  const [inputWidth, setInputWidth] = useState<string | number>(width)
  const [currentWidth, setCurrentWidth] = useState<string | number>(width)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isInitialMount, setIsInitialMount] = useState(true) // Track initial mount to avoid animation on first render
  const [hasRendered, setHasRendered] = useState(false) // Add hasRendered state to better control when transitions should start
  const [pendingWidthTransition, setPendingWidthTransition] = useState<string | number | null>(null)
  const [isInDelayedTransition, setIsInDelayedTransition] = useState(false)

  const prevValueRef = useRef<string>(value)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const measurerRef = useRef<HTMLSpanElement | null>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)

  const darkenedMainColor = darkenColor(mainColor, 20)
  const lightenedMainColor = lightenColor(mainColor, 95)
  const calculatedHeight = typeof height === "number" ? `${height}px` : height
  const calculatedFontSize = `calc(${calculatedHeight} * ${fontSizeRatio})`
  const numericHeightPx =
    typeof height === "number" ? height : typeof height === "string" ? Number.parseFloat(height) || 32 : 32
  const numericFontSizePx = numericHeightPx * fontSizeRatio
  const verticalSpacePx = Math.max(0, numericHeightPx - numericFontSizePx)

  const verticalPaddingPx = Math.max(0, Math.floor(verticalSpacePx / 2))
  const baseHorizontalPaddingPx = Math.max(Math.round(verticalPaddingPx * 1.3), 1)
  const horizontalPaddingPx = rounded
    ? Math.max(baseHorizontalPaddingPx + Math.round(numericHeightPx * 0.15), 1)
    : baseHorizontalPaddingPx
  const horizontalPadding = `${horizontalPaddingPx}px`

  const borderRadiusPx = rounded ? Math.round(numericHeightPx / 2) : Math.round(numericHeightPx * 0.125)
  const borderRadius = `${borderRadiusPx}px`

  const textStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: calculatedFontSize,
    lineHeight: "inherit",
    minHeight: calculatedHeight,
    height: calculatedHeight,
    textAlign: textAlign,
    ...style,
  }

  const effectiveType = type === "number" ? "text" : type
  const effectiveInputMode = type === "number" ? "decimal" : undefined
  const effectivePattern = type === "number" ? "[0-9.,+-]*" : undefined

  const getDisplayStyles = () => {
    if (visualMode === "default") {
      if (mode === "button") {
        const textColor = getTextColorForBackground(mainColor, darkTextColor, lightTextColor)
        const hoverTextColor = getTextColorForBackground(darkenedMainColor, darkTextColor, lightTextColor)
        return {
          backgroundColor: mainColor,
          color: textColor,
          border: "none",
          hover: {
            backgroundColor: darkenedMainColor,
            color: hoverTextColor,
            border: "none",
          },
        }
      }
      return {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: "none",
        hover: {
          backgroundColor: mainColor,
          color: getTextColorForBackground(mainColor, darkTextColor, lightTextColor),
          border: "none",
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
    const editingBackgroundColor = "white" // Input background is white in editing mode

    if (mode === "button" && visualMode === "default") {
      return {
        backgroundColor: editingBackgroundColor,
        border: `1px solid ${mainColor}`,
        color: darkTextColor, // Always use dark text on white background for button default mode
      }
    }

    return {
      backgroundColor: editingBackgroundColor,
      border: `1px solid ${mainColor}`,
      color: darkTextColor, // Always use dark text on white background
    }
  }

  const displayStyles = getDisplayStyles()
  const editingStyles = getEditingStyles()

  const startEditing = () => {
    console.log("[v0] startEditing - autoWidth:", autoWidth, "width:", width, "editWidth:", editWidth)
    prevValueRef.current = value
    let initialEditingValue: string

    if (placeholderFirst) {
      initialEditingValue = ""
    } else {
      initialEditingValue = type === "number" && (value === "" || value == null) ? resolvedDefault : value
    }

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      console.log("[v0] Fixed width mode - setting initial width:", width)
      setCurrentWidth(width)
      setIsEditing(true)
      setEditingValue(initialEditingValue)
      setIsHovered(false)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log("[v0] Triggering animation to editWidth:", editWidth)
          setIsTransitioning(true)
          setCurrentWidth(editWidth)
        })
      })
    } else {
      setIsEditing(true)
      setEditingValue(initialEditingValue)
      setIsHovered(false)
    }
  }

  const finishEditing = () => {
    console.log("[v0] finishEditing - autoWidth:", autoWidth, "width:", width, "editWidth:", editWidth)
    const current = editingValue
    let final: string

    if (current === "" || current.trim() === "") {
      if (placeholderFirst) {
        final = prevValueRef.current
      } else {
        if (current === "") {
          final = allowEmpty ? "" : defaultValue || DEFAULT_TEXT_IF_VOID
        } else {
          if (prevValueRef.current === "" && allowEmpty) {
            final = ""
          } else {
            final =
              prevValueRef.current === ""
                ? allowEmpty
                  ? ""
                  : defaultValue || DEFAULT_TEXT_IF_VOID
                : prevValueRef.current
          }
        }
      }
    } else {
      if (type === "number") {
        let numericValue: number | null = null
        if (current.trim().startsWith("=")) {
          const expr = current.trim().slice(1)
          numericValue = evaluateExpression(expr)
        } else {
          const normalized = current.replace(",", ".").trim()
          numericValue = Number(normalized)
        }
        if (!Number.isFinite(numericValue)) {
          final =
            prevValueRef.current === ""
              ? allowEmpty
                ? ""
                : defaultValue || DEFAULT_TEXT_IF_VOID
              : prevValueRef.current
        } else {
          let clamped = numericValue as number
          if (resolvedNumberMode === "integer") {
            clamped = Math.trunc(clamped)
          }
          if (typeof resolvedMin === "number" && clamped < resolvedMin) clamped = resolvedMin
          const currentMax = dynamicMax ? dynamicMax() : resolvedMax
          if (typeof currentMax === "number" && clamped > currentMax) clamped = currentMax
          final = String(clamped)
        }
      } else {
        final = current
      }
    }

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      console.log("[v0] Fixed width mode - keeping editWidth:", editWidth)
      setCurrentWidth(editWidth)
      onChange(final)
      setIsEditing(false)
      setEditingValue("")

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log("[v0] Triggering animation back to width:", width)
          setIsTransitioning(true)
          setCurrentWidth(width)
        })
      })
    } else {
      onChange(final)
      setIsEditing(false)
      setEditingValue("")
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditingValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") finishEditing()
    else if (e.key === "Escape") cancelEditing()
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (autoSelectOnClick && !placeholderFirst) {
      ;(e.target as HTMLInputElement).select()
    }
  }

  useLayoutEffect(() => {
    if (!autoWidth) {
      return
    }
    const measurer = measurerRef.current
    if (!measurer) return

    const textToMeasure = isEditing
      ? editingValue === ""
        ? resolvedPlaceholder
        : editingValue
      : value === ""
        ? resolvedPlaceholder
        : value

    measurer.textContent = textToMeasure || " "
    const textWidth = Math.ceil(measurer.getBoundingClientRect().width)
    const finalPaddingPx = horizontalPaddingPx
    const SAFETY_OFFSET_PX = 2
    const computedWidth = textWidth + Math.ceil(finalPaddingPx * 2) + SAFETY_OFFSET_PX
    const calculatedWidth = Math.max(Math.ceil(computedWidth), 1)

    setInputWidth(calculatedWidth)

    if (isInitialMount) {
      // Premier affichage : directement la bonne largeur sans animation
      setCurrentWidth(calculatedWidth)
      setIsInitialMount(false)
      setTimeout(() => setHasRendered(true), 0)
    } else if (!isInDelayedTransition) {
      // Pendant la saisie : animation fluide
      if (hasRendered && isEditing) {
        setIsTransitioning(true)
        setCurrentWidth(calculatedWidth)
      } else if (!isEditing) {
        // Changement de valeur en mode affichage : directement la bonne largeur
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
    numericFontSizePx,
    horizontalPaddingPx,
    isInitialMount,
    hasRendered,
    isInDelayedTransition,
  ])

  useEffect(() => {
    if (isTransitioning) {
      const endTimer = setTimeout(() => {
        setIsTransitioning(false)
        setIsInDelayedTransition(false)
      }, Number.parseFloat(transitionDuration) * 1000)

      return () => {
        clearTimeout(endTimer)
      }
    }
  }, [isTransitioning, transitionDuration])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (autoSelectOnClick && !placeholderFirst) inputRef.current.select()
    }
  }, [isEditing, autoSelectOnClick, placeholderFirst])

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

  const commonWidthStyle: React.CSSProperties = {
    width: currentWidth,
  }

  const alignmentStyle: React.CSSProperties = autoWidth ? { textAlign: "center" as const } : { textAlign: textAlign }

  const shouldAnimate =
    isTransitioning || (hasRendered && (autoWidth || (!autoWidth && editWidth !== undefined && editWidth !== width)))
  const transitionStyle = {
    transition: shouldAnimate ? `width ${transitionDuration}` : "none",
  }

  const defaultFontWeightClass = mode === "button" ? "font-semibold" : "font-normal"
  const finalClassName = cn(defaultFontWeightClass, className)

  if (isEditing) {
    return (
      <div style={{ display: "inline-block", position: "relative" }}>
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue((e.target as HTMLInputElement).value)}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          className={cn(
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "h-auto",
            "py-0",
            inputClassName,
            finalClassName, // Use same font weight class as display mode
          )}
          style={{
            ...textStyle,
            ...commonWidthStyle,
            ...alignmentStyle,
            ...inputStyle,
            backgroundColor: editingStyles.backgroundColor,
            color: editingStyles.color,
            border: editingStyles.border,
            borderRadius: borderRadius,
            paddingLeft: `${horizontalPaddingPx}px`,
            paddingRight: `${horizontalPaddingPx}px`,
            paddingTop: 0,
            paddingBottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: autoWidth
              ? "center"
              : textAlign === "center"
                ? "center"
                : textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
            boxSizing: "border-box",
            lineHeight: "1",
            ...transitionStyle,
          }}
          placeholder={resolvedPlaceholder}
          type={effectiveType}
          inputMode={effectiveInputMode}
          pattern={effectivePattern}
          autoFocus
        />
        {autoWidth && (
          <span
            ref={measurerRef}
            style={{
              position: "absolute",
              visibility: "hidden",
              height: 0,
              overflow: "hidden",
              whiteSpace: "pre",
              fontFamily: textStyle.fontFamily,
              fontSize: textStyle.fontSize,
              lineHeight: textStyle.lineHeight,
              fontWeight: mode === "button" ? "600" : "400",
              paddingLeft: 0,
              paddingRight: 0,
            }}
            aria-hidden
          />
        )}
      </div>
    )
  }

  const currentDisplayStyles = {
    backgroundColor: isHovered
      ? displayStyles.hover?.backgroundColor || displayStyles.backgroundColor
      : displayStyles.backgroundColor,
    color: isHovered ? displayStyles.hover?.color || displayStyles.color : displayStyles.color,
    border: isHovered ? displayStyles.hover?.border || displayStyles.border : displayStyles.border,
  }

  return (
    <div
      ref={displayRef}
      onClick={startEditing}
      className={cn("cursor-pointer", displayClassName, finalClassName)}
      style={{
        ...textStyle,
        ...commonWidthStyle,
        ...alignmentStyle,
        backgroundColor: currentDisplayStyles.backgroundColor,
        color: currentDisplayStyles.color,
        border: currentDisplayStyles.border,
        borderRadius: borderRadius,
        overflow: "hidden",
        paddingLeft: `${horizontalPaddingPx}px`,
        paddingRight: `${horizontalPaddingPx}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: autoWidth
          ? "center"
          : textAlign === "center"
            ? "center"
            : textAlign === "right"
              ? "flex-end"
              : "flex-start",
        boxSizing: "border-box",
        lineHeight: "1",
        ...transitionStyle,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") startEditing()
      }}
      aria-label="Editable text — cliquer pour éditer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={cn(isPlaceholderLook && "text-gray-400 italic", finalClassName)}
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "block",
          width: "100%",
          minWidth: 0,
        }}
        title={displayText}
      >
        {displayText}
      </span>
      {autoWidth && (
        <span
          ref={measurerRef}
          style={{
            position: "absolute",
            visibility: "hidden",
            height: 0,
            overflow: "hidden",
            whiteSpace: "pre",
            fontFamily: textStyle.fontFamily,
            fontSize: textStyle.fontSize,
            lineHeight: textStyle.lineHeight,
            fontWeight: mode === "button" ? "600" : "400",
            paddingLeft: 0,
            paddingRight: 0,
          }}
          aria-hidden
        />
      )}
    </div>
  )
}

export default EditableText
