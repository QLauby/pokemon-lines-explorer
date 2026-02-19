import { PokemonStatus } from "@/lib/constants/logos-constants"
import { PokemonType } from "@/lib/utils/colors-utils"

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
  sleepCounter?: number
  showSleepCounter?: boolean
  confusion: boolean
  confusionCounter?: number
  showConfusionCounter?: boolean
  love: boolean
  heldItem: boolean
  isMega?: boolean
  customTags?: string[]
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

export interface SlotReference {
  side: "my" | "opponent"
  slotIndex: number
}

// Delta Definitions
export type BattleDelta =
  | { type: "HP_RELATIVE"; target: SlotReference; amount: number }
  | { type: "SWITCH"; side: "my" | "opponent"; fromSlot: number; toSlot: number; slotIndex?: number }
  | { type: "PP_CHANGE"; target: SlotReference; moveName: string; amount: number }

export type TurnActionType = "attack" | "switch" | "item" | "switch-after-ko"

export type EffectType = "hp-change" | "status-change" | "stats-modifier"

export interface Effect {
  target: SlotReference
  type: EffectType
  deltas: BattleDelta[]
}

export interface TurnAction {
  id: string
  actor: SlotReference
  type: TurnActionType
  target?: SlotReference 
  actionDeltas: BattleDelta[]
  effects: Effect[]
  isCollapsed?: boolean 
  // Flag indicating the switch-after-ko was created by fusing (deleting) an action
  fusedFrom?: boolean
  metadata?: {
    itemName?: string
    attackName?: string
  }
}

export interface TurnData {
  actions: TurnAction[]
  endOfTurnEffects: Effect[]
  postTurnActions?: TurnAction[]
}


export interface BattleState {
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  activeSlots: { myTeam: (number | null)[]; opponentTeam: (number | null)[] }
  battlefieldState: BattlefieldState
}

// Full Combat Session
export interface CombatSession {
  id: string
  name: string
  battleType: "simple" | "double"
  initialState: BattleState
  nodes: TreeNode[]
  lastSelectedNodeId?: string
}
