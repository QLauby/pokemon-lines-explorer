"use client"

import { Counter } from "@/components/shared/counter";
import { cn } from "@/lib/utils/cn";
import { StatsModifiers } from "@/types/types";

interface StatsModifiersDisplayProps {
  modifiers: StatsModifiers;
  onUpdate: (updates: Partial<StatsModifiers>) => void;
  readOnly?: boolean;
}

const MODIFIER_CONFIG = [
  { label: "Att", key: "att", min: -6, max: 6 },
  { label: "Def", key: "def", min: -6, max: 6 },
  { label: "SpA", key: "spa", min: -6, max: 6 },
  { label: "SpD", key: "spd", min: -6, max: 6 },
  { label: "Spe", key: "spe", min: -6, max: 6 },
  { label: "Acc", key: "acc", min: -6, max: 6 },
  { label: "Ev", key: "ev", min: -6, max: 6 },
  { label: "Crit", key: "crit", min: 0, max: 4 },
] as const;

export function StatsModifiersDisplay({ modifiers, onUpdate, readOnly = false }: StatsModifiersDisplayProps) {
  const getModifierColor = (value: number, key: string) => {
    if (value === 0) return "text-gray-400";
    if (key === "crit") return "text-orange-500 font-bold";
    return value > 0 ? "text-blue-500 font-bold" : "text-red-500 font-bold";
  };

  const getLabelColor = (value: number) => {
    if (value === 0) return "text-gray-400";
    return value > 0 ? "text-blue-600/70" : "text-red-600/70";
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-2 py-1 px-1 border-y border-gray-100 bg-gray-50/30 rounded-sm">
      {MODIFIER_CONFIG.map((config) => {
        const value = modifiers[config.key as keyof StatsModifiers];
        return (
          <div key={config.key} className="flex flex-col items-center gap-0.5 min-w-[34px]">
            <span className={cn(
              "text-[10px] font-bold tracking-tight transition-colors duration-300",
              getLabelColor(value)
            )}>
              {config.label}
            </span>
            <Counter
              value={value.toString()}
              onChange={(val) => onUpdate({ [config.key]: parseInt(val) || 0 })}
              min={config.min}
              max={config.max}
              fontSize={12}
              fontSizeRatio={0.6}
              width={26}
              className={cn(
                "transition-all duration-300",
                getModifierColor(value, config.key)
              )}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}
