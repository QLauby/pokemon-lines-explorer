import { PokemonStatus } from "@/lib/logos"
import { Pokemon, TreeNode } from "@/lib/types"
import { useRef, useState } from "react"

const VERTICAL_SPACING = 45

export function usePokemonBattle() {
  const [currentView, setCurrentView] = useState<"teams" | "combat">("teams")
  const [battleType, setBattleType] = useState<"simple" | "double">("simple")

  const [myTeam, setMyTeam] = useState<Pokemon[]>([])
  const [enemyTeam, setEnemyTeam] = useState<Pokemon[]>([])
  const [nodes, setNodes] = useState<Map<string, TreeNode>>(new Map())
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [battleStarted, setBattleStarted] = useState(false)
  const [scrollX, setScrollX] = useState(0)

  const [newMyPokemonName, setNewMyPokemonName] = useState("")
  const [newOpponentPokemonName, setNewOpponentPokemonName] = useState("")
  const [actionDescription, setActionDescription] = useState("")
  const [actionProbability, setActionProbability] = useState("")
  const [hpChanges, setHpChanges] = useState<{ pokemonId: string; hpChange: number }[]>([])

  const [editingPokemonId, setEditingPokemonId] = useState<string | null>(null)
  const [editingPokemonName, setEditingPokemonName] = useState("")

  const nodeOrder = useRef(1)

  const [activeStarters, setActiveStarters] = useState<{ myTeam: (number | null)[]; opponentTeam: (number | null)[] }>({
    myTeam: [0, 1],
    opponentTeam: [0, 1],
  })

  const getDefaultPokemonName = (team: Pokemon[], teamType: "my" | "opponent") => {
    if (teamType === "my") {
      return `Pokémon ${team.length + 1}`
    } else {
      return `Pokémon ${String.fromCharCode(65 + team.length)}`
    }
  }

  const resetBattleIfNeeded = () => {
    if (battleStarted) {
      setNodes(new Map())
      setSelectedNodeId("")
      setBattleStarted(false)
      setActionDescription("")
      setActionProbability("")
      setHpChanges([])
      setScrollX(0)
    }
  }

  const addPokemon = (teamType: "my" | "opponent") => {
    const team = teamType === "my" ? myTeam : enemyTeam
    const setTeam = teamType === "my" ? setMyTeam : setEnemyTeam
    const inputValue = teamType === "my" ? newMyPokemonName : newOpponentPokemonName
    const setInputValue = teamType === "my" ? setNewMyPokemonName : setNewOpponentPokemonName

    const finalName = inputValue.trim() || getDefaultPokemonName(team, teamType)

    const defaultItemName =
      teamType === "my" ? `Item ${team.length + 1}` : `Item ${String.fromCharCode(65 + team.length)}`

    const defaultAbilityName =
      teamType === "my" ? `Ability ${team.length + 1}` : `Ability ${String.fromCharCode(65 + team.length)}`

    const newPokemon: Pokemon = {
      id: Date.now().toString(),
      name: finalName,
      types: [],
      teraType: undefined,
      heldItemName: defaultItemName,
      abilityName: defaultAbilityName,
      hpPercent: 100,
      attacks: [],
      status: null,
      confusion: false,
      love: false,
      heldItem: false,
      isTerastallized: false,
      isMega: false,
      customTags: [], // Initialize customTags as empty array for new Pokemon
      statsModifiers: {
        att: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
        acc: 0,
        ev: 0,
        crit: 0,
      },
    }

    setTeam([...team, newPokemon])
    setInputValue("")
    resetBattleIfNeeded()
  }

  const removePokemon = (id: string, isMyTeam: boolean) => {
    if (isMyTeam) {
      setMyTeam(myTeam.filter((p) => p.id !== id))
    } else {
      setEnemyTeam(enemyTeam.filter((p) => p.id !== id))
    }
    resetBattleIfNeeded()
  }

  const updatePokemonHealth = (id: string, isMyTeam: boolean, change: number) => {
    const updateTeam = (team: Pokemon[]) =>
      team.map((pokemon) =>
        pokemon.id === id ? { ...pokemon, hpPercent: Math.max(0, Math.min(100, pokemon.hpPercent + change)) } : pokemon,
      )

    if (isMyTeam) {
      setMyTeam(updateTeam(myTeam))
    } else {
      setEnemyTeam(updateTeam(enemyTeam))
    }
  }

  const setPokemonHealth = (id: string, isMyTeam: boolean, newHP: number) => {
    const updateTeam = (team: Pokemon[]) =>
      team.map((pokemon) => (pokemon.id === id ? { ...pokemon, hpPercent: newHP } : pokemon))

    if (isMyTeam) {
      setMyTeam(updateTeam(myTeam))
    } else {
      setEnemyTeam(updateTeam(enemyTeam))
    }
    resetBattleIfNeeded()
  }

  const setPokemonStatus = (
    id: string,
    isMyTeam: boolean,
    updates: {
      status?: PokemonStatus
      confusion?: boolean
      love?: boolean
      sleepCounter?: number
      confusionCounter?: number
    },
  ) => {
    const team = isMyTeam ? myTeam : enemyTeam
    const setTeam = isMyTeam ? setMyTeam : setEnemyTeam

    setTeam(team.map((pokemon) => (pokemon.id === id ? { ...pokemon, ...updates } : pokemon)))
    resetBattleIfNeeded()
  }

  const updatePokemonName = (pokemonId: string, newName: string, isMyTeam: boolean) => {
    const team = isMyTeam ? myTeam : enemyTeam
    const setTeam = isMyTeam ? setMyTeam : setEnemyTeam

    const pokemon = team.find((p) => p.id === pokemonId)
    if (!pokemon) return

    const teamIndex = team.findIndex((p) => p.id === pokemonId)
    const finalName = newName.trim() || getDefaultPokemonName(team.slice(0, teamIndex), isMyTeam ? "my" : "opponent")

    const updatedTeam = team.map((pokemon) => (pokemon.id === pokemonId ? { ...pokemon, name: finalName } : pokemon))
    setTeam(updatedTeam)
    setEditingPokemonId(null)
    setEditingPokemonName("")
    resetBattleIfNeeded()
  }

  const startEditingPokemon = (pokemon: Pokemon) => {
    setEditingPokemonId(pokemon.id)
    setEditingPokemonName(pokemon.name)
  }

  const cancelEditing = () => {
    setEditingPokemonId(null)
    setEditingPokemonName("")
  }

  const initializeBattle = () => {
    if (myTeam.length === 0 && enemyTeam.length === 0) return

    const rootNode: TreeNode = {
      id: "root",
      description: "État Initial",
      probability: 100,
      cumulativeProbability: 100,
      myTeam: [...myTeam],
      enemyTeam: [...enemyTeam],
      children: [],
      parentId: undefined,
      createdAt: nodeOrder.current++,
      turn: 0,
      branchIndex: 0,
      x: 45,
      y: 45,
      hpChanges: [],
    }

    setNodes(new Map([["root", rootNode]]))
    setSelectedNodeId("root")
    setBattleStarted(true)
    setCurrentView("combat")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const calculateBranchPositions = (nodes: Map<string, TreeNode>): Map<string, TreeNode> => {
    const updatedNodes = new Map(nodes)
    const branchMap = new Map<number, number>()

    const uniqueBranches = Array.from(updatedNodes.values())
      .filter((node) => node.branchIndex !== 0)
      .reduce((acc, node) => {
        if (!acc.has(node.branchIndex)) {
          acc.set(node.branchIndex, node)
        }
        return acc
      }, new Map<number, TreeNode>())

    const sortedBranches = Array.from(uniqueBranches.values()).sort((a, b) => {
      if (a.turn !== b.turn) return b.turn - a.turn
      return a.createdAt - b.createdAt
    })

    let yCounter = 1
    sortedBranches.forEach((branch) => {
      branchMap.set(branch.branchIndex, yCounter++)
    })

    updatedNodes.forEach((node) => {
      const yPos = node.branchIndex === 0 ? 45 : 45 + (branchMap.get(node.branchIndex) || 0) * VERTICAL_SPACING

      updatedNodes.set(node.id, { ...node, y: yPos })
    })

    return updatedNodes
  }

  const calculateNodePosition = (parentNode: TreeNode, childIndex: number, nodesMap: Map<string, TreeNode>) => {
    const HORIZONTAL_SPACING = 70
    const newTurn = parentNode.turn + 1
    const x = 45 + newTurn * HORIZONTAL_SPACING

    if (childIndex === 0) {
      return {
        turn: newTurn,
        branchIndex: parentNode.branchIndex,
        x,
        y: parentNode.y,
        updatedNodes: nodesMap,
      }
    }

    const usedBranchIndices = new Set(Array.from(nodesMap.values()).map((n) => n.branchIndex))
    let newBranchIndex = 1
    while (usedBranchIndices.has(newBranchIndex)) {
      newBranchIndex++
    }

    return {
      turn: newTurn,
      branchIndex: newBranchIndex,
      x,
      y: 0,
      updatedNodes: nodesMap,
    }
  }

  const addAction = () => {
    if (!actionDescription || !actionProbability || !selectedNodeId) return

    const parentNode = nodes.get(selectedNodeId)
    if (!parentNode) return

    const nodeId = Date.now().toString()

    const newMyTeam = parentNode.myTeam.map((pokemon) => {
      const change = hpChanges.find((c) => c.pokemonId === pokemon.id)
      if (change) {
        return {
          ...pokemon,
          hpPercent: Math.max(0, Math.min(100, pokemon.hpPercent + change.hpChange)),
        }
      }
      return pokemon
    })

    const newEnemyTeam = parentNode.enemyTeam.map((pokemon) => {
      const change = hpChanges.find((c) => c.pokemonId === pokemon.id)
      if (change) {
        return {
          ...pokemon,
          hpPercent: Math.max(0, Math.min(100, pokemon.hpPercent + change.hpChange)),
        }
      }
      return pokemon
    })

    const childIndex = parentNode.children.length
    const {
      turn,
      branchIndex,
      x,
      y,
      updatedNodes: nodesAfterCalc,
    } = calculateNodePosition(parentNode, childIndex, nodes)

    const newNode: TreeNode = {
      id: nodeId,
      description: actionDescription,
      probability: Number.parseFloat(actionProbability),
      hpChanges: [...hpChanges],
      parentId: selectedNodeId,
      children: [],
      turn,
      branchIndex,
      x,
      y,
      myTeam: newMyTeam,
      enemyTeam: newEnemyTeam,
      cumulativeProbability: parentNode.cumulativeProbability * (Number.parseFloat(actionProbability) / 100),
      createdAt: nodeOrder.current++,
    }

    const updatedParent = { ...parentNode, children: [...parentNode.children, nodeId] }
    let newNodes = new Map(nodesAfterCalc)
    newNodes.set(selectedNodeId, updatedParent)
    newNodes.set(nodeId, newNode)

    newNodes = calculateBranchPositions(newNodes)

    setNodes(newNodes)
    setSelectedNodeId(nodeId)

    setActionDescription("")
    setActionProbability("")
    setHpChanges([])
  }

  const getAllPokemon = () => {
    const currentNode = nodes.get(selectedNodeId)
    if (!currentNode) return []
    return [...currentNode.myTeam, ...currentNode.enemyTeam]
  }

  const handleScroll = (direction: "left" | "right") => {
    const scrollAmount = 70
    if (direction === "left") {
      setScrollX(Math.max(0, scrollX - scrollAmount))
    } else {
      setScrollX(scrollX + scrollAmount)
    }
  }

  const resetBattle = () => {
    setNodes(new Map())
    setSelectedNodeId("")
    setBattleStarted(false)
    setCurrentView("teams")
    setActionDescription("")
    setActionProbability("")
    setHpChanges([])
    setScrollX(0)
  }

  const getTeamCounterDisplay = (teamLength: number) => {
    if (teamLength <= 6) {
      return `${teamLength}/6`
    } else {
      return `${teamLength}/${teamLength}`
    }
  }

  const updatePokemon = (updatedPokemon: Pokemon, isMyTeam: boolean) => {
    const updateTeam = (team: Pokemon[]) =>
      team.map((pokemon) => (pokemon.id === updatedPokemon.id ? updatedPokemon : pokemon))

    if (isMyTeam) {
      setMyTeam(updateTeam(myTeam))
    } else {
      setEnemyTeam(updateTeam(enemyTeam))
    }
    resetBattleIfNeeded()
  }

  const toggleHeldItem = (pokemonId: string, isMyTeam: boolean) => {
    const updateLogic = (p: Pokemon, index: number): Pokemon => {
      const defaultItemName = isMyTeam 
        ? `Item ${index + 1}` 
        : `Item ${String.fromCharCode(65 + index)}`

      if (!p.heldItem) {
        // State 0 -> 1: Turn On. Reset name if it was Mega Stone to avoid jumping to state 2 visual.
        return {
          ...p,
          heldItem: true,
          heldItemName: p.heldItemName === "Mega Stone" ? defaultItemName : (p.heldItemName || defaultItemName),
          isMega: false
        }
      } else {
        if (p.heldItemName !== "Mega Stone") {
          // State 1 -> 2: Switch to Mega Stone
          return { ...p, heldItemName: "Mega Stone", isMega: false }
        } else {
          // State 2 -> 0: Turn Off
          return { ...p, heldItem: false, isMega: false }
        }
      }
    }

    if (isMyTeam) {
      setMyTeam((prev) => prev.map((p, idx) => (p.id === pokemonId ? updateLogic(p, idx) : p)))
    } else {
      setEnemyTeam((prev) => prev.map((p, idx) => (p.id === pokemonId ? updateLogic(p, idx) : p)))
    }
    resetBattleIfNeeded()
  }

  const toggleTerastallized = (pokemonId: string, isMyTeam: boolean) => {
    if (isMyTeam) {
      setMyTeam((prev) => prev.map((p) => (p.id === pokemonId ? { ...p, isTerastallized: !p.isTerastallized } : p)))
    } else {
      setEnemyTeam((prev) => prev.map((p) => (p.id === pokemonId ? { ...p, isTerastallized: !p.isTerastallized } : p)))
    }
    resetBattleIfNeeded()
  }

  const toggleMega = (pokemonId: string, isMyTeam: boolean) => {
    if (isMyTeam) {
      setMyTeam((prev) => prev.map((p) => (p.id === pokemonId ? { ...p, isMega: !p.isMega } : p)))
    } else {
      setEnemyTeam((prev) => prev.map((p) => (p.id === pokemonId ? { ...p, isMega: !p.isMega } : p)))
    }
    resetBattleIfNeeded()
  }

  const isStarterPokemon = (pokemon: Pokemon, index: number, isMyTeam: boolean) => {
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = battleType === "simple" ? 1 : 2
    return starters.slice(0, maxSlots).includes(index)
  }

  const getSlotForPokemon = (index: number, isMyTeam: boolean) => {
    const starters = isMyTeam ? activeStarters.myTeam : activeStarters.opponentTeam
    const maxSlots = battleType === "simple" ? 1 : 2
    const slotIndex = starters.slice(0, maxSlots).indexOf(index)
    return slotIndex !== -1 ? slotIndex + 1 : null
  }

  const handleFlagClick = (index: number, isMyTeam: boolean) => {
    const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
    const currentStarters = [...activeStarters[teamKey]]
    const maxSlots = battleType === "simple" ? 1 : 2

    let indexLeaving: number | null = null

    // Check if it's already selected
    const existingSlot = currentStarters.slice(0, maxSlots).indexOf(index)

    if (existingSlot !== -1) {
      // Already selected, deselect it
      indexLeaving = index
      currentStarters[existingSlot] = null
    } else {
      // Not selected, try to find an empty slot
      if (currentStarters[0] === null) {
        currentStarters[0] = index
      } else if (maxSlots > 1 && currentStarters[1] === null) {
        currentStarters[1] = index
      } else {
        // Both full (or simple and slot 1 full), replace Slot 2 (or Slot 1 for simple)
        if (maxSlots === 1) {
          indexLeaving = currentStarters[0]
          currentStarters[0] = index
        } else {
          indexLeaving = currentStarters[1]
          currentStarters[1] = index
        }
      }
    }

    // Reset data for the Pokemon leaving the field
    if (indexLeaving !== null) {
      const resetData = (p: Pokemon): Pokemon => ({
        ...p,
        confusion: false,
        love: false,
        confusionCounter: 0,
        statsModifiers: {
          att: 0,
          def: 0,
          spa: 0,
          spd: 0,
          spe: 0,
          acc: 0,
          ev: 0,
          crit: 0,
        }
      })

      if (isMyTeam) {
        setMyTeam((prev) => prev.map((p, i) => i === indexLeaving ? resetData(p) : p))
      } else {
        setEnemyTeam((prev) => prev.map((p, i) => i === indexLeaving ? resetData(p) : p))
      }
    }

    setActiveStarters((prev) => ({
      ...prev,
      [teamKey]: currentStarters,
    }))
    resetBattleIfNeeded()
  }

  return {
    state: {
      currentView,
      battleType,
      myTeam,
      enemyTeam,
      nodes,
      selectedNodeId,
      battleStarted,
      scrollX,
      newMyPokemonName,
      newOpponentPokemonName,
      actionDescription,
      actionProbability,
      hpChanges,
      editingPokemonId,
      editingPokemonName,
      activeStarters,
      getSlotForPokemon,
    },
    setters: {
      setCurrentView,
      setBattleType,
      setNewMyPokemonName,
      setNewOpponentPokemonName,
      setActionDescription,
      setActionProbability,
      setHpChanges,
      setSelectedNodeId,     
    },
    actions: {
      addPokemon,
      removePokemon,
      updatePokemonHealth,
      setPokemonHealth,
      setPokemonStatus,
      updatePokemonName,
      startEditingPokemon,
      cancelEditing,
      initializeBattle,
      addAction,
      getAllPokemon,
      handleScroll,
      resetBattle,
      resetBattleIfNeeded,
      getTeamCounterDisplay,
      updatePokemon,
      toggleHeldItem,
      toggleTerastallized,
      toggleMega,
      isStarterPokemon,
      handleFlagClick,
      getDefaultPokemonName
    }
  }
}
