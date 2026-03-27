"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { EditableText } from "@/components/shared/editable-text"
import { Textarea } from "@/components/ui/textarea"
import { useCorruptionHandler } from "@/lib/hooks/tree-corruption/use-corruption-handler"
import { BattleState, Pokemon, TreeNode, TurnData } from "@/types/types"
import { TurnCopyManager } from "./shared/turn-copy-manager"
import { TurnEditor } from "./shared/turn-editor"

interface UpdateCurrentTurnProps {
  selectedNodeId: string
  nodes: Map<string, TreeNode>
  activePokemon: { pokemon: Pokemon; isAlly: boolean }[]
  parentBattleState: BattleState | null
  onUpdateNode: (nodeId: string, updates: Partial<TreeNode>) => void
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
  onChange?: (update: { mode: "add" | "update"; turnData: TurnData | null }) => void
  battleType: "simple" | "double"
  sessionInitialState?: BattleState
  hpMode?: "percent" | "hp" | "rolls"
  readOnly?: boolean
}


export function UpdateCurrentTurn({
  selectedNodeId,
  nodes,
  activePokemon,
  parentBattleState,
  onUpdateNode,
  myTeam,
  enemyTeam,
  onChange,
  battleType,
  sessionInitialState,
  hpMode = "percent",
  readOnly = false,
}: UpdateCurrentTurnProps) {
  const selectedNode = nodes.get(selectedNodeId)
  const { isCorrupted } = useCorruptionHandler()

  const [description, setDescription] = useState(selectedNode?.description || "")
  const [probability, setProbability] = useState(selectedNode?.probability.toString() || "1")
  const [probabilityExpression, setProbabilityExpression] = useState<string | undefined>(selectedNode?.probabilityExpression)
  const probabilityExprRef = useRef<string | undefined>(selectedNode?.probabilityExpression)
  const [injectedTurnData, setInjectedTurnData] = useState<TurnData | undefined>(undefined)
  const [turnEditorKey, setTurnEditorKey] = useState(0)

  // Update local state when selectedNodeId changes
  useEffect(() => {
    if (selectedNode) {
      setDescription(selectedNode.description || "")
      setProbability(selectedNode.probability.toString() || "1")
      setProbabilityExpression(selectedNode.probabilityExpression)
      probabilityExprRef.current = selectedNode.probabilityExpression
    }
  }, [selectedNodeId])

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
        if (onChange) onChange({ mode: "update", turnData: null })
    }
  }, [onChange])
  
  const handleSave = (turnData: TurnData) => {
    if (!selectedNode) return

    onUpdateNode(selectedNodeId, { 
      turnData,
      description,
      probability: Number(probability),
      probabilityExpression: probabilityExprRef.current
    })
  }

  const handleTurnChange = useCallback((turnData: TurnData) => {
      onChange?.({ mode: "update", turnData })
      if (injectedTurnData) setInjectedTurnData(undefined)
  }, [onChange, injectedTurnData])

  useEffect(() => {
    setInjectedTurnData(undefined)
  }, [selectedNodeId])

  const handleCopy = (data: TurnData, desc: string, prob: number, expr?: string) => {
      setInjectedTurnData(data)
      setDescription(desc)
      setProbability(prob.toString())
      setProbabilityExpression(expr)
      probabilityExprRef.current = expr
      setTurnEditorKey(prev => prev + 1)
      
      // Update the node directly since we are in "Update" mode with autoSave
      onUpdateNode(selectedNodeId, {
          turnData: data,
          description: desc,
          probability: prob,
          probabilityExpression: expr
      })
  }

  const handleReset = () => {
    const emptyData = { actions: [], endOfTurnEffects: [], postTurnActions: [] }
    setInjectedTurnData(emptyData)
    setDescription("")
    setTurnEditorKey(prev => prev + 1)
    onUpdateNode(selectedNodeId, {
        turnData: emptyData,
        description: ""
    })
  }

  if (!selectedNode) return <div>No turn selected</div>

  const isTurnZero = selectedNode?.turn === 0

  return (
    <div className="space-y-4">
      {sessionInitialState && !isTurnZero && (
          <TurnCopyManager 
            allNodes={Array.from(nodes.values())}
            targetInitialState={parentBattleState || sessionInitialState}
            initialBattleState={sessionInitialState}
            currentBranchIndex={selectedNode.branchIndex}
            excludeNodeId={selectedNodeId}
            onCopy={handleCopy}
            onReset={handleReset}
          />
      )}

      <div className="grid grid-cols-2 gap-4 pb-4 border-b items-center">
         <div className="space-y-1.5 text-center flex flex-col items-center justify-center">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Turn Probability</label>
            <div className="flex justify-center">
                <EditableText
                  value={isTurnZero ? "1" : probability}
                  onChange={(val) => {
                      if (isTurnZero) return
                      setProbability(val)
                      onUpdateNode(selectedNodeId, { 
                          probability: Number(val), 
                          probabilityExpression: probabilityExprRef.current
                      })
                  }}
                  rawEquationString={isTurnZero ? undefined : probabilityExpression}
                  onEquationChange={(eq) => { 
                      if (isTurnZero) return
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
                  readOnly={isTurnZero}
                />
            </div>
         </div>
         <div className="space-y-1.5 text-center flex flex-col items-center justify-center">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Turn Description</label>
            <Textarea 
                value={description}
                onChange={(e) => {
                    const val = e.target.value
                    setDescription(val)
                    onUpdateNode(selectedNodeId, { description: val })
                }}
                placeholder="Optional description"
                className="min-h-[60px] text-sm text-center resize-none flex items-center justify-center"
            />
         </div>
      </div>

      <TurnEditor
        key={`${selectedNode.id}-${turnEditorKey}`}
        initialTurnData={injectedTurnData || selectedNode.turnData}
        initialBattleState={parentBattleState}
        activePokemon={activePokemon}
        onSave={handleSave}
        saveLabel={isCorrupted ? "Locked due to corruption" : "Update turn"}
        readOnly={isCorrupted}
        myTeam={myTeam}
        enemyTeam={enemyTeam}
        onChange={handleTurnChange}
        turnNumber={selectedNode.turn}
        battleFormat={battleType}
        autoSave={true}
        hpMode={hpMode}
      />
    </div>
  )
}
