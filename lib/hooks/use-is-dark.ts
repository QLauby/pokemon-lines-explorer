"use client"

import { useEffect, useState } from "react"

/**
 * Returns true if the document currently has the `dark` class (Neon Abyssal mode).
 * Reactively updates when the theme changes.
 * Use this to pass concrete hex values to JS color-manipulation functions
 * (like EditableText's mainColor / darkenColor / getTextColorForBackground)
 * that cannot handle CSS variable strings.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  return isDark
}
