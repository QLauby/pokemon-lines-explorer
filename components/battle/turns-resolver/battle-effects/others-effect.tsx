import { Plus, RotateCcw } from "lucide-react"
import { useMemo } from "react"

import { CircularButton } from "@/components/shared/circular-button"
import { CustomTag } from "@/components/shared/custom-tag"
import { THEME } from "@/lib/constants/color-constants"
import { useIsDark } from "@/lib/hooks/use-is-dark"
import { BattleEngine } from "@/lib/logic/battle-engine"
import { generateTagId } from "@/lib/utils/tags-utils"
import { CustomTagData, Effect, OtherOperation } from "@/types/types"



interface OthersEffectProps {
  effect: Effect
  onUpdate: (newEffect: Effect) => void
  readOnly?: boolean
  initialTags?: CustomTagData[]
}

export function OthersEffect({
  effect,
  onUpdate,
  readOnly,
  initialTags = [],
}: OthersEffectProps) {
  const delta = effect.deltas[0]
  const isDark = useIsDark()
  const hex = isDark ? THEME.tags.dark : THEME.tags.light

  if (!delta || delta.type !== "OTHERS_EFFECT_DELTAS") {
    return <div className="text-red-500 text-xs text-center">Invalid Effect State</div>
  }

  const currentOperations = delta.operations || []

  // Compute the resulting tags after applying all operations in this delta
  const finalTags = useMemo(() => {
    return BattleEngine.applyOtherOperations(initialTags, currentOperations)
  }, [initialTags, currentOperations])

  // Identify deleted tags (present in initial but missing in final)
  const deletedTags = useMemo(() => {
    const finalIds = new Set(finalTags.map((t) => t.id))
    return initialTags.filter((t) => !finalIds.has(t.id))
  }, [initialTags, finalTags])

  const handleAddOperation = (op: OtherOperation) => {
    if (readOnly) return
    onUpdate({
      ...effect,
      deltas: [{ ...delta, operations: [...currentOperations, op] }],
    })
  }

  const handleUpdateTag = (tagId: string, updatedTag: CustomTagData) => {
    if (readOnly) return

    // Find the current intermediate tag to compare
    const currentTag = finalTags.find(t => t.id === tagId);
    if (!currentTag) return;

    // 1. Handle Rename
    if (updatedTag.name !== currentTag.name) {
      const existingCreateIdx = currentOperations.findIndex(
        (op) => op.type === "CREATE" && op.id === tagId
      )
      if (existingCreateIdx !== -1) {
        const newOps = [...currentOperations]
        newOps[existingCreateIdx] = {
          ...(newOps[existingCreateIdx] as Extract<OtherOperation, { type: "CREATE" }>),
          name: updatedTag.name,
        }
        onUpdate({ ...effect, deltas: [{ ...delta, operations: newOps }] })
        return
      }
      handleAddOperation({ type: "RENAME", id: tagId, newName: updatedTag.name })
      return
    }

    // 2. Handle Toggle Counter
    if (updatedTag.showCount !== currentTag.showCount) {
      handleAddOperation({ type: "COUNTER_TOGGLE", id: tagId, show: updatedTag.showCount })
      return;
    }
    
    // 3. Handle Counter Change
    if (updatedTag.count !== currentTag.count) {
        const amount = (updatedTag.count ?? 0) - (currentTag.count ?? 0);
        if (amount !== 0) {
            handleAddOperation({ type: "COUNTER_RELATIVE", id: tagId, amount });
        }
    }
  }

  const handleDeleteTag = (tagId: string) => {
    if (readOnly) return
    // Check if we are deleting something we just created
    const createIdx = currentOperations.findIndex(op => op.type === "CREATE" && op.id === tagId);
    if (createIdx !== -1) {
        const newOps = currentOperations.filter((_, i) => i !== createIdx);
        onUpdate({ ...effect, deltas: [{ ...delta, operations: newOps }] });
        return;
    }
    handleAddOperation({ type: "DELETE", id: tagId })
  }

  const handleUndoDelete = (tagId: string) => {
    if (readOnly) return
    const newOps = currentOperations.filter(op => !(op.type === "DELETE" && op.id === tagId));
    onUpdate({ ...effect, deltas: [{ ...delta, operations: newOps }] });
  }

  const getTagStyleProps = (tag: CustomTagData) => {
    const initial = initialTags.find(t => t.id === tag.id);
    const isNew = !initial;
    
    const virtualInitial = { showCount: false, count: 0, name: tag.name };
    const effectiveInitial = initial || virtualInitial;

    // 1. Base style — sober hex colors that darkenColor() can process
    let styleProps: {
        mainColor: string
        darkTextColor: string
        lightTextColor: string
        toggleColor: string | undefined
        counterColor: string | undefined
    } = {
        mainColor:      hex.base_bg,
        darkTextColor:  hex.base_text,
        lightTextColor: hex.base_text,
        toggleColor: undefined,
        counterColor: undefined
    };

    if (isNew) {
        styleProps.mainColor = hex.added_bg;
        styleProps.darkTextColor = hex.added_text;
        styleProps.lightTextColor = hex.added_text;
    } else if (initial.name !== tag.name) {
        styleProps.mainColor = hex.renamed_bg;
        styleProps.darkTextColor = hex.renamed_text;
        styleProps.lightTextColor = hex.renamed_text;
    }

    // 2. Feedback (Toggle/Counter)
    const GREEN = isDark ? THEME.tags.dark.added_text  : THEME.tags.light.renamed_text
    const RED   = isDark ? "#f87171" : "#dc2626"
    if (tag.showCount !== effectiveInitial.showCount) {
        styleProps.toggleColor = tag.showCount ? GREEN : RED;
    }
    if (tag.count !== effectiveInitial.count) {
        const current = tag.count ?? 0;
        const prev = effectiveInitial.count ?? 0;
        if (current > prev) styleProps.counterColor = GREEN;
        else if (current < prev) styleProps.counterColor = RED;
    }

    return styleProps;
  }

  const handleCreateTag = () => {
    // Generate unique numbering across current operations the turn
    const totalCount = initialTags.length + currentOperations.filter(op => op.type === "CREATE").length + 1;
    handleAddOperation({ 
        type: "CREATE", 
        id: generateTagId(), 
        name: `Tag ${totalCount}` 
    });
  }

  return (
    <div className="flex flex-col gap-2 py-1 px-1">
      <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
        
        {/* Active & Modified Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
            {finalTags.map((tag) => {
            const styleProps = getTagStyleProps(tag);
            return (
                <div key={tag.id} className="relative group">
                <CustomTag
                    tag={tag}
                    onUpdate={(updated) => handleUpdateTag(tag.id, updated)}
                    onDelete={() => handleDeleteTag(tag.id)}
                    mainColor={styleProps.mainColor}
                    darkTextColor={styleProps.darkTextColor}
                    lightTextColor={styleProps.lightTextColor}
                    toggleColor={styleProps.toggleColor}
                    counterColor={styleProps.counterColor}
                    readOnly={readOnly}
                    fontSize={10}
                />
                </div>
            );
            })}
        </div>

        {/* Add Button */}
        {!readOnly && (
            <div className="flex items-center">
                <CircularButton
                    isActive={false}
                    onClick={handleCreateTag}
                    icon={Plus}
                    activeColor=""
                    inactiveColor="bg-[var(--tag-btn-bg)] text-[var(--tag-btn-text)] hover:opacity-80"
                    title="Ajouter un tag"
                    diameter={13}
                    iconRatio={0.7}
                    variant="filled"
                    readOnly={readOnly}
                />
            </div>
        )}

        {/* Vertical Separator and Deleted Tags */}
        {deletedTags.length > 0 && !readOnly && (
            <>
                <div className="w-[1px] h-4 bg-border mx-1" />
                
                <div className="flex flex-wrap items-center gap-1.5">
                    {deletedTags.map((tag) => (
                    <div
                        key={tag.id}
                        className="group flex items-center rounded-full pl-2 pr-1.5 py-0.5 text-[10px] h-[22px] animate-in fade-in zoom-in duration-200 border"
                        style={{ backgroundColor: "var(--tag-remove-bg)", borderColor: "var(--tag-remove-text)", color: "var(--tag-remove-text)", opacity: 0.85 }}
                    >
                        <span className="font-medium mr-1.5 line-through opacity-70">{tag.name}</span>
                        <button
                            onClick={() => handleUndoDelete(tag.id)}
                            className="w-4 h-4 flex items-center justify-center rounded-full hover:opacity-100 opacity-60 transition-opacity"
                            style={{ color: "var(--tag-remove-text)" }}
                            title="Annuler la suppression"
                        >
                            <RotateCcw className="h-2.5 w-2.5" />
                        </button>
                    </div>
                ))}
                </div>
            </>
        )}
      </div>
    </div>
  )
}
