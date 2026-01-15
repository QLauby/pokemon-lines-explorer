export const pokemonTypeColors = {
  ghost: "#663994",
  ice: "#88DBED",
  dragon: "#6521EE",
  fighting: "#C80001",
  steel: "#A5A7C5",
  fairy: "#F9A5D1",
  dark: "#494949",
  electric: "#FFD625",
  fire: "#FF7111",
  ground: "#E5BB60",
  poison: "#AE01CC",
  rock: "#C49101",
  bug: "#9CC31F",
  grass: "#3BCB02",
  psychic: "#FE509B",
  flying: "#A890FE",
  normal: "#ADAB8D",
  water: "#717FFF",
  stellar: "#40B4A4",
} as const

// Type for TypeScript autocompletion
export type PokemonType = keyof typeof pokemonTypeColors

// Helper function to get color by type
export const getTypeColor = (type: PokemonType): string => {
  return pokemonTypeColors[type]
}

// Helper function to get all available types
export const getAllTypes = (): PokemonType[] => {
  return Object.keys(pokemonTypeColors) as PokemonType[]
}

export const POKEMON_COLORS = pokemonTypeColors

// Color manipulation utilities
/**
 * Color manipulation utilities
 * These functions help with color transformations and accessibility
 */

/**
 * Darkens a hex color by a given percentage
 * @param color - Hex color string (e.g., "#FF0000")
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color string
 */
export const darkenColor = (color: string, percent: number): string => {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return "#000000"
  let r = Number.parseInt(color.slice(1, 3), 16)
  let g = Number.parseInt(color.slice(3, 5), 16)
  let b = Number.parseInt(color.slice(5, 7), 16)
  r = Math.max(0, Math.floor(r * (1 - percent / 100)))
  g = Math.max(0, Math.floor(g * (1 - percent / 100)))
  b = Math.max(0, Math.floor(b * (1 - percent / 100)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Lightens a hex color by a given percentage
 * @param color - Hex color string (e.g., "#FF0000")
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color string
 */
export const lightenColor = (color: string, percent: number): string => {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return "#FFFFFF"
  let r = Number.parseInt(color.slice(1, 3), 16)
  let g = Number.parseInt(color.slice(3, 5), 16)
  let b = Number.parseInt(color.slice(5, 7), 16)
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Calculates the luminance of a hex color
 * @param color - Hex color string (e.g., "#FF0000")
 * @returns Luminance value between 0 and 1
 */
export const getLuminance = (color: string): number => {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return 0.5
  let hex = color.replace("#", "")
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("")
  const r = Number.parseInt(hex.substr(0, 2), 16) / 255
  const g = Number.parseInt(hex.substr(2, 2), 16) / 255
  const b = Number.parseInt(hex.substr(4, 2), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Determines the appropriate text color for a given background color
 * @param backgroundColor - Background hex color string
 * @param darkColor - Color to use for dark text
 * @param lightColor - Color to use for light text
 * @returns Appropriate text color
 */
export const getTextColorForBackground = (backgroundColor: string, darkColor: string, lightColor: string): string => {
  if (backgroundColor === "transparent") {
    return darkColor
  }

  const luminance = getLuminance(backgroundColor)
  return luminance > 0.8 ? darkColor : lightColor
}
