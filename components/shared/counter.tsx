"use client"

import type React from "react"
import { useRef, useState } from "react"

import { ChevronDown, ChevronUp } from "lucide-react"

import { THEME } from "@/lib/constants/color-constants"
import { EditableText } from "./editable-text"

const colors = THEME.counter

interface CounterProps {
  value: string
  onChange: (value: string) => void
  onValidateEmpty?: () => void
  min?: number
  max?: number
  dynamicMax?: () => number
  autoSelectOnClick?: boolean
  defaultValue?: string
  placeholder?: string
  autoWidth?: boolean
  width?: string | number
  editWidth?: string | number
  fontSize?: string | number
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
  doubleClickStep?: number
  readOnly?: boolean
  showPlusSign?: boolean
}

export function Counter(props: CounterProps) {
  const [isHovered, setIsHovered] = useState(false)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)

  const {
    value,
    onChange,
    min,
    max,
    dynamicMax,
    fontSize = 12,
    fontSizeRatio = 0.6,
    transitionDuration = "0.3s",
    doubleClickStep = 5,
    readOnly = false,
    showPlusSign = false,
    ...editableTextProps
  } = props

  const numericFontSize = typeof fontSize === "number" ? fontSize : Number.parseFloat(fontSize as string) || 16
  const numericHeight = numericFontSize / fontSizeRatio
  const effectiveMax = dynamicMax ? dynamicMax() : max

  const handleIncrement = (step = 1) => {
    const currentValue = Number.parseInt(value) || 0
    const newValue = effectiveMax !== undefined ? Math.min(currentValue + step, effectiveMax) : currentValue + step
    onChange(newValue.toString())
  }

  const handleDecrement = (step = 1) => {
    const currentValue = Number.parseInt(value) || 0
    const newValue = min !== undefined ? Math.max(currentValue - step, min) : currentValue - step
    onChange(newValue.toString())
  }

  const handleButtonClick = (direction: "up" | "down") => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }

    if (timeSinceLastClick < 300) {
      if (direction === "up") {
        handleIncrement(doubleClickStep)
      } else {
        handleDecrement(doubleClickStep)
      }
      lastClickTimeRef.current = 0
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        if (direction === "up") {
          handleIncrement(1)
        } else {
          handleDecrement(1)
        }
        clickTimeoutRef.current = null
      }, 300)
      lastClickTimeRef.current = now
    }
  }

  const borderRadiusPx = Math.round(numericHeight * 0.125)
  const arrowSize = Math.max(6, Math.min(12, Math.floor(numericHeight * 0.35)))
  const buttonOpacity = 0.8

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: `${borderRadiusPx}px`,
    overflow: "hidden",
    opacity: isHovered ? 1 : 0,
    transition: `opacity ${transitionDuration} ease-in-out`,
    pointerEvents: isHovered ? "auto" : "none",
  }

  const arrowButtonStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `rgba(var(--rgb-neutral), ${buttonOpacity})`,
    border: `1px solid rgba(var(--rgb-border), ${buttonOpacity})`,
    cursor: "pointer",
    transition: `all ${transitionDuration} ease-in-out`,
    color: `rgba(var(--rgb-text), ${Math.min(1, buttonOpacity + 0.3)})`,
  }

  const arrowButtonHoverStyle: React.CSSProperties = {
    backgroundColor: `rgba(var(--rgb-hover), ${buttonOpacity})`,
    borderColor: `rgba(var(--rgb-hover-border), ${buttonOpacity})`,
    color: `rgba(var(--rgb-hover-text), ${Math.min(1, buttonOpacity + 0.3)})`,
  }

  return (
    <div
      className="inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: "relative" }}
    >
      <EditableText
        {...editableTextProps}
        mainColor={props.mainColor || colors.bg}
        darkTextColor={props.darkTextColor || colors.text}
        lightTextColor={props.lightTextColor || THEME.common.white}
        value={value}
        onChange={onChange}
        type="number"
        numberMode="integer"
        min={min}
        max={effectiveMax}
        fontSize={numericFontSize}
        fontSizeRatio={fontSizeRatio}
        autoWidth={true}
        textAlign="center"
        visualMode="border"
        transitionDuration={transitionDuration}
        readOnly={readOnly}
        showPlusSign={showPlusSign}
      />

      {!readOnly && (
        <div
          style={{
            ...overlayStyle,
            border: isHovered ? `1px solid rgba(var(--rgb-border), ${buttonOpacity})` : "none",
          }}
        >
          <button
            onClick={() => handleButtonClick("up")}
            disabled={effectiveMax !== undefined && (Number.parseInt(value) || 0) >= effectiveMax}
            style={{
              ...arrowButtonStyle,
              borderTopLeftRadius: `${borderRadiusPx}px`,
              borderTopRightRadius: `${borderRadiusPx}px`,
              borderBottomLeftRadius: "0px",
              borderBottomRightRadius: "0px",
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, arrowButtonHoverStyle)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, {
                backgroundColor: `rgba(var(--rgb-neutral), ${buttonOpacity})`,
                borderColor: `rgba(var(--rgb-border), ${buttonOpacity})`,
                color: `rgba(var(--rgb-text), ${Math.min(1, buttonOpacity + 0.3)})`,
              })
            }}
          >
            <ChevronUp
              style={{
                width: `${arrowSize}px`,
                height: `${arrowSize}px`,
                display: "block",
                margin: "auto",
              }}
            />
          </button>
          <button
            onClick={() => handleButtonClick("down")}
            disabled={min !== undefined && (Number.parseInt(value) || 0) <= min}
            style={{
              ...arrowButtonStyle,
              borderTopLeftRadius: "0px",
              borderTopRightRadius: "0px",
              borderBottomLeftRadius: `${borderRadiusPx}px`,
              borderBottomRightRadius: `${borderRadiusPx}px`,
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, arrowButtonHoverStyle)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, {
                backgroundColor: `rgba(var(--rgb-neutral), ${buttonOpacity})`,
                borderColor: `rgba(var(--rgb-border), ${buttonOpacity})`,
                color: `rgba(var(--rgb-text), ${Math.min(1, buttonOpacity + 0.3)})`,
              })
            }}
          >
            <ChevronDown
              style={{
                width: `${arrowSize}px`,
                height: `${arrowSize}px`,
                display: "block",
                margin: "auto",
              }}
            />
          </button>
        </div>
      )}
    </div>
  )
}
