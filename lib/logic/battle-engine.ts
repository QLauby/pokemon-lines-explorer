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

    // 2. Apply turn data sequentially
    let currentState = JSON.parse(JSON.stringify(initialState)) as BattleState // Deep copy initial state

    for (const node of path) {
      if (node.id === "root") continue
      
      // Process TurnData if visible
      if (node.turnData) {
        // 1. Process Ordered Actions
        for (const action of node.turnData.actions) {
            // Processing the Action main effect (Switch)
            if (action.type === "switch" && action.targetId) {
                currentState = this.applySwitch(currentState, action.actorId, action.targetId)
            }
            
            // Processing consequences (HP Changes)
            for (const delta of action.hpChanges) {
                currentState = this.applyDelta(currentState, delta)
            }
        }
        
        // 2. Process End of Turn
        for (const delta of node.turnData.endOfTurnDeltas) {
             currentState = this.applyDelta(currentState, delta)
        }
      }
    }

    return currentState
  }

  static applySwitch(state: BattleState, oldPokemonId: string, newPokemonId: string): BattleState {
      return state
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
      case "HP_RELATIVE":
        return updatePokemon(delta.targetId, (p) => ({
          ...p,
          hpPercent: p.hpPercent + delta.amount
        }))
    }
    
    // Fallback for safety or if I missed something, but current type only has HP_RELATIVE
    return state
  }

  static validateTree(initialState: BattleState, nodes: Map<string, TreeNode>): string[] {
    // Validation logic needs update too, but for now just return empty or simple check
    return []
  }

  private static findPokemonInState(state: BattleState, id: string): boolean {
      return state.myTeam.some(p => p.id === id) || state.enemyTeam.some(p => p.id === id)
  }

  static getStatsModifiersDefault(): StatsModifiers {
    return {
        att: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ev: 0, crit: 0
    }
  }
}
