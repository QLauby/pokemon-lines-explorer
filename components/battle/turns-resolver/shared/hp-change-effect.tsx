"use client"

import { EditableText } from "@/components/shared/editable-text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { convertAmountLocalToggle, convertPercentDeltaToHp } from "@/lib/utils/hp-utils"
import { floatToFraction } from "@/lib/utils/math-utils"
import { Effect } from "@/types/types"
import React from "react"

interface HpChangeEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    /** HP info from the state snapshot at this point in the tree */
    initialHp?: number
    initialHpMax?: number
    initialHpCurrent?: number
    /** Global session mode */
    hpMode?: "percent" | "hp"
}

export function HpChangeEffect({
    effect,
    onUpdate,
    readOnly,
    initialHp,
    initialHpMax = 100,
    initialHpCurrent,
    hpMode = "percent",
}: HpChangeEffectProps) {
    const delta = effect.deltas[0]

    if (!delta || (delta.type !== "HP_RELATIVE" && delta.type !== "HP_SET")) {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    type HpModeUI = "damage" | "heal" | "set"

    // ── Mode toggle state ───────────────────────────────────────────────
    const [modeUI, setModeUI] = React.useState<HpModeUI>(
        delta.type === "HP_SET" ? "set" : (delta.amount > 0 ? "heal" : "damage")
    )

    React.useEffect(() => {
        if (delta.type === "HP_SET") {
            setModeUI("set")
        } else if (delta.amount !== 0) {
            setModeUI(delta.amount > 0 ? "heal" : "damage")
        }
    }, [delta.type, delta.amount])

    const currentMode: HpModeUI = delta.type === "HP_SET" 
        ? "set" 
        : (delta.amount !== 0 ? (delta.amount > 0 ? "heal" : "damage") : (modeUI === "set" ? "damage" : modeUI))

    // Fallback for visualization before Phase 3 (we treat set like damage by default to avoid breaking)
    const isHealing = currentMode === "heal"

    // ── Local unit toggle (%/HP on this single effect) ───────────────────────
    const isLockedToPercent = hpMode === "percent"
    const storedUnit = delta.unit
    const effectiveUnit = isLockedToPercent ? "percent" : (storedUnit ?? hpMode)

    const handleUnitToggle = () => {
        if (isLockedToPercent) return
        const newUnit = effectiveUnit === "percent" ? "hp" : "percent"
        const hpMax = initialHpMax ?? 100
        const converted = convertAmountLocalToggle(Math.abs(delta.amount), effectiveUnit, hpMax)
        const newAmount = currentMode === "damage" ? -converted : Math.abs(converted)
        let newEq = undefined;
        if (newUnit === "percent") {
            newEq = "= " + floatToFraction(Math.abs(delta.amount) / hpMax);
        }
        
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount, unit: newUnit, rawAmountExpression: newEq } as any]
        })
    }

    const currentAmount = Math.abs(delta.amount)

    const equationRef = React.useRef<string | undefined>(delta.rawAmountExpression);

    const handleAmountChange = (valStr: string) => {
        let val = parseFloat(valStr) || 0;
        if (effectiveUnit === "percent") val = val * 100;
        const newAmount = currentMode === "damage" ? -Math.abs(val) : Math.abs(val)
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount, unit: effectiveUnit, rawAmountExpression: equationRef.current } as any]
        })
    }

    const handleModeToggle = () => {
        const nextMode: Record<HpModeUI, HpModeUI> = {
            "damage": "heal",
            "heal": "set",
            "set": "damage"
        }
        const newMode = nextMode[currentMode]
        setModeUI(newMode)

        const newType = newMode === "set" ? "HP_SET" : "HP_RELATIVE"
        const newAmount = newMode === "damage" ? -currentAmount : currentAmount

        if (currentAmount !== 0 || newType !== delta.type) {
            onUpdate({
                ...effect,
                deltas: [{ ...delta, type: newType, amount: newAmount, unit: effectiveUnit } as any]
            })
        }
    }

    const inputDisplayValue = currentAmount === 0 ? "" : (
        effectiveUnit === "percent"
            ? (currentAmount / 100).toString()
            : currentAmount.toString()
    )

    // ── Visualization ────────────────────────────────────────────────────────
    const getHpColor = (pct: number) => {
        if (pct >= 50) return "bg-green-500"
        if (pct >= 20) return "bg-orange-500"
        return "bg-red-500"
    }

    // Normalize everything to percent coordinates for the bar
    const toPercent = (absAmount: number): number => {
        if (effectiveUnit === "hp") {
            return (absAmount / (initialHpMax ?? 100)) * 100
        }
        return absAmount
    }

    let barContent = null

    if (initialHp !== undefined) {
        const startHp = initialHp
        const maxHp = initialHpMax ?? 100
        const actualStartHp = initialHpCurrent ?? Math.round((startHp / 100) * maxHp)

        let isEffectivelyHealing = currentMode === "heal";
        let endHp = 0;
        let diffPct = 0;
        let actualEndHp = 0;
        let actualDiff = 0;

        if (currentMode === "set") {
            let targetHp = effectiveUnit === "hp" ? currentAmount : Math.round((currentAmount / 100) * maxHp)
            actualEndHp = Math.max(0, Math.min(maxHp, targetHp))
            endHp = (actualEndHp / maxHp) * 100

            if (actualEndHp >= actualStartHp) {
                isEffectivelyHealing = true;
                actualDiff = actualEndHp - actualStartHp
                diffPct = endHp - startHp
            } else {
                isEffectivelyHealing = false;
                actualDiff = actualStartHp - actualEndHp
                diffPct = startHp - endHp
            }
        } else if (currentMode === "heal") {
            const rawHealedPct = toPercent(currentAmount)
            const healedPct = Math.min(100 - startHp, rawHealedPct) 
            endHp = startHp + healedPct
            diffPct = healedPct

            const rawHealedFloor = effectiveUnit === "hp" ? currentAmount : Math.abs(convertPercentDeltaToHp(currentAmount, maxHp))
            actualDiff = Math.min(maxHp - actualStartHp, rawHealedFloor)
            actualEndHp = actualStartHp + actualDiff
        } else {
            const rawDamagePct = toPercent(currentAmount)
            const damagePct = Math.min(startHp, rawDamagePct) 
            endHp = startHp - damagePct
            diffPct = damagePct

            const rawDamageFloor = effectiveUnit === "hp" ? currentAmount : Math.abs(convertPercentDeltaToHp(currentAmount, maxHp))
            actualDiff = Math.min(actualStartHp, rawDamageFloor)
            actualEndHp = actualStartHp - actualDiff
        }

        if (!isEffectivelyHealing) {
            barContent = (
                <>
                    <div
                        className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white", getHpColor(endHp))}
                        style={{ width: `${endHp}%` }}
                    >
                        {endHp > 10 && (hpMode === "hp"
                            ? `${actualEndHp}`
                            : `${endHp.toFixed(0)}%`)}
                    </div>
                    <div
                        className="absolute top-0 h-full bg-red-500/50 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ left: `${endHp}%`, width: `${diffPct}%` }}
                    >
                        {diffPct > 5 && (hpMode === "hp"
                            ? `-${actualDiff}`
                            : `-${diffPct.toFixed(0)}%`)}
                    </div>
                </>
            )
        } else {
            barContent = (
                <>
                    <div
                        className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white", getHpColor(startHp))}
                        style={{ width: `${startHp}%` }}
                    >
                        {startHp > 10 && (hpMode === "hp"
                            ? `${actualStartHp}`
                            : `${startHp.toFixed(0)}%`)}
                    </div>
                    <div
                        className="absolute top-0 h-full bg-green-500/50 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ left: `${startHp}%`, width: `${diffPct}%` }}
                    >
                        {diffPct > 5 && (hpMode === "hp"
                            ? `+${actualDiff}`
                            : `+${diffPct.toFixed(0)}%`)}
                    </div>
                </>
            )
        }
    } else {
        const percentage = Math.min(Math.max(toPercent(currentAmount), 0), 100)
        barContent = (
            <div
                className={cn(
                    "h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white",
                    currentMode === "heal" ? "bg-green-500/50" : currentMode === "damage" ? "bg-red-500/50" : "bg-blue-500/50"
                )}
                style={{ width: `${percentage}%` }}
            >
                {percentage > 5 && `${percentage}%`}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3">
            {/* HP Bar Visualization */}
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200">
                {barContent}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Damage / Healing toggle */}
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                        "w-7 h-7 font-bold text-sm transition-all border",
                        currentMode === "heal"
                            ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        : currentMode === "damage"
                            ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    )}
                    onClick={handleModeToggle}
                    disabled={readOnly}
                    title={currentMode === "heal" ? "Switch to Set (=)" : currentMode === "damage" ? "Switch to Healing (+)" : "Switch to Damage (-)"}
                >
                    {currentMode === "heal" ? "+" : currentMode === "damage" ? "−" : "="}
                </Button>

                <EditableText
                    value={inputDisplayValue}
                    onChange={handleAmountChange}
                    rawEquationString={delta.rawAmountExpression}
                    onEquationChange={(eq) => { equationRef.current = eq }}
                    type="number"
                    numberMode={effectiveUnit === "percent" ? "percent" : "integer"}
                    min={0}
                    max={effectiveUnit === "percent" ? 1 : undefined}
                    decimals={1}
                    defaultValue={effectiveUnit === "percent" ? "1" : "0"}
                    placeholder={effectiveUnit === "percent" ? "ex : 59,6 or = 127/213" : "0"}
                    autoWidth={effectiveUnit === "percent" ? false : true}
                    width={effectiveUnit === "percent" ? "65px" : undefined}
                    editWidth={effectiveUnit === "percent" ? "144px" : undefined}
                    className={effectiveUnit === "percent" ? undefined : "font-bold text-xs"}
                    fontSize={10}
                    fontSizeRatio={0.4}
                    rounded={true}
                    textAlign="center"
                    readOnly={readOnly}
                />

                {/* Unit badge — click to toggle between % and HP */}
                <button
                    type="button"
                    onClick={handleUnitToggle}
                    disabled={readOnly || isLockedToPercent}
                    title={
                        isLockedToPercent 
                            ? "Locked to %" 
                            : (effectiveUnit === "percent" ? "Switch to HP" : "Switch to %")
                    }
                    className={cn(
                        "text-xs font-semibold min-w-[26px] text-center px-1 py-0.5 rounded border transition-colors",
                        (readOnly || isLockedToPercent) ? "cursor-default opacity-80" : "cursor-pointer",
                        effectiveUnit === "hp"
                            ? "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                    )}
                >
                    {effectiveUnit === "hp" ? "HP" : "%"}
                </button>
            </div>
        </div>
    )
}
