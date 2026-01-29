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

export interface SlotReference {
  side: "my" | "opponent"
  slotIndex: number
}

// Delta Definitions
export type BattleDelta =
  | { type: "HP_RELATIVE"; target: SlotReference; amount: number }
  | { type: "SWITCH"; side: "my" | "opponent"; fromSlot: number; toSlot: number }

export type TurnActionType = "attack" | "switch" | "item" | "switch-after-ko"

export interface TurnAction {
  id: string
  actor: SlotReference
  type: TurnActionType
  target?: SlotReference 
  deltas: BattleDelta[]
  isCollapsed?: boolean 
  metadata?: {
    itemName?: string
    attackName?: string
    // Stores original state if this action was fused into a forced-switch
    fusedFrom?: {
        id?: string // Saved Original ID of the fused action
        type: TurnActionType
        target?: SlotReference
        deltas?: BattleDelta[]
    }
  }
}

export interface TurnData {
  actions: TurnAction[]
  endOfTurnDeltas: BattleDelta[]
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
