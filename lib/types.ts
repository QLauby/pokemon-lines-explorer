import { PokemonType } from "./colors"
import { PokemonStatus } from "./logos"

export interface Attack {
  id: string
  name: string
  maxPP: number
  currentPP: number
}

export interface StatsModifiers {
  att: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  acc: number;
  ev: number;
  crit: number;
}

export interface Pokemon {
  id: string
  name: string
  types: PokemonType[]
  teraType?: PokemonType
  heldItemName?: string
  abilityName?: string
  isTerastallized?: boolean
  hpPercent: number
  attacks: Attack[]
  status: PokemonStatus
  confusion: boolean
  love: boolean
  heldItem: boolean
  isMega?: boolean
  customTags?: string[]
  sleepCounter?: number
  confusionCounter?: number
  statsModifiers?: StatsModifiers;
}

export interface TreeNode {
  id: string
  description: string
  probability: number
  hpChanges: { pokemonId: string; hpChange: number }[]
  parentId?: string
  children: string[]
  turn: number
  branchIndex: number
  x: number
  y: number
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  cumulativeProbability: number
  createdAt: number
}
