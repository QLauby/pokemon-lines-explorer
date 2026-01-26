"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SlotReference } from "@/types/types"
import { ChevronDown, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface HpChangeOption {
  label: string
  value: SlotReference
  isAlly: boolean
}

interface HpChangeRowProps {
  target: SlotReference
  value: number
  isHealing: boolean
  options: HpChangeOption[]
  onUpdate: (field: "slot" | "value" | "isHealing", value: any) => void
  onRemove: () => void
  autoFocus?: boolean
}

export function HpChangeRow({
  target,
  value,
  isHealing,
  options,
  onUpdate,
  onRemove,
  autoFocus,
}: HpChangeRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find the current selected option by value (side and slotIndex)
  const selectedOption = options.find(
    (opt) => opt.value.side === target.side && opt.value.slotIndex === target.slotIndex
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="flex gap-2 items-center mb-4 relative">
      {/* Custom Dropdown Selector */}
      <div className="relative flex-1 min-w-[200px]" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring",
            isOpen && "ring-2 ring-ring"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption ? (
              <span className={cn("font-bold truncate", selectedOption.isAlly ? "text-blue-600" : "text-red-600")}>
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-muted-foreground">Select Pokemon</span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-[200px] overflow-y-auto p-1 custom-select-scrollbar">
              {options.map((option, idx) => {
                const isSelected = option.value.side === target.side && option.value.slotIndex === target.slotIndex
                return (
                  <div
                    key={`${option.value.side}-${option.value.slotIndex}-${idx}`}
                    onClick={() => {
                      onUpdate("slot", option.value)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent"
                    )}
                  >
                    <span className={cn("flex-1 font-semibold", option.isAlly ? "text-blue-600" : "text-red-600")}>
                      {option.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn(
            "w-8 h-10 font-bold transition-all flex-shrink-0 border",
            isHealing
              ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          )}
          onClick={() => onUpdate("isHealing", !isHealing)}
          title={isHealing ? "Click to change to Damage (-)" : "Click to change to Healing (+)"}
        >
          {isHealing ? "+" : "-"}
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="%"
          autoFocus={autoFocus}
          value={value === 0 ? "" : value.toString()}
          onChange={(e) => {
            const valStr = e.target.value
            // Detect sign changes from typing
            if (valStr.includes("-")) onUpdate("isHealing", false)
            if (valStr.includes("+")) onUpdate("isHealing", true)
            
            const raw = valStr.replace(/[^0-9]/g, "")
            const val = parseInt(raw, 10) || 0
            onUpdate("value", val)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className="w-20 text-center font-bold text-lg h-10"
        />
      </div>
      <div className="text-sm font-medium">%</div>
      <Button variant="ghost" size="sm" onClick={onRemove} className="cursor-pointer">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}