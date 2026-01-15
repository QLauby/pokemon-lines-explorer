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
  const finalDiameter = diameter || size * scale * 2

  const iconSize = diameter ? Math.max(diameter * iconRatio, diameter * 0.25) : Math.max(size * scale * 0.96, 10)

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

  const buttonSize = `${finalDiameter}px`

  if (isHexColor) {
    return (
      <button
        onClick={onClick}
        className={`rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isActive ? "text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
        style={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: isActive ? activeColor : undefined,
        }}
        title={title}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
          }}
        >
          <Icon size={iconSize * 0.9} className="flex-shrink-0" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-full flex items-center justify-center transition-colors cursor-pointer ${
        isActive ? getActiveStyles() : getInactiveStyles()
      }`}
      style={{ width: buttonSize, height: buttonSize }}
      title={title}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
        }}
      >
        <Icon size={iconSize * 0.9} className="flex-shrink-0" />
      </div>
    </button>
  )
}
