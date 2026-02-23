import { BattleDelta, BattleState, Effect, TreeNode, TurnAction } from "@/types/types"
import { BattleEngine } from "./battle-engine"

export interface TraverseContext {
    action?: TurnAction
    effect?: Effect
    isEot?: boolean
    isPostTurn?: boolean
}

export interface TreeVisitor {
    /** Called when starting to process a node. Return false to abort processing this node and its children. */
    onNodeStart?: (node: TreeNode, state: BattleState) => boolean | void
    /** Called before processing an action. Return false to abort processing this action and the rest of the node. */
    onBeforeAction?: (action: TurnAction, state: BattleState, node: TreeNode) => boolean | void
    /** Called before applying a delta. Return false to abort processing this node and its children. */
    onBeforeDelta?: (delta: BattleDelta, state: BattleState, node: TreeNode, context: TraverseContext) => boolean | void
    /** Called after applying a delta. Return false to abort processing this node and its children. */
    onAfterDelta?: (delta: BattleDelta, state: BattleState, node: TreeNode, context: TraverseContext) => boolean | void
    /** Called after processing a node. Return false to prevent exploring its children. */
    onNodeEnd?: (node: TreeNode, state: BattleState) => boolean | void
}

/**
 * Traverses the battle tree recursively, applying deltas sequentially to maintain
 * an accurate BattleState at every micro-step.
 * 
 * Supports Early Exit: If any visitor callback returns `false`, the traversal
 * for that specific branch is aborted immediately to save performance.
 */
export function traverseTreeWithState(
    nodes: TreeNode[],
    initialState: BattleState,
    visitor: TreeVisitor
) {
    // 1. Find root nodes (nodes without a parent)
    const roots = nodes.filter(n => !n.parentId)

    // Build a children map for fast lookup O(1)
    const childrenMap = new Map<string, TreeNode[]>()
    for (const node of nodes) {
        if (node.parentId) {
            if (!childrenMap.has(node.parentId)) {
                childrenMap.set(node.parentId, [])
            }
            childrenMap.get(node.parentId)!.push(node)
        }
    }

    // Recursive function to process a node and its children
    const processNode = (node: TreeNode, incomingState: BattleState) => {
        // Deep copy the state so parallel branches don't pollute each other
        let currentState = JSON.parse(JSON.stringify(incomingState)) as BattleState

        if (visitor.onNodeStart && visitor.onNodeStart(node, currentState) === false) return

        let aborted = false

        // Helper to process a list of deltas
        const processDeltas = (deltas: BattleDelta[], context: TraverseContext) => {
            if (aborted) return
            for (const delta of deltas) {
                if (visitor.onBeforeDelta && visitor.onBeforeDelta(delta, currentState, node, context) === false) {
                    aborted = true
                    return
                }

                currentState = BattleEngine.applyDelta(currentState, delta)

                if (visitor.onAfterDelta && visitor.onAfterDelta(delta, currentState, node, context) === false) {
                    aborted = true
                    return
                }
            }
        }

        if (node.turnData) {
            // 1. Actions
            for (const action of node.turnData.actions) {
                if (aborted) break
                if (visitor.onBeforeAction && visitor.onBeforeAction(action, currentState, node) === false) {
                    aborted = true
                    break
                }

                // Action-level deltas (SWITCH, PP_CHANGE)
                processDeltas(action.actionDeltas || [], { action })
                
                // Effect-level deltas (HP_RELATIVE, etc.)
                for (const effect of (action.effects || [])) {
                    processDeltas(effect.deltas, { action, effect })
                }
            }

            // 2. End of Turn Effects
            if (!aborted) {
                for (const effect of (node.turnData.endOfTurnEffects || [])) {
                    processDeltas(effect.deltas, { effect, isEot: true })
                }
            }

            // 3. Post Turn Actions
            if (!aborted) {
                for (const action of (node.turnData.postTurnActions || [])) {
                    if (aborted) break
                    if (visitor.onBeforeAction && visitor.onBeforeAction(action, currentState, node) === false) {
                        aborted = true
                        break
                    }

                    processDeltas(action.actionDeltas || [], { action, isPostTurn: true })
                    
                    for (const effect of (action.effects || [])) {
                        processDeltas(effect.deltas, { action, effect, isPostTurn: true })
                    }
                }
            }
        }

        if (aborted) return

        if (visitor.onNodeEnd && visitor.onNodeEnd(node, currentState) === false) return

        // Process children
        const children = childrenMap.get(node.id) || []
        for (const child of children) {
            processNode(child, currentState)
        }
    }

    // Start traversal from roots
    for (const root of roots) {
        processNode(root, initialState)
    }
}
