import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BattleDelta, SlotReference } from "@/types/types"
import { HpChangeRow } from "./hp-change-row"

function AddActionButton({ 
  onClick, 
  label = "Add", 
  className,
  disabled 
}: {
  onClick: () => void
  label?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-5 px-1.5 text-[10px] hover:bg-background/80", 
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Plus className="h-2.5 w-2.5 mr-1" /> 
      {label}
    </Button>
  )
}


interface EffectsListProps {
  title?: string
  deltas: BattleDelta[]
  options: { label: string; value: SlotReference; isAlly: boolean }[]
  onAdd: () => void
  onUpdate: (index: number, field: "slot" | "value" | "isHealing", value: any) => void
  onRemove: (index: number) => void
  addButtonLabel?: string
}

export function EffectsList({
  title = "Effects",
  deltas,
  options,
  onAdd,
  onUpdate,
  onRemove,
  addButtonLabel = "Add"
}: EffectsListProps) {
  const hpDeltas = deltas
    .map((d: BattleDelta, i: number) => ({ delta: d, originalIndex: i }))
    .filter((item): item is { delta: Extract<BattleDelta, { type: "HP_RELATIVE" }>; originalIndex: number } => 
      item.delta.type === "HP_RELATIVE"
    )

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
          {title}
        </span>
        <AddActionButton onClick={onAdd} label={addButtonLabel} />
      </div>

      <div className="space-y-1.5">
        {hpDeltas.length === 0 ? (
          <div className="text-[11px] text-muted-foreground italic pl-1">No effects</div>
        ) : (
          hpDeltas.map(({ delta, originalIndex }, index) => {
            const absValue = Math.abs(delta.amount)
            const isHealing = delta.amount > 0 || (delta.amount === 0 && !Object.is(delta.amount, -0))

            return (
              <HpChangeRow
                key={`${originalIndex}-${delta.target.side}-${delta.target.slotIndex}`}
                target={delta.target}
                value={absValue}
                isHealing={isHealing}
                options={options}
                onUpdate={(field, val) => onUpdate(originalIndex, field, val)}
                onRemove={() => onRemove(originalIndex)}
                autoFocus={index === hpDeltas.length - 1}
              />
            )
          })
        )}
      </div>
    </>
  )
}
