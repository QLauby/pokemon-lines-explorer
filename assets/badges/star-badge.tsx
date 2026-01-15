import React from "react"

export const StarBadgeIcon = ({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    style={style}
    width="100%"
    height="100%"
  >
    <path
      d="M12 2 L16 5.5 L21 7 L19.5 12 L21 17 L16 18.5 L12 22 L8 18.5 L3 17 L4.5 12 L3 7 L8 5.5 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </svg>
)
