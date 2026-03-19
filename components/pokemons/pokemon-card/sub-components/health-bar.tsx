"use client"

import { EditableText } from "@/components/shared/editable-text"
import {
  getEffectiveHpMax,
  updatePokemonHpCurrent,
  updatePokemonHpMax,
  updatePokemonHpPercent,
} from "@/lib/utils/hp-utils"
import { Pokemon } from "@/types/types"
import { useRef } from "react"

interface HealthBarProps {
  pokemon?: Pokemon
  isMyTeam?: boolean
  onHpChange?: (updatedPokemon: Pokemon, isMyTeam: boolean) => void
  hpPercent?: number
  hpMode?: "percent" | "hp"
  showText?: boolean
  editable?: boolean
}

export function HealthBar({
  pokemon,
  isMyTeam,
  onHpChange,
  hpPercent: propHpPercent,
  hpMode = "percent",
  showText = true,
  editable = false,
}: HealthBarProps) {
  const hpPercent = pokemon?.hpPercent ?? propHpPercent ?? 0

  const getHealthColor = (hp: number) => {
    if (hp < 20) return "bg-red-500"
    if (hp < 50) return "bg-orange-500"
    return "bg-green-500"
  }

  // Guard: all edit callbacks require pokemon + isMyTeam to be defined.
  const canEdit = editable && !!pokemon && !!onHpChange && isMyTeam !== undefined

  const equationRef = useRef<string | undefined>(pokemon?.rawHpExpression);

  // ── Percent mode ─────────────────────────────────────────────────────────
  const handleHpPercentChange = (newValue: string) => {
    if (!canEdit || !pokemon) return
    const fraction = Number.parseFloat(newValue) // EditableText percent: 0..1
    if (isNaN(fraction)) return
    onHpChange!(updatePokemonHpPercent(pokemon, fraction * 100, equationRef.current), isMyTeam!)
    // keep equationRef for the next updates or reset? The component might re-render.
  }

  // ── HP mode ──────────────────────────────────────────────────────────────
  const handleHpCurrentChange = (newValue: string) => {
    if (!canEdit || !pokemon) return
    const val = parseInt(newValue, 10)
    if (isNaN(val)) return
    onHpChange!(updatePokemonHpCurrent(pokemon, val), isMyTeam!)
  }

  const handleHpMaxChange = (newValue: string) => {
    if (!canEdit || !pokemon) return
    const val = parseInt(newValue, 10)
    if (isNaN(val) || val <= 0) return
    // PP-logic: reset hpCurrent = hpMax
    onHpChange!(updatePokemonHpMax(pokemon, val), isMyTeam!)
  }

  // ── Derived HP values ────────────────────────────────────────────────────
  const hpMax = pokemon ? getEffectiveHpMax(pokemon) : 100
  const hpCurrent = pokemon?.hpCurrent ?? Math.round(hpPercent * hpMax / 100)

  return (
    <div className="flex items-center w-full">
      {showText && <span className="text-xs font-medium text-slate-600 w-6 flex-shrink-0">HP</span>}

      <div className="flex items-center flex-1">
        {/* Health bar — always driven by hpPercent */}
        <div className="flex items-center h-6 flex-1">
          <div className="bg-slate-200 rounded-full h-2 w-full">
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-in-out ${getHealthColor(hpPercent)}`}
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        </div>

        {/* ── EDITABLE — HP mode ── */}
        {showText && canEdit && hpMode === "hp" ? (
          <div className="ml-2 flex-shrink-0 h-6 flex items-center gap-0.5">
            {/* current HP */}
            <EditableText
              value={String(hpCurrent)}
              onChange={handleHpCurrentChange}
              type="number"
              numberMode="integer"
              min={0}
              dynamicMax={() => getEffectiveHpMax(pokemon!)}
              defaultValue={String(hpMax)}
              autoWidth={true}
              fontSize={10}
              fontSizeRatio={0.4}
              rounded={true}
              textAlign="center"
            />
            <span className="text-xs text-slate-400 font-medium">/</span>
            {/* max HP — allowEmpty=false + min=1 → EditableText reverts on empty/invalid */}
            <EditableText
              value={String(hpMax)}
              onChange={handleHpMaxChange}
              type="number"
              numberMode="integer"
              min={1}
              defaultValue="100"
              allowEmpty={false}
              autoWidth={true}
              fontSize={10}
              fontSizeRatio={0.4}
              rounded={true}
              textAlign="center"
            />
          </div>

        /* ── EDITABLE — Percent mode ── */
        ) : showText && canEdit && hpMode === "percent" ? (
          <div className="ml-2 flex-shrink-0 h-6 flex items-center">
            <EditableText
              value={(hpPercent / 100).toString()}
              onChange={handleHpPercentChange}
              rawEquationString={pokemon.rawHpExpression}
              onEquationChange={(eq) => { equationRef.current = eq }}
              type="number"
              numberMode="percent"
              min={0}
              max={1}
              decimals={1}
              defaultValue="1"
              placeholder="ex : 59,6 or = 127/213"
              autoWidth={false}
              width="65px"
              editWidth="144px"
              fontSize={10}
              fontSizeRatio={0.4}
              rounded={true}
              textAlign="center"
            />
          </div>

        /* ── READ-ONLY display ── */
        ) : showText ? (
          <span className="text-xs font-medium w-12 text-center ml-2 flex-shrink-0 h-6 flex items-center justify-center">
            {hpMode === "hp" && pokemon
              ? `${hpCurrent}/${hpMax}`
              : `${hpPercent.toFixed(1)}%`
            }
          </span>
        ) : null}
      </div>
    </div>
  )
}
