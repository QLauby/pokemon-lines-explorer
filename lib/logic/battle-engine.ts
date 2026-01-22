import { BattleDelta, BattleState, Pokemon, StatsModifiers, TreeNode } from "../types"

export class BattleEngine {
  static computeState(initialState: BattleState, nodes: Map<string, TreeNode>, targetNodeId: string): BattleState {
    if (!targetNodeId || !nodes.has(targetNodeId)) {
      return initialState
    }

    // 1. Trace path from target to root
    const path: TreeNode[] = []
    let currentId: string | undefined = targetNodeId
    while (currentId && nodes.has(currentId)) {
      const node = nodes.get(currentId)
      if (!node) break
      path.unshift(node)
      currentId = node.parentId
    }

    // 2. Apply deltas sequentially
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState // Deep copy initial state

    for (const node of path) {
      if (node.id === "root") continue 
      for (const delta of node.deltas) {
        currentState = this.applyDelta(currentState, delta)
      }
    }

    return currentState
  }

  static applyDelta(state: BattleState, delta: BattleDelta): BattleState {
    // Helper to find pokemon in either team
    const findPokemon = (id: string): { pokemon: Pokemon; isMyTeam: boolean; index: number } | null => {
      const myIndex = state.myTeam.findIndex((p) => p.id === id)
      if (myIndex !== -1) return { pokemon: state.myTeam[myIndex], isMyTeam: true, index: myIndex }

      const enemyIndex = state.enemyTeam.findIndex((p) => p.id === id)
      if (enemyIndex !== -1) return { pokemon: state.enemyTeam[enemyIndex], isMyTeam: false, index: enemyIndex }

      return null
    }

    // Helper to update specific pokemon
    const updatePokemon = (id: string, updateFn: (p: Pokemon) => Pokemon): BattleState => {
      const found = findPokemon(id)
      if (!found) return state

      const newPokemon = updateFn(found.pokemon)
      
      if (found.isMyTeam) {
        const newTeam = [...state.myTeam]
        newTeam[found.index] = newPokemon
        return { ...state, myTeam: newTeam }
      } else {
        const newTeam = [...state.enemyTeam]
        newTeam[found.index] = newPokemon
        return { ...state, enemyTeam: newTeam }
      }
    }

    switch (delta.type) {
      case "HP_ABSOLUTE":
        return updatePokemon(delta.targetId, (p) => ({ ...p, hpPercent: delta.value }))

      case "HP_RELATIVE":
        return updatePokemon(delta.targetId, (p) => ({
          ...p,
          hpPercent: Math.max(0, Math.min(100, p.hpPercent + delta.amount)),
        }))

      case "STATUS_CHANGE":
        return updatePokemon(delta.targetId, (p) => ({
          ...p,
          status: delta.status !== undefined ? delta.status : p.status,
          confusion: delta.confusion !== undefined ? delta.confusion : p.confusion,
          love: delta.love !== undefined ? delta.love : p.love,
          sleepCounter: delta.sleepCounter !== undefined ? delta.sleepCounter : p.sleepCounter,
          confusionCounter: delta.confusionCounter !== undefined ? delta.confusionCounter : p.confusionCounter,
          showSleepCounter: delta.showSleepCounter !== undefined ? delta.showSleepCounter : p.showSleepCounter,
          showConfusionCounter: delta.showConfusionCounter !== undefined ? delta.showConfusionCounter : p.showConfusionCounter,
        }))

      case "SWITCH": {
        const { team, slotIndex, newPokemonId } = delta
        // Update active starters
        const newStarters = { ...state.activeStarters }
        const teamStarters = team === "my" ? [...newStarters.myTeam] : [...newStarters.opponentTeam]
        
        // Find the index of the pokemon definition
        const teamArray = team === "my" ? state.myTeam : state.enemyTeam
        const pokemonIndex = newPokemonId ? teamArray.findIndex(p => p.id === newPokemonId) : null
        
        teamStarters[slotIndex] = pokemonIndex !== -1 && pokemonIndex !== null ? pokemonIndex : null
        
        if (team === "my") {
          newStarters.myTeam = teamStarters
        } else {
          newStarters.opponentTeam = teamStarters
        }

        return { ...state, activeStarters: newStarters }
      }

      case "TAG_UPDATE":
        if (delta.targetId === "field") {
          return { ...state, battlefieldState: { ...state.battlefieldState, customTags: delta.tags } }
        } else if (delta.targetId === "player_side") {
            return { ...state, battlefieldState: { ...state.battlefieldState, playerSide: { ...state.battlefieldState.playerSide, customTags: delta.tags } } }
        } else if (delta.targetId === "opponent_side") {
            return { ...state, battlefieldState: { ...state.battlefieldState, opponentSide: { ...state.battlefieldState.opponentSide, customTags: delta.tags } } }
        } else {
          return updatePokemon(delta.targetId, (p) => ({ ...p, customTags: delta.tags }))
        }

      case "ITEM_UPDATE":
        return updatePokemon(delta.targetId, (p) => ({
          ...p,
          heldItem: delta.heldItem,
          heldItemName: delta.heldItemName ?? p.heldItemName,
        }))

      case "STAT_MODIFIER":
        return updatePokemon(delta.targetId, (p) => ({
          ...p,
          statsModifiers: {
            ...p.statsModifiers!, // Assuming it exists, if not we should init
            [delta.stat]: delta.value
          }
        }))

      case "TERA_UPDATE":
        return updatePokemon(delta.targetId, (p) => ({ ...p, isTerastallized: delta.isTerastallized }))

      case "MEGA_UPDATE":
        return updatePokemon(delta.targetId, (p) => ({ ...p, isMega: delta.isMega }))

      case "MOVE_PP_UPDATE":
        return updatePokemon(delta.targetId, (p) => ({
            ...p,
            attacks: p.attacks.map(att => att.id === delta.moveId ? { ...att, currentPP: delta.currentPP } : att)
        }))

      default:
        return state
    }
  }

  static getStatsModifiersDefault(): StatsModifiers {
    return {
        att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0
    }
  }
  static validateTree(initialState: BattleState, nodes: Map<string, TreeNode>): string[] {
    const invalidNodeIds: string[] = []
    
    const traverse = (nodeId: string, currentState: BattleState) => {
       const node = nodes.get(nodeId)
       if (!node) return
       
       let stateAfterNode = currentState
       let isNodeValid = true
       
       for (const delta of node.deltas) {
          // Check validity for Pokemon-targeted deltas
          if (["HP_ABSOLUTE", "HP_RELATIVE", "STATUS_CHANGE", "ITEM_UPDATE", "STAT_MODIFIER", "TERA_UPDATE", "MEGA_UPDATE", "TAG_UPDATE", "MOVE_PP_UPDATE"].includes(delta.type)) {
              if (delta.type === "TAG_UPDATE" && ["field", "player_side", "opponent_side"].includes((delta as any).targetId)) {
                  // Global targets are always valid
              } else {
                  const targetId = (delta as any).targetId
                  if (!this.findPokemonInState(stateAfterNode, targetId)) {
                      isNodeValid = false
                  }
              }
          }
           // SWITCH check: The newPokemonId must exist if specified
           if (delta.type === "SWITCH" && delta.newPokemonId) {
                if (!this.findPokemonInState(stateAfterNode, delta.newPokemonId)) {
                    isNodeValid = false
                }
           }

          stateAfterNode = this.applyDelta(stateAfterNode, delta)
       }
       
       if (!isNodeValid && node.id !== "root") {
           invalidNodeIds.push(nodeId)
       }
       
       for (const childId of node.children) {
           traverse(childId, stateAfterNode)
       }
    }
    
    if (nodes.has("root")) {
        traverse("root", initialState)
    }
    
    return invalidNodeIds
  }

  private static findPokemonInState(state: BattleState, id: string): boolean {
      return state.myTeam.some(p => p.id === id) || state.enemyTeam.some(p => p.id === id)
  }
}