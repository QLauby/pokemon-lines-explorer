import { CombatSession, TreeNode, BattleState, SlotReference, Pokemon } from "@/types/types";
import { PokemonStatus } from "@/lib/constants/logos-constants";
import { ModificationType } from "./tree-cleaner";
import { traverseTreeWithState } from "./tree-traversal";
import { BattleEngine } from "./battle-engine";
import { DistributionEngine } from "./distribution-engine";

interface NodeSnapshotInfo {
    // HP / KO Info (per pokemon)
    pokemonStats: Map<string, {
        incomingDead: boolean;
        didFaint: boolean;
        koRisk: number;
    }>;
    // Node-level tree logic conflicts
    statusConflict: boolean;
    transformationConflict: boolean;
}

type NodeSnapshot = Map<string, NodeSnapshotInfo>

/**
 * Computes a detailed snapshot of a node's simulation results and logical integrity.
 */
function computeNodeSnapshot(
    node: TreeNode,
    parentState: BattleState,
    hpMode: "percent" | "hp" | "rolls"
): NodeSnapshotInfo {
    let currentState = JSON.parse(JSON.stringify(parentState)) as BattleState
    let statusConflict = false
    let transformationConflict = false

    // Simulation loop with conflict detection
    if (node.turnData) {
        const processDeltas = (deltas: any[]) => {
            for (const delta of deltas) {
                const conflict = BattleEngine.checkDeltaConflict(currentState, delta);
                if (conflict === "status") statusConflict = true;
                if (conflict === "transformation") transformationConflict = true;
                
                currentState = BattleEngine.applyDelta(currentState, delta, hpMode);
            }
        }

        // Exact processing order as BattleEngine.computeStateAtNode
        for (const action of node.turnData.actions) {
            processDeltas(action.actionDeltas || []);
            for (const effect of (action.effects || [])) {
                processDeltas(effect.deltas || []);
            }
        }
        
        for (const effect of (node.turnData.endOfTurnEffects || [])) {
            processDeltas(effect.deltas || []);
        }

        for (const action of (node.turnData.postTurnActions || [])) {
            processDeltas(action.actionDeltas || []);
            for (const effect of (action.effects || [])) {
                processDeltas(effect.deltas || []);
            }
        }
    }

    // Final Pokemon stats (KO states)
    const pokemonStats = new Map()
    const checkTeam = (isAlly: boolean) => {
        const afterTeam = isAlly ? currentState.myTeam : currentState.enemyTeam
        const beforeTeam = isAlly ? parentState.myTeam : parentState.enemyTeam

        afterTeam.forEach((pokemonAfter, i) => {
            const pokemonBefore = beforeTeam[i]
            if (!pokemonBefore || !pokemonAfter) return
            
            const incomingDead = pokemonBefore.hpPercent <= 0
            const didFaint = pokemonAfter.hpPercent <= 0
            
            const dist = pokemonAfter.statProfile?.distribution
            const risk = dist ? DistributionEngine.getProfileStats(dist).koRisk : (didFaint ? 1 : 0)

            pokemonStats.set(pokemonAfter.id, {
                incomingDead,
                didFaint,
                koRisk: risk
            })
        })
    }
    
    checkTeam(true)
    checkTeam(false)

    return {
        pokemonStats,
        statusConflict,
        transformationConflict
    }
}

function getNodeSnapshot(
    nodes: TreeNode[],
    startingState: BattleState,
    startNodeId: string | null,
    hpMode: "percent" | "hp" | "rolls"
): NodeSnapshot {
    const snapshot: NodeSnapshot = new Map()
    const nodeMap = new Map<string, TreeNode>()
    const childrenMap = new Map<string, string[]>()
    for (const node of nodes) {
        nodeMap.set(node.id, node)
        if (node.parentId) {
            if (!childrenMap.has(node.parentId)) childrenMap.set(node.parentId, [])
            childrenMap.get(node.parentId)!.push(node.id)
        }
    }

    const processNode = (nodeId: string, parentState: BattleState) => {
        const node = nodeMap.get(nodeId)
        if (!node) return

        const info = computeNodeSnapshot(node, parentState, hpMode)
        snapshot.set(nodeId, info)

        const nodeState = BattleEngine.computeStateAtNode(node, parentState, hpMode)
        for (const childId of childrenMap.get(nodeId) || []) {
            processNode(childId, nodeState)
        }
    }

    if (startNodeId === null) {
        for (const node of nodes) {
            if (!node.parentId) processNode(node.id, startingState)
        }
    } else {
        processNode(startNodeId, startingState)
    }

    return snapshot
}

export interface CorruptionResult {
    corruptedNodeIds: string[];
    reasons: Set<"ko" | "status" | "transformation" | "strategic">;
}

/**
 * Compares two tree snapshots to identify nodes that became corrupted.
 */
function compareNodeSnapshots(
    snapshotBefore: NodeSnapshot,
    snapshotAfter: NodeSnapshot
): CorruptionResult {
    const corruptedIds = new Set<string>()
    const reasons = new Set<"ko" | "status" | "transformation" | "strategic">()

    for (const [nodeId, beforeInfo] of snapshotBefore) {
        const afterInfo = snapshotAfter.get(nodeId)
        if (!afterInfo) continue

        let nodeCorrupted = false

        // 1. Check Logic Conflicts
        if (afterInfo.statusConflict && !beforeInfo.statusConflict) {
            nodeCorrupted = true
            reasons.add("status")
        }
        if (afterInfo.transformationConflict && !beforeInfo.transformationConflict) {
            nodeCorrupted = true
            reasons.add("transformation")
        }

        // 2. Check HP / KO Flips
        if (!nodeCorrupted) {
            for (const [pokemonId, beforeStats] of beforeInfo.pokemonStats) {
                const afterStats = afterInfo.pokemonStats.get(pokemonId)
                if (!afterStats) continue

                if (beforeStats.incomingDead !== afterStats.incomingDead) {
                    nodeCorrupted = true
                    reasons.add("ko")
                    break;
                }
                if (!beforeStats.didFaint && afterStats.koRisk === 1) {
                    nodeCorrupted = true
                    reasons.add("ko")
                    break;
                }
                if (beforeStats.didFaint && afterStats.koRisk === 0) {
                   nodeCorrupted = true
                   reasons.add("ko")
                   break;
                }
            }
        }
        
        if (nodeCorrupted) {
            corruptedIds.add(nodeId)
        }
    }
    
    return {
        corruptedNodeIds: Array.from(corruptedIds),
        reasons
    }
}

export function isTreeSignificant(nodes: any[]): boolean {
    if (!nodes || nodes.length === 0) return false;
    
    return nodes.some(node => {
        const hasActions = (node.turnData?.actions || []).some((a: any) => 
            a.metadata?.attackName || 
            a.metadata?.itemName ||
            a.target || 
            (a.actionDeltas || []).length > 0 || 
            (a.effects || []).some((e: any) => (e.deltas || []).length > 0)
        );
        
        const hasEffects = (node.turnData?.endOfTurnEffects || []).some((e: any) => (e.deltas || []).length > 0);
        const hasPostActions = (node.turnData?.postTurnActions || []).some((a: any) => 
            a.metadata?.attackName || 
            a.metadata?.itemName ||
            a.target ||
            (a.actionDeltas || []).length > 0 || 
            (a.effects || []).some((e: any) => (e.deltas || []).length > 0)
        );
        
        return hasActions || hasEffects || hasPostActions;
    });
}

export function detectCorruption(
  originalSession: CombatSession,
  modification: { type: ModificationType; payload: any }
): CorruptionResult {
    const emptyResult: CorruptionResult = { corruptedNodeIds: [], reasons: new Set() };

    if (!isTreeSignificant(originalSession.nodes)) {
        return emptyResult;
    }

    const corruptedIds: string[] = []
    
    const markCorrupted = (nodeId: string) => {
        if (!corruptedIds.includes(nodeId)) {
            corruptedIds.push(nodeId)
        }
    }

    if (modification.type === "CHANGE_HP_MODE") {
        return emptyResult;
    }

    if (modification.type === "CHANGE_DEPLOYMENT") {
        traverseTreeWithState(originalSession.nodes, originalSession.initialState, {
            onNodeStart: (node) => {
                if (node.turn === 0) {
                    const hasStrategicIntent = (node.turnData.actions || []).some(a => 
                        a.metadata?.attackName || a.metadata?.itemName || a.target || 
                        (a.actionDeltas || []).length > 0 || (a.effects || []).some(e => (e.deltas || []).length > 0)
                    )
                    if (hasStrategicIntent || (node.turnData.endOfTurnEffects || []).some(e => (e.deltas || []).length > 0) || (node.turnData.postTurnActions || []).length > 0) {
                        markCorrupted(node.id); return false;
                    }
                } else {
                    markCorrupted(node.id); return false;
                }
            }
        })
        return { corruptedNodeIds: corruptedIds, reasons: new Set(["strategic"]) };
    }

    if (modification.type === "DELETE_POKEMON") {
        const { id: deletedPokemonId } = modification.payload as { id: string, isMyTeam: boolean }
        if (!deletedPokemonId) return emptyResult;

        traverseTreeWithState(originalSession.nodes, originalSession.initialState, {
            onBeforeAction: (action, state, node) => {
                const checksCorruption = (ref?: SlotReference) => {
                    if (!ref) return false
                    const activeSlots = ref.side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam
                    const team = ref.side === "my" ? state.myTeam : state.enemyTeam
                    const activeIdx = activeSlots[ref.slotIndex]
                    if (activeIdx === null || activeIdx === undefined) return false
                    return team[activeIdx]?.id === deletedPokemonId
                }
                if (checksCorruption(action.actor) || checksCorruption(action.target)) { markCorrupted(node.id); return false; }
            },
            onBeforeDelta: (delta, state, node) => {
                const checksCorruption = (ref?: SlotReference) => {
                    if (!ref) return false
                    const activeSlots = ref.side === "my" ? state.activeSlots.myTeam : state.activeSlots.opponentTeam
                    const team = ref.side === "my" ? state.myTeam : state.enemyTeam
                    const activeIdx = activeSlots[ref.slotIndex]
                    if (activeIdx === null || activeIdx === undefined) return false
                    return team[activeIdx]?.id === deletedPokemonId
                }
                if (delta.type === "HP_RELATIVE" || delta.type === "PP_CHANGE") {
                    if (checksCorruption(delta.target as SlotReference)) { markCorrupted(node.id); return false; }
                }
                if (delta.type === "SWITCH") {
                    const team = delta.side === "my" ? state.myTeam : state.enemyTeam
                    if (team[delta.fromSlot]?.id === deletedPokemonId || team[delta.toSlot]?.id === deletedPokemonId) { markCorrupted(node.id); return false; }
                }
            }
        })
        return { corruptedNodeIds: corruptedIds, reasons: new Set(["strategic"]) };
    }

    if (modification.type === "REORDER_POKEMON") {
        const { oldIndex, newIndex, isMyTeam } = modification.payload as { isMyTeam: boolean, oldIndex: number, newIndex: number }
        const teamKey = isMyTeam ? "myTeam" : "opponentTeam"
        const activeSlots = (originalSession.initialState.activeSlots as any)[teamKey]
        if ((activeSlots || []).includes(oldIndex) || (activeSlots || []).includes(newIndex)) {
            return { corruptedNodeIds: ["root"], reasons: new Set(["strategic"]) };
        }
        return emptyResult;
    }

    if (modification.type === "CHANGE_HP_AT_CHECKPOINT") {
        const { scope, hpMode, newInitialState, nodeId, newTurnData } = modification.payload
        const hpModeTyped = (hpMode ?? "percent") as "percent" | "hp" | "rolls"
        const nodesMap = new Map(originalSession.nodes.map((n: TreeNode) => [n.id, n]))

        if (scope === "initial") {
            const snapshotBefore = getNodeSnapshot(originalSession.nodes, originalSession.initialState, null, hpModeTyped)
            const snapshotAfter = getNodeSnapshot(originalSession.nodes, newInitialState, null, hpModeTyped)
            return compareNodeSnapshots(snapshotBefore, snapshotAfter)
        } else {
            const node = nodesMap.get(nodeId)
            if (!node) return emptyResult;
            const parentId = node.parentId
            const parentState = parentId ? BattleEngine.computeState(originalSession.initialState, nodesMap, parentId, hpModeTyped) : originalSession.initialState
            const patchedNodesMap = new Map(nodesMap)
            patchedNodesMap.set(nodeId, { ...node, turnData: newTurnData } as any)
            const patchedNodes = Array.from(patchedNodesMap.values())
            const snapshotBefore = getNodeSnapshot(originalSession.nodes, parentState, nodeId, hpModeTyped)
            const snapshotAfter = getNodeSnapshot(patchedNodes, parentState, nodeId, hpModeTyped)
            return compareNodeSnapshots(snapshotBefore, snapshotAfter)
        }
    }

    return emptyResult;
}
