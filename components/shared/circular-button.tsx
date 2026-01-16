"use client"

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
}

export const CircularButton = ({
  isActive,
  onClick,
  icon: Icon,
  activeColor,
  inactiveColor = "bg-gray-100 text-gray-400 hover:bg-gray-200",
  title,
  diameter,
  variant = "filled",
  iconRatio = 0.6,
  size = 12,
  scale = 1,
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

  const isHexColor = activeColor.startsWith("#")

  const getOutlinedColors = (activeColor: string) => {
    const colorMap: { [key: string]: string } = {
      "bg-red-500 text-white": "text-red-500 bg-white",
      "bg-blue-500 text-white": "text-blue-500 bg-white",
      "bg-yellow-500 text-white": "text-yellow-500 bg-white",
      "bg-purple-500 text-white": "text-purple-500 bg-white",
      "bg-gray-400 text-white": "text-gray-400 bg-white",
      "bg-gray-800 text-white": "text-gray-800 bg-white",
      "bg-pink-500 text-white": "text-pink-500 bg-white",
      "bg-green-500 text-white": "text-green-500 bg-white",
      "bg-stone-700 text-white": "text-stone-700 bg-white",
      "bg-amber-700 text-white": "text-amber-700 bg-white",
    }
    return colorMap[activeColor] || "text-gray-500 bg-white"
  }

  const getActiveStyles = () => {
    if (variant === "outlined") {
      return getOutlinedColors(activeColor)
    }
    return activeColor
  }

  const getInactiveStyles = () => {
    if (variant === "outlined") {
      return inactiveColor !== "bg-gray-100 text-gray-400 hover:bg-gray-200"
        ? inactiveColor
        : "bg-white text-gray-400 hover:bg-gray-50"
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

  if (isHexColor) {
    return (
      <button
        onClick={onClick}
        className={`rounded-full transition-colors cursor-pointer border-none outline-none overflow-hidden ${
          isActive ? "text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
        style={{
          ...commonStyles,
          backgroundColor: isActive ? activeColor : undefined,
        }}
        title={title}
      >
        <Icon size={finalIconSize} strokeWidth={finalStrokeWidth} style={iconStyle} className="flex-shrink-0" />
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-full transition-colors cursor-pointer border-none outline-none overflow-hidden ${
        isActive ? getActiveStyles() : getInactiveStyles()
      }`}
      style={commonStyles}
      title={title}
    >
      <Icon size={finalIconSize} strokeWidth={finalStrokeWidth} style={iconStyle} className="flex-shrink-0" />
    </button>
  )
}
