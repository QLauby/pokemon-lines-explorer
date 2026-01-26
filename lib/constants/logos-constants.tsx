import type React from "react"
import { type PokemonType, POKEMON_COLORS, darkenColor } from "../utils/colors-utils"

import BugLogo from "@/assets/logos/pokemon-types/bug.svg"
import DarkLogo from "@/assets/logos/pokemon-types/dark.svg"
import DragonLogo from "@/assets/logos/pokemon-types/dragon.svg"
import ElectricLogo from "@/assets/logos/pokemon-types/electric.svg"
import FairyLogo from "@/assets/logos/pokemon-types/fairy.svg"
import FightingLogo from "@/assets/logos/pokemon-types/fighting.svg"
import FireLogo from "@/assets/logos/pokemon-types/fire.svg"
import FlyingLogo from "@/assets/logos/pokemon-types/flying.svg"
import GhostLogo from "@/assets/logos/pokemon-types/ghost.svg"
import GrassLogo from "@/assets/logos/pokemon-types/grass.svg"
import GroundLogo from "@/assets/logos/pokemon-types/ground.svg"
import IceLogo from "@/assets/logos/pokemon-types/ice.svg"
import NormalLogo from "@/assets/logos/pokemon-types/normal.svg"
import PoisonLogo from "@/assets/logos/pokemon-types/poison.svg"
import PsychicLogo from "@/assets/logos/pokemon-types/psychic.svg"
import RockLogo from "@/assets/logos/pokemon-types/rock.svg"
import SteelLogo from "@/assets/logos/pokemon-types/steel.svg"
import StellarLogo from "@/assets/logos/pokemon-types/stellar.svg"
import WaterLogo from "@/assets/logos/pokemon-types/water.svg"

// Logo mapping
export const POKEMON_LOGOS: Record<PokemonType, string> = {
  normal: NormalLogo,
  grass: GrassLogo,
  poison: PoisonLogo,
  ground: GroundLogo,
  water: WaterLogo,
  steel: SteelLogo,
  rock: RockLogo,
  psychic: PsychicLogo,
  ice: IceLogo,
  ghost: GhostLogo,
  dragon: DragonLogo,
  fighting: FightingLogo,
  fairy: FairyLogo,
  dark: DarkLogo,
  electric: ElectricLogo,
  fire: FireLogo,
  bug: BugLogo,
  flying: FlyingLogo,
  stellar: StellarLogo,
}

// Type logo with color information
export interface TypeLogoInfo {
  logo: string
  color: string
  name: string
}

// Get logo information for a specific type
export function getTypeLogoInfo(type: PokemonType): TypeLogoInfo {
  return {
    logo: POKEMON_LOGOS[type],
    color: POKEMON_COLORS[type],
    name: type,
  }
}

// Get all available logos (excluding empty placeholders)
export function getAvailableLogos(): Array<TypeLogoInfo> {
  return Object.entries(POKEMON_LOGOS)
    .filter(([_, logo]) => logo !== "")
    .map(([type, logo]) => ({
      logo,
      color: POKEMON_COLORS[type as PokemonType],
      name: type,
    }))
}

// Check if a logo is available for a type
export function hasLogo(type: PokemonType): boolean {
  return POKEMON_LOGOS[type] !== ""
}

// Get logo with fallback
export function getLogoWithFallback(type: PokemonType, fallback = ""): string {
  return POKEMON_LOGOS[type] || fallback
}

export type PokemonStatus = "burn" | "freeze" | "paralysis" | "poison" | "badly-poison" | "sleep" | null
export type IndependentStatus = "confusion" | "love"

import { Flame, Heart, Moon, Skull, Snowflake, Zap } from "lucide-react"

interface StatusInfo {
  type: PokemonStatus | IndependentStatus
  name: string
  icon: React.FC<{ className?: string }>
  title: string
  activeColor: string
}

export const exclusiveStatuses: StatusInfo[] = [
  {
    type: "burn",
    name: "Burned",
    icon: Flame,
    title: "Burned",
    activeColor: POKEMON_COLORS.fire,
  },
  {
    type: "freeze",
    name: "Frozen",
    icon: Snowflake,
    title: "Frozen",
    activeColor: POKEMON_COLORS.ice,
  },
  {
    type: "paralysis",
    name: "Paralyzed",
    icon: Zap,
    title: "Paralyzed",
    activeColor: POKEMON_COLORS.electric,
  },
  {
    type: "poison",
    name: "Poisoned",
    icon: Skull,
    title: "Poisoned",
    activeColor: POKEMON_COLORS.poison,
  },
  {
    type: "badly-poison",
    name: "Badly Poisoned",
    icon: Skull,
    title: "Badly Poisoned",
    activeColor: darkenColor(POKEMON_COLORS.poison, 30),
  },
  {
    type: "sleep",
    name: "Asleep",
    icon: Moon,
    title: "Asleep",
    activeColor: POKEMON_COLORS.normal,
  },
]
const ConfusionIcon = ({
  className,
  size = 24,
  strokeWidth = 2,
}: {
  className?: string
  size?: number | string
  strokeWidth?: number | string
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <g transform="scale(0.85) translate(1.8, 1.8)">
      <path d="M14.828 14.828 21 21" />
      <path d="M21 16v5h-5" />
      <path d="m21 3-9 9-4-4-6 6" />
      <path d="M21 8V3h-5" />
    </g>
  </svg>
)

export const independentStatuses: StatusInfo[] = [
  {
    type: "confusion",
    name: "Confused",
    icon: ConfusionIcon,
    title: "Confused",
    activeColor: POKEMON_COLORS.psychic,
  },
  {
    type: "love",
    name: "Infatuated",
    icon: Heart,
    title: "Infatuated",
    activeColor: POKEMON_COLORS.fairy,
  },
]

export function getStatusInfo(status: PokemonStatus | IndependentStatus): StatusInfo | undefined {
  return [...exclusiveStatuses, ...independentStatuses].find((s) => s.type === status)
}

export function getStatusName(status: PokemonStatus | IndependentStatus): string {
  const info = getStatusInfo(status)
  return info?.name || "Unknown"
}
