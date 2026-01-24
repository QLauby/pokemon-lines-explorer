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
  turnData: TurnData
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
  | { type: "HP_RELATIVE"; targetId: string; amount: number }

export type TurnActionType = "attack" | "switch" | "item"

export interface TurnAction {
  id: string
  // The actor is determined by the slot, but due to reordering, we need to know WHO is acting.
  actorId: string 
  type: TurnActionType
  // For switch and attacks, we need to know who is targeted
  targetId?: string
  hpChanges: BattleDelta[]
  isCollapsed?: boolean // UI state persistence if needed, or handled locally
}

export interface TurnData {
  actions: TurnAction[]
  endOfTurnDeltas: BattleDelta[]
}

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
