import { PokemonStatus } from "@/lib/constants/logos-constants"
import { PokemonType } from "@/lib/utils/colors-utils"

export interface CustomTagData {
  id: string
  name: string
  count?: number
  showCount: boolean
}

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

export type PokemonHpInfo = {
  hpPercent: number
  hpMax?: number
  hpCurrent?: number
  rawHpExpression?: string
}

export interface Pokemon extends PokemonHpInfo {
  id: string
  name: string
  types: PokemonType[]
  teraType?: PokemonType
  heldItemName?: string
  abilityName?: string
  isTerastallized?: boolean
  // hpPercent, hpMax, hpCurrent inherited from PokemonHpInfo
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
  customTags?: CustomTagData[]
  statsModifiers?: StatsModifiers;
}

export interface SideState {
  customTags: CustomTagData[]
}

export interface BattlefieldState {
  customTags: CustomTagData[]
  playerSide: SideState
  opponentSide: SideState
}

export interface TreeNode {
  id: string
  description: string
  probability: number
  probabilityExpression?: string
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

export type TargetReferenceType = "battlefield_slot" | "team_index" | "field";

export interface SlotReference {
  type?: TargetReferenceType;
  side: "my" | "opponent";
  slotIndex: number; // For battlefield_slot
  teamIndex?: number; // For team_index
  target?: "my_side" | "opponent_side" | "global"; // For field
}

// Delta Definitions
export type StatModifierKey = "att" | "def" | "spa" | "spd" | "spe" | "acc" | "ev" | "crit"

export type StatModifierOperation = {
  stat: StatModifierKey
  amount: number
}

export type StatusOperation =
  | { type: "ADD"; status: PokemonStatus | "confusion" | "love" }
  | { type: "REMOVE"; status: PokemonStatus | "confusion" | "love" }
  | { type: "COUNTER_RELATIVE"; status: "sleep" | "confusion"; amount: number }
  | { type: "COUNTER_TOGGLE"; status: "sleep" | "confusion"; show: boolean }

export type OtherOperation =
  | { type: "CREATE"; id: string; name: string }
  | { type: "DELETE"; id: string }
  | { type: "RENAME"; id: string; newName: string }
  | { type: "COUNTER_TOGGLE"; id: string; show: boolean }
  | { type: "COUNTER_RELATIVE"; id: string; amount: number }

export type MegaTeraOperation = 
  | { type: "SET_MEGA"; value: boolean }
  | { type: "SET_TERA"; value: boolean }

export type BattleDelta =
  | { type: "HP_RELATIVE"; target: SlotReference; amount: number; unit: "percent" | "hp"; rawAmountExpression?: string }
  | { type: "HP_SET"; target: SlotReference; amount: number; unit: "percent" | "hp"; rawAmountExpression?: string }
  | { type: "SWITCH"; side: "my" | "opponent"; fromSlot: number; toSlot: number; slotIndex?: number }
  | { type: "PP_CHANGE"; target: SlotReference; moveName: string; amount: number }
  | { type: "STATUS_DELTAS"; target: SlotReference; operations: StatusOperation[] }
  | { type: "STATS_MODIFIERS_DELTAS"; target: SlotReference; operations: StatModifierOperation[]; setAllToZero?: boolean }
  | { type: "OTHERS_EFFECT_DELTAS"; target: SlotReference; operations: OtherOperation[] }
  | { type: "MEGA_TERA_DELTAS"; target: SlotReference; operations: MegaTeraOperation[] }
  | { type: "ABILITY_CHANGE"; target: SlotReference; abilityName: string }
  | { type: "ITEM_CHANGE"; target: SlotReference; heldItem: boolean; heldItemName?: string }

export type TurnActionType = "attack" | "switch" | "item" | "switch-after-ko"

export type EffectType = "hp-change" | "status-change" | "stats-modifier" | "others" | "terrain" | "mega-tera" | "ability-item"

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
  // Flag indicating the switch-after-ko was created by a KO trigger
  triggeredByKO?: boolean
  // ID of the Pokemon that fainted, triggering this switch-after-ko
  faintedPokemonId?: string
  metadata?: {
    itemName?: string
    attackName?: string
    ppAmount?: number
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
  hpMode?: "percent" | "hp"  // Default: "percent"
  initialState: BattleState
  nodes: TreeNode[]
  lastSelectedNodeId?: string
}
