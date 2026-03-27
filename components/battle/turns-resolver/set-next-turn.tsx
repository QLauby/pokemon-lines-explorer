"use client"

import { AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { EditableText } from "@/components/shared/editable-text"
import { Textarea } from "@/components/ui/textarea"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { useBattleEnd } from "@/lib/hooks/use-battle-end"
import { useTurnSimulation } from "@/lib/hooks/use-turn-simulation"
import { floatToFraction } from "@/lib/utils/math-utils"
import { BattleState, Pokemon, TreeNode, TurnData } from "@/types/types"
import { BattleEndMessage } from "./battle-end-message"
import { TurnCopyManager } from "./shared/turn-copy-manager"
import { TurnEditor } from "./shared/turn-editor"

interface SetNextTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  onAddAction: (data: TurnData, probability?: number, description?: string, probabilityExpression?: string) => void
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  onChange?: (update: { mode: "add" | "update"; turnData: TurnData | null }) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  battleType: "simple" | "double"
  currentBattleState?: BattleState
  sessionInitialState?: BattleState
  hpMode?: "percent" | "hp" | "rolls"
}


export function SetNextTurn({
  activePokemon,
  onAddAction,
  onChange,
  myTeam,
  enemyTeam,
  nodes,
  selectedNodeId,
  battleType,
  currentBattleState,
  sessionInitialState,
  hpMode = "percent",
}: SetNextTurnProps) {
  const { isCorrupted } = useCorruptionHandler()
  const [description, setDescription] = useState("")
  const [probability, setProbability] = useState("1")
  const [probabilityExpression, setProbabilityExpression] = useState<string | undefined>(undefined)
  const probabilityExprRef = useRef<string | undefined>(undefined)
  const [injectedTurnData, setInjectedTurnData] = useState<TurnData | undefined>(undefined)
  const [turnEditorKey, setTurnEditorKey] = useState(0)

  const selectedNode = nodes.get(selectedNodeId)
  const nextTurnNumber = (selectedNode?.turn || 0) + 1
  
  // Check for battle end using activePokemon (already includes KO fusions)
  const myActiveCount = activePokemon.filter(p => p.isAlly).length
  const opponentActiveCount = activePokemon.filter(p => !p.isAlly).length
  
  let battleEnd: { isBattleEnd: boolean, winner: 'player' | 'opponent' | null } = { 
    isBattleEnd: false, 
    winner: null 
  }
  
  // No battle end
  if (myActiveCount > 0 && opponentActiveCount > 0) {
    battleEnd = { isBattleEnd: false, winner: null }
  }
  // Clear winner: opponent has no active Pokémon
  else if (opponentActiveCount === 0 && myActiveCount > 0) {
    battleEnd = { isBattleEnd: true, winner: 'player' }
  }
  // Clear loser: player has no active Pokémon
  else if (myActiveCount === 0 && opponentActiveCount > 0) {
    battleEnd = { isBattleEnd: true, winner: 'opponent' }
  }
  // Tie - both players have no active Pokémon
  else if (myActiveCount === 0 && opponentActiveCount === 0) {
    // Use the full battle end hook for tie-breaker logic
    const { getStateAtAction } = useTurnSimulation({
      initialState: sessionInitialState,
      actions: selectedNode?.turnData?.actions || [],
      endOfTurnEffects: selectedNode?.turnData?.endOfTurnEffects || [],
      myTeam,
      enemyTeam,
      activeSlotsCount: battleType === "double" ? 2 : 1,
      hpMode
    })
    
    const tieBreaker = useBattleEnd({
      battleState: currentBattleState || { myTeam, enemyTeam, activeSlots: { myTeam: [], opponentTeam: [] }, battlefieldState: {} as any },
      previousTurnActions: selectedNode?.turnData?.actions,
      getStateAtAction
    })
    
    battleEnd = tieBreaker
  }

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange({ mode: "add", turnData: null })
    }
  }, [onChange])

  // Reset state and calculate smart default probability when selected node changes
  useEffect(() => {
    const parentNode = nodes.get(selectedNodeId)
    if (!parentNode) return

    // Calculate sum of probabilities of existing brothers (current children of selectedNode)
    const existingChildren = parentNode.children
      .map(id => nodes.get(id))
      .filter((n): n is TreeNode => !!n)
    
    const sumProbas = existingChildren.reduce((acc, child) => acc + (child.probability || 0), 0)
    const defaultProb = Math.max(0, 1 - sumProbas)
    
    setProbability(defaultProb.toString())
    
    // If we have a non-trivial probability (like 0.333 or 0.875), 
    // we want to store its irreducible fraction string to avoid precision issues in the UI
    if (defaultProb > 0 && defaultProb < 1) {
        const fraction = "= " + floatToFraction(defaultProb)
        setProbabilityExpression(fraction)
        probabilityExprRef.current = fraction
    } else {
        setProbabilityExpression(undefined)
        probabilityExprRef.current = undefined
    }
    
    setDescription("")
  }, [selectedNodeId, nodes])

  const handleTurnChange = useCallback((turnData: TurnData) => {
      onChange?.({ mode: "add", turnData })
      // Clear injected data once user starts modifying it, to prevent double-copy logic issues
      if (injectedTurnData) setInjectedTurnData(undefined)
  }, [onChange, injectedTurnData])

  useEffect(() => {
    // Reset injected data when switching nodes
    setInjectedTurnData(undefined)
  }, [selectedNodeId])

  const handleCopy = (data: TurnData, desc: string, prob: number, expr?: string) => {
      setInjectedTurnData(data)
      setDescription(desc)
      setProbability(prob.toString())
      setProbabilityExpression(expr)
      probabilityExprRef.current = expr
      setTurnEditorKey(prev => prev + 1)
  }

  const handleReset = () => {
      setInjectedTurnData({ actions: [], endOfTurnEffects: [], postTurnActions: [] })
      setDescription("")
      setTurnEditorKey(prev => prev + 1)
  }

  if (isCorrupted) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
         <AlertTriangle className="h-5 w-5 shrink-0" />
         <div>
            <p className="font-medium">Action Blocked</p>
            <p className="text-sm">Cannot add new turns while battle tree is corrupted.</p>
         </div>
      </div>
    )
  }
  
  // If battle has ended, show victory/defeat message
  if (battleEnd.isBattleEnd && battleEnd.winner) {
    return <BattleEndMessage winner={battleEnd.winner} />
  }

  const handleSave = (turnData: TurnData) => {
    onAddAction(turnData, Number(probability), description, probabilityExprRef.current)
  }

  return (
    <div className="space-y-4">
      {sessionInitialState && (
          <TurnCopyManager 
            allNodes={Array.from(nodes.values())}
            targetInitialState={currentBattleState || sessionInitialState}
            initialBattleState={sessionInitialState}
            currentBranchIndex={selectedNode?.branchIndex || 0}
            onCopy={handleCopy}
            onReset={handleReset}
          />
      )}

      <div className="grid grid-cols-2 gap-4 pb-4 border-b items-center">
         <div className="space-y-1.5 text-center flex flex-col items-center justify-center">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Turn Probability</label>
            <div className="flex justify-center">
                <EditableText
                  value={probability}
                  onChange={setProbability}
                  rawEquationString={probabilityExpression}
                  onEquationChange={(eq) => {
                    setProbabilityExpression(eq)
                    probabilityExprRef.current = eq
                  }}
                  type="number"
                  numberMode="percent"
                  min={0}
                  max={1}
                  decimals={1}
                  defaultValue="1"
                  placeholder="e.g. 12.5 or = 1/8"
                  autoWidth={false}
                  width="100px"
                  editWidth="180px"
                  fontSize={14}
                  fontSizeRatio={0.5}
                  rounded={true}
                  textAlign="center"
                />
            </div>
         </div>
         <div className="space-y-1.5 text-center flex flex-col items-center justify-center">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Turn Description</label>
            <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="min-h-[60px] text-sm text-center resize-none"
            />
         </div>
      </div>

      <TurnEditor
        key={`next-${selectedNodeId}-${turnEditorKey}`}
        initialTurnData={injectedTurnData}
        initialBattleState={currentBattleState}
        activePokemon={activePokemon}
        onSave={handleSave}
        saveLabel="End turn"
        onChange={handleTurnChange}
        myTeam={myTeam}
        enemyTeam={enemyTeam}
        turnNumber={nextTurnNumber}
        battleFormat={battleType}
        hpMode={hpMode}
      />
    </div>
  )
}
