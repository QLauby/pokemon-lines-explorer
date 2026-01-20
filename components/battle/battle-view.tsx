import { Pokemon, TreeNode } from "@/lib/types"
import { ActionForm } from "./action-form"
import { BattleTree } from "./battle-tree"
import { CurrentState } from "./current-state"

interface CombatViewProps {
  nodes: Map<string, TreeNode>
  selectedNodeId: string
  scrollX: number
  actionDescription: string
  actionProbability: string
  hpChanges: { pokemonId: string; hpChange: number }[]
  onSelectedNodeChange: (nodeId: string) => void
  onScrollChange: (direction: "left" | "right") => void
  onResetBattle: () => void
  onActionDescriptionChange: (value: string) => void
  onActionProbabilityChange: (value: string) => void
  onHpChangesChange: (changes: { pokemonId: string; hpChange: number }[]) => void
  onAddAction: () => void
  getAllPokemon: () => Pokemon[]
  myTeam: Pokemon[]
  enemyTeam: Pokemon[]
}

export function CombatView({
  nodes,
  selectedNodeId,
  scrollX,
  actionDescription,
  actionProbability,
  hpChanges,
  onSelectedNodeChange,
  onScrollChange,
  onResetBattle,
  onActionDescriptionChange,
  onActionProbabilityChange,
  onHpChangesChange,
  onAddAction,
  getAllPokemon,
  myTeam,
  enemyTeam,
}: CombatViewProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <BattleTree
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          scrollX={scrollX}
          onSelectedNodeChange={onSelectedNodeChange}
          onScrollChange={onScrollChange}
          onResetBattle={onResetBattle}
        />

        {selectedNodeId && (
          <ActionForm
            selectedNodeId={selectedNodeId}
            nodes={nodes}
            actionDescription={actionDescription}
            actionProbability={actionProbability}
            hpChanges={hpChanges}
            onActionDescriptionChange={onActionDescriptionChange}
            onActionProbabilityChange={onActionProbabilityChange}
            onHpChangesChange={onHpChangesChange}
            onAddAction={onAddAction}
            getAllPokemon={getAllPokemon}
          />
        )}
      </div>

      <div className="space-y-4">
        {selectedNodeId && nodes.get(selectedNodeId) && (
          <CurrentState selectedNode={nodes.get(selectedNodeId)!} myTeam={myTeam} enemyTeam={enemyTeam} />
        )}
      </div>
    </div>
  )
}
