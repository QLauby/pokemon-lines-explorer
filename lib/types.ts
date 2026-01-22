import { PokemonType } from "./colors"
import { PokemonStatus } from "./logos"

export interface Attack {
  id: string
  name: string
  maxPP: number
  currentPP: number
  type?: PokemonType
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
  showSleepCounter?: boolean
  showConfusionCounter?: boolean
  statsModifiers?: StatsModifiers;
}

export interface SideState {
  customTags: string[]
}

export interface BattlefieldState {
  customTags: string[]
  playerSide: SideState
  opponentSide: SideState
}

export interface TreeNode {
  id: string
  description: string
  probability: number
  deltas: BattleDelta[]
  parentId?: string
  children: string[]
  turn: number
  branchIndex: number
  x: number
  y: number
  cumulativeProbability: number
  createdAt: number
}

// Delta Definitions
export type BattleDelta =
  | { type: "HP_ABSOLUTE"; targetId: string; value: number }
  | { type: "HP_RELATIVE"; targetId: string; amount: number }
  | {
      type: "STATUS_CHANGE"
      targetId: string
      status?: PokemonStatus
      confusion?: boolean
      love?: boolean
      sleepCounter?: number
      confusionCounter?: number
      showSleepCounter?: boolean
      showConfusionCounter?: boolean
    }
  | { type: "SWITCH"; team: "my" | "opponent"; slotIndex: number; newPokemonId: string | null }
  | { type: "TAG_UPDATE"; targetId: string | "field" | "player_side" | "opponent_side"; tags: string[] }
  | { type: "ITEM_UPDATE"; targetId: string; heldItem: boolean; heldItemName?: string }
  | { type: "STAT_MODIFIER"; targetId: string; stat: keyof StatsModifiers; value: number }
  | { type: "TERA_UPDATE"; targetId: string; isTerastallized: boolean }
  | { type: "MEGA_UPDATE"; targetId: string; isMega: boolean }
  | { type: "MOVE_PP_UPDATE"; targetId: string; moveId: string; currentPP: number }

// Full Combat Session
export interface CombatSession {
  id: string
  name: string
  battleType: "simple" | "double"
  initialState: {
    myTeam: Pokemon[]
    enemyTeam: Pokemon[]
    activeStarters: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
    battlefieldState: BattlefieldState
  }
  nodes: TreeNode[]
  lastSelectedNodeId?: string
}

// Helper to define what a computed state looks like (same as before but explicit)
export interface BattleState {
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeStarters: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  battlefieldState: BattlefieldState
  expandedPokemonIds?: string[]
}
