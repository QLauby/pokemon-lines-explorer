"use client"
import { cn } from "@/lib/utils/cn"

interface CircularButtonProps {
  isActive: boolean
  onClick: () => void
  icon: any
  activeColor: string
  inactiveColor?: string
  title?: string
  diameter?: number
  variant?: "filled" | "outlined"
  iconRatio?: number
  size?: number
  scale?: number
  readOnly?: boolean
  style?: React.CSSProperties
}

export const CircularButton = ({
  isActive,
  onClick,
  icon: Icon,
  activeColor,
  inactiveColor = "bg-slate-100 text-slate-400 hover:bg-slate-200",
  title,
  diameter,
  variant = "filled",
  iconRatio = 0.6,
  size = 12,
  scale = 1,
  readOnly = false,
  style,
}: CircularButtonProps) => {
  // 1. We respect the requested diameter exactly to avoid "oval" distortions.
  let finalDiameter = Math.round(diameter || size * scale * 2)
  
  // 2. To ensure perfect centering, the Icon must have the SAME PARITY as the button.
  // (Even button = Even icon, Odd button = Odd icon) -> Error margin is always an integer.
  let finalIconSize = Math.round(finalDiameter * iconRatio)
  if (finalIconSize % 2 !== finalDiameter % 2) {
    if (finalIconSize + 1 < finalDiameter) finalIconSize += 1
    else finalIconSize -= 1
  }

  // 3. Sharpness: use thicker stroke only if the icon is very small
  const finalStrokeWidth = finalIconSize < 12 ? 2.2 : 2

  const isCustomColor = activeColor.startsWith("#") || activeColor.startsWith("var(")

  const getOutlinedColors = (activeColor: string) => {
    const colorMap: { [key: string]: string } = {
      "bg-red-500 text-white": "text-red-500 bg-white",
      "bg-blue-500 text-white": "text-blue-500 bg-white",
      "bg-yellow-500 text-white": "text-yellow-500 bg-white",
      "bg-purple-500 text-white": "text-purple-500 bg-white",
      "bg-slate-400 text-white": "text-slate-400 bg-white",
      "bg-slate-800 text-white": "text-slate-800 bg-white",
      "bg-pink-500 text-white": "text-pink-500 bg-white",
      "bg-green-500 text-white": "text-green-500 bg-white",
      "bg-stone-700 text-white": "text-stone-700 bg-white",
      "bg-amber-700 text-white": "text-amber-700 bg-white",
    }
    return colorMap[activeColor] || "text-slate-500 bg-white"
  }

  const getActiveStyles = () => {
    if (variant === "outlined") {
      return getOutlinedColors(activeColor)
    }
    return activeColor
  }

  const getInactiveStyles = () => {
    if (variant === "outlined") {
      return inactiveColor !== "bg-slate-100 text-slate-400 hover:bg-slate-200"
        ? inactiveColor
        : "bg-white text-slate-400 hover:bg-slate-50"
    }
    return inactiveColor
  }

  const commonStyles: React.CSSProperties = {
    width: `${finalDiameter}px`,
    height: `${finalDiameter}px`,
    minWidth: `${finalDiameter}px`,
    minHeight: `${finalDiameter}px`,
    padding: 0,
    lineHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
    aspectRatio: "1 / 1",
  }

  const iconStyle: React.CSSProperties = {
    display: "block",
    margin: 0,
    padding: 0,
  }

  if (isCustomColor) {
    const isOutlined = variant === "outlined"
    return (
      <button
        onClick={readOnly ? undefined : onClick}
        className={cn(
            "rounded-full transition-colors outline-none overflow-hidden",
            !readOnly && "cursor-pointer",
            isOutlined ? "border border-border" : "border-none",
            !isActive && "bg-slate-100 text-slate-400 hover:bg-slate-200"
        )}
        style={{
          ...commonStyles,
          backgroundColor: isActive ? (isOutlined ? "transparent" : activeColor) : undefined,
          color: isActive ? activeColor : undefined,
          borderColor: undefined,
          boxShadow: (isActive && !isOutlined) ? `0 0 calc(10px * var(--glow-intensity, 1)) ${activeColor.startsWith("#") ? activeColor + "88" : "rgba(var(--bg-neutral-low), 0.5)"}, 0 0 calc(4px * var(--glow-intensity, 1)) ${activeColor}` : undefined,
          ...style,
        }}
        title={title}
      >
        <Icon size={finalIconSize} strokeWidth={finalStrokeWidth} style={iconStyle} className={cn("flex-shrink-0", isActive && !isOutlined ? "text-white" : "")} />
      </button>
    )
  }

  return (
    <button
      onClick={readOnly ? undefined : onClick}
      className={`rounded-full transition-colors border-none outline-none overflow-hidden ${
        !readOnly && "cursor-pointer"
      } ${isActive ? getActiveStyles() : getInactiveStyles()}`}
      style={{ ...commonStyles, ...style }}
      title={title}
    >
      <Icon size={finalIconSize} strokeWidth={finalStrokeWidth} style={iconStyle} className="flex-shrink-0" />
    </button>
  )
}
