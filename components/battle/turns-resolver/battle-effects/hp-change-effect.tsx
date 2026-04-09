"use client"

import { EditableText } from "@/components/shared/editable-text"
import { Button } from "@/components/ui/button"
import { PALETTE, THEME } from "@/lib/constants/color-constants"
import { BattleEngine } from "@/lib/logic/battle-engine"
import { DistributionEngine } from "@/lib/logic/distribution-engine"
import { buildRollProfileFromRolls, parseRolls } from "@/lib/logic/roll-engine"
import { cn } from "@/lib/utils"
import { convertAmountLocalToggle, formatKoRisk } from "@/lib/utils/hp-utils"
import { floatToFraction } from "@/lib/utils/math-utils"
import { useIsDark } from "@/lib/hooks/use-is-dark"
import { Effect, StatProfile } from "@/types/types"
import { MoveRight } from "lucide-react"
import React from "react"
import { StatHpBar } from "../../shared/stat-hp-bar"

interface HpChangeEffectProps {
    effect: Effect
    onUpdate: (newEffect: Effect) => void
    readOnly?: boolean
    /** HP info from the state snapshot at this point in the tree */
    initialHp?: number
    initialHpMax?: number
    initialHpCurrent?: number
    initialStatProfile?: import("@/types/types").StatProfile
    /** Global session mode */
    hpMode?: "percent" | "hp" | "rolls"
}

export function HpChangeEffect({
    effect,
    onUpdate,
    readOnly,
    initialHp,
    initialHpMax = 100,
    initialHpCurrent,
    initialStatProfile,
    hpMode = "percent",
}: HpChangeEffectProps) {
    const delta = effect.deltas[0]

    if (!delta || (delta.type !== "HP_RELATIVE" && delta.type !== "HP_SET")) {
        return <div className="text-red-500 text-xs">Invalid Effect State</div>
    }

    type HpModeUI = "damage" | "heal" | "set"

    // ── Mode toggle state ───────────────────────────────────────────────
    const [modeUI, setModeUI] = React.useState<HpModeUI>(
        delta.type === "HP_SET" ? "set" : ((delta.amount ?? 0) > 0 ? "heal" : "damage")
    )

    React.useEffect(() => {
        if (delta.type === "HP_SET") {
            setModeUI("set")
        } else if ((delta.amount ?? 0) !== 0) {
            setModeUI((delta.amount ?? 0) > 0 ? "heal" : "damage")
        }
    }, [delta.type, delta.amount])

    const currentMode: HpModeUI = delta.type === "HP_SET" 
        ? "set" 
        : ((delta.amount ?? 0) !== 0 ? ((delta.amount ?? 0) > 0 ? "heal" : "damage") : (modeUI === "set" ? "damage" : modeUI))

    const [isRollsActive, setIsRollsActive] = React.useState(!!((delta as any).rollProfile))
    const [rollsInputStr, setRollsInputStr] = React.useState((delta as any).rollProfile 
        ? (delta as any).rollProfile.rolls.join("-") 
        : "")
    const [rollError, setRollError] = React.useState<string | null>(null)

    // ── Local unit toggle (%/HP on this single effect) ───────────────────────
    const isLockedToPercent = hpMode === "percent"
    const storedUnit = delta.unit
    const effectiveUnit = isRollsActive ? "hp" : (isLockedToPercent ? "percent" : (storedUnit ?? hpMode))

    const handleUnitToggle = () => {
        if (isLockedToPercent || isRollsActive) return
        const newUnit = effectiveUnit === "percent" ? "hp" : "percent"
        const hpMax = initialHpMax ?? 100
        const converted = convertAmountLocalToggle(Math.abs(delta.amount ?? 0), effectiveUnit, hpMax)
        const newAmount = currentMode === "damage" ? -converted : Math.abs(converted)
        let newEq = undefined;
        if (newUnit === "percent") {
            newEq = "= " + floatToFraction(Math.abs(delta.amount ?? 0) / hpMax);
        }
        
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount, unit: newUnit, rawAmountExpression: newEq } as any]
        })
    }

    const currentAmount = delta.amount // Keep as number | undefined
    // Use isDark to resolve pure hex colors for EditableText button bg
    const isDark = useIsDark()
    const isTargetAlly = delta.target?.side === "my"
    const targetHex = isTargetAlly 
        ? (isDark ? THEME.editable_text.primary_dark : THEME.editable_text.primary_light)
        : (isDark ? THEME.editable_text.opponent_dark : THEME.editable_text.opponent_light)
    const primaryHex = targetHex
    const equationRef = React.useRef<string | undefined>(delta.rawAmountExpression);

    // Sync local state when delta changes (handled by parent or turn updates)
    React.useEffect(() => {
        const hasRolls = (delta as any).rollProfile !== undefined
        setIsRollsActive(hasRolls)
        if (hasRolls && (delta as any).rollProfile) {
            const rolls = (delta as any).rollProfile.rolls
            setRollsInputStr(rolls.join("-"))
        }
        // Also sync our equation ref if it changes externally
        equationRef.current = delta.rawAmountExpression
    }, [delta])

    const handleRollsToggle = () => {
        const isTargetAlly = delta.target?.side === "my"
        
        if (isRollsActive) {
            // Turning OFF rolls: Return to fixed mode
            setIsRollsActive(false)
            setRollError(null)

            const rollProfile = (delta as any).rollProfile
            const rollsVal = rollProfile?.rolls || []
            
            let preservedAmount = Math.abs(delta.amount ?? 0)
            if (rollsVal.length > 0) {
                const minRoll = Math.min(...rollsVal)
                const maxRoll = Math.max(...rollsVal)
                const meanVal = rollsVal.reduce((a:number,b:number)=>a+b,0)/rollsVal.length
                
                if (currentMode === "damage") {
                    // Pessimistic logic for damage
                    preservedAmount = isTargetAlly ? maxRoll : minRoll
                } else {
                    preservedAmount = meanVal
                }
            }
            
            const newAmount = currentMode === "damage" ? -preservedAmount : preservedAmount
            const newDelta = { ...delta, amount: newAmount } as any
            delete newDelta.rollProfile
            
            onUpdate({ ...effect, deltas: [newDelta] })
            setRollsInputStr("")
        } else {
            // Turning ON rolls
            setIsRollsActive(true)
            
            const currentAmountAbs = Math.abs(delta.amount ?? 0)
            const currentAmountStr = currentAmountAbs > 0 ? String(Math.round(currentAmountAbs)) : ""
            
            if (isTargetAlly) {
                setRollsInputStr("")
            } else {
                setRollsInputStr(currentAmountStr)
            }

            // Ensure we are in HP unit when rolls are active
            const hpMax = initialHpMax ?? 100
            const converted = effectiveUnit === "percent" 
                ? convertAmountLocalToggle(currentAmountAbs, "percent", hpMax)
                : currentAmountAbs

            onUpdate({
                ...effect,
                deltas: [{ 
                    ...delta, 
                    amount: currentMode === "damage" ? -converted : converted, 
                    unit: "hp",
                    rollProfile: { rolls: [] } 
                } as any]
            })
        }
    }

    const handleAmountChange = (valStr: string) => {
        let val = parseFloat(valStr);
        if (effectiveUnit === "percent") val = val / 100;
        const newAmount = currentMode === "damage" ? -Math.abs(val) : Math.abs(val)
        
        onUpdate({
            ...effect,
            deltas: [{ 
                ...delta, 
                amount: newAmount, 
                unit: effectiveUnit,
                rollProfile: undefined,
                rawAmountExpression: equationRef.current
            } as any]
        })
    }

    const handleRollsInputChange = (input: string) => {
        setRollsInputStr(input)
        const rolls = parseRolls(input)
        
        if (rolls.length === 0) {
            setRollError("No rolls found")
            return
        }

        const result = buildRollProfileFromRolls(rolls)
        if (!result.ok) {
            setRollError("Invalid data")
            return
        }

        setRollError(null)
        const profile = result.profile!
        
        // Visual confirmation: rewrite with dashes if we identified 16 rolls
        if (rolls.length === 16) {
            setRollsInputStr(profile.rolls.join("-"))
        }

        const meanVal = profile.rolls.reduce((a,b)=>a+b,0) / profile.rolls.length
        const newAmount = currentMode === "damage" ? -meanVal : meanVal
        onUpdate({
            ...effect,
            deltas: [{ ...delta, amount: newAmount, rollProfile: profile } as any]
        })
    }

    const handleModeToggle = () => {
        const nextMode: Record<HpModeUI, HpModeUI> = isRollsActive 
            ? {
                "damage": "heal",
                "heal": "damage",
                "set": "damage"
              }
            : {
                "damage": "heal",
                "heal": "set",
                "set": "damage"
            }
        
        const newMode = nextMode[currentMode]
        
        // Safety: ensure we don't accidentally enter 'set' mode if rolls are active
        if (isRollsActive && newMode === "set") {
            // This should normally be handled by the nextMode mapping but let's be safe
            setModeUI(newMode === "set" ? "damage" : newMode)
            return 
        }

        setModeUI(newMode)

        const newType = newMode === "set" ? "HP_SET" : "HP_RELATIVE"
        const absoluteAmount = currentAmount !== undefined ? Math.abs(currentAmount) : undefined
        const newAmount = (absoluteAmount === undefined || isNaN(absoluteAmount)) 
            ? undefined 
            : (newMode === "damage" ? -absoluteAmount : absoluteAmount)

        // We update the delta IF:
        // - the type changed (e.g. going to/from '=')
        // - OR we have a defined amount to flip
        // - OR we are changing between heal/damage and we need to ensure local modeUI doesn't get overwritten by state sync
        const isPolarityChange = (currentMode === "damage" && newMode === "heal") || (currentMode === "heal" && newMode === "damage")

        if (newType !== delta.type || absoluteAmount !== undefined || isPolarityChange) {
            const newDelta = { 
                ...delta, 
                type: newType, 
                amount: newAmount, 
                unit: effectiveUnit,
                rawAmountExpression: delta.rawAmountExpression
            } as any

            // CRITICAL: Ensure rollProfile is preserved if rolls are active
            if (isRollsActive && !newDelta.rollProfile) {
                newDelta.rollProfile = { rolls: [] }
            }
            
            if (newMode === "set") {
                delete newDelta.rollProfile
                delete newDelta.minAmount
                delete newDelta.maxAmount
            }

            onUpdate({
                ...effect,
                deltas: [newDelta]
            })
        }
    }

    const inputDisplayValue = (currentAmount === undefined || isNaN(currentAmount as number) || currentAmount === 0) ? "" : (
        effectiveUnit === "percent"
            ? (Math.abs(currentAmount as number) / 100).toString()
            : Math.abs(currentAmount as number).toString()
    )

    // ── Visualization Logic ──────────────────────────────────────────────
    const beforeProfile: StatProfile = initialStatProfile ?? {
        distribution: DistributionEngine.createInitialDistribution(
            initialHpCurrent ?? ((initialHp ?? 100) * initialHpMax / 100),
            initialHpMax
        )
    }

    const beforeStats = DistributionEngine.getProfileStats(beforeProfile.distribution)
    const afterProfile = BattleEngine.computeStatProfileAfterDelta(beforeProfile, delta, initialHpMax)
    const afterStats = DistributionEngine.getProfileStats(afterProfile.distribution)

    // --- AUTO REVERSIBILITY LOGIC ---
    React.useEffect(() => {
        if (delta.isForcedKo) {
            // Re-simulate WITHOUT forced KO to see if it's still possible or if it's already certain
            const testProfile = BattleEngine.computeStatProfileAfterDelta(beforeProfile, { ...delta, isForcedKo: false }, initialHpMax)
            const riskStats = DistributionEngine.getProfileStats(testProfile.distribution)
            const koStillPossible = riskStats.minHp <= 0
            const koCertain = riskStats.maxHp <= 0
            
            if (!koStillPossible || koCertain) {
                onUpdate({
                    ...effect,
                    deltas: [{ ...delta, isForcedKo: false } as any]
                })
            }
        }
    }, [delta, beforeProfile, initialHpMax])
    
    const getLegacyHpColor = (pct: number) => {
        if (pct >= 50) return "bg-green-500"
        if (pct >= 20) return "bg-orange-500"
        return "bg-red-500"
    }

    let legacyBarContent = null
    if (initialHp !== undefined) {
        const startHpPct = initialHp
        const maxHp = initialHpMax ?? 100
        const actualStartHp = initialHpCurrent ?? Math.round((startHpPct / 100) * maxHp)
        
        let deltaAmountHp = 0
        const amount = delta.amount
        if (amount !== undefined && !isNaN(amount)) {
            if (delta.type === "HP_SET") {
                const targetHp = delta.unit === "hp" ? Math.abs(amount) : (Math.abs(amount) / 100) * maxHp
                deltaAmountHp = targetHp - actualStartHp
            } else {
                deltaAmountHp = delta.unit === "hp" ? amount : (amount / 100) * maxHp
            }
        }

        const actualEndHpRaw = actualStartHp + deltaAmountHp
        const actualEndHp = Math.max(0, Math.min(maxHp, actualEndHpRaw))
        const endHpPct = (actualEndHp / maxHp) * 100
        const diffPct = Math.abs(endHpPct - startHpPct)
        const isActuallyHealing = deltaAmountHp > 0

        legacyBarContent = (
            <div className="flex-1 h-[20px] bg-slate-900/50 rounded-lg overflow-hidden relative border border-white/10 ring-1 ring-black/50">
                {isActuallyHealing ? (
                    <>
                        <div
                            className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white relative", getLegacyHpColor(startHpPct))}
                            style={{ 
                                width: `${startHpPct}%`,
                                boxShadow: `0 0 10px currentColor`
                            }}
                        >
                            <div className="absolute inset-y-[2px] left-0 right-0 mx-[2px] bg-white/40 rounded-full blur-[0.5px]" />
                            <span className="relative z-10">{startHpPct > 10 && (hpMode !== "percent" ? `${Math.round(actualStartHp)}` : `${startHpPct.toFixed(1)}%`)}</span>
                        </div>
                        <div
                            className="absolute top-0 h-full bg-green-500/30 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white border-l border-white/20"
                            style={{ left: `${startHpPct}%`, width: `${diffPct}%` }}
                        >
                            <span className="relative z-10">{diffPct > 5 && (hpMode !== "percent" ? `+${Math.abs(Math.round(deltaAmountHp))}` : `+${diffPct.toFixed(1)}%`)}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className={cn("absolute top-0 left-0 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white relative", getLegacyHpColor(endHpPct))}
                            style={{ 
                                width: `${endHpPct}%`,
                                boxShadow: `0 0 10px currentColor`
                            }}
                        >
                            <div className="absolute inset-y-[2px] left-0 right-0 mx-[2px] bg-white/40 rounded-full blur-[0.5px]" />
                            <span className="relative z-10">{endHpPct > 10 && (hpMode !== "percent" ? `${Math.round(actualEndHp)}` : `${endHpPct.toFixed(1)}%`)}</span>
                        </div>
                        <div
                            className="absolute top-0 h-full bg-red-500/30 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white border-l border-white/20"
                            style={{ left: `${endHpPct}%`, width: `${diffPct}%` }}
                        >
                            <span className="relative z-10">{diffPct > 5 && (hpMode !== "percent" ? `-${Math.abs(Math.round(actualEndHp - actualStartHp))}` : `-${diffPct.toFixed(1)}%`)}</span>
                        </div>
                    </>
                )}
            </div>
        )
    }

    const isStatDifference = (beforeStats.minHp !== beforeStats.maxHp) || (afterStats.minHp !== afterStats.maxHp)
    const shouldUseTwoLineLayout = isRollsActive || isStatDifference

    // Get the exact distribution profile WITHOUT forced K.O. (for logic and formatting)
    const profileForRisk = BattleEngine.computeStatProfileAfterDelta(beforeProfile, { ...delta, isForcedKo: false } as any, initialHpMax)
    const riskStats = DistributionEngine.getProfileStats(profileForRisk.distribution)

    // KO risk formatting logic (centralized)
    const koProbabilityStr = formatKoRisk(riskStats.koRisk);
    
    // KO is possible if minHp (worst case) <= 0
    const isKoPossible = riskStats.minHp <= 0 && riskStats.maxHp > 0;
    const isCertainKo = riskStats.maxHp <= 0;

    const barsVisualization = !shouldUseTwoLineLayout ? legacyBarContent : (
        <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-1 items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Before</span>
                <StatHpBar
                    hpMax={initialHpMax}
                    hpPercent={initialHp ?? 100}
                    hpCurrent={initialHpCurrent}
                    statProfile={beforeProfile}
                    barHeight={10}
                    className="w-full"
                />
            </div>
            <div className="flex flex-col items-center justify-center pt-3">
                 <MoveRight className="h-4 w-4 text-slate-300" />
                 {(delta.amount ?? 0) !== 0 && (
                     <span className={cn(
                         "text-[9px] font-bold tabular-nums",
                         currentMode === "heal" ? "text-green-600" : currentMode === "damage" ? "text-red-600" : "text-blue-600"
                     )}>
                         {currentMode === "damage" ? "−" : currentMode === "heal" ? "+" : ""}
                         {isRollsActive && (delta as any).rollProfile 
                            ? `${Math.min(...(delta as any).rollProfile.rolls)}~${Math.max(...(delta as any).rollProfile.rolls)}`
                            : (effectiveUnit === "percent" ? `${Math.abs(delta.amount ?? 0).toFixed(1)}%` : Math.abs(delta.amount ?? 0))
                         }
                     </span>
                 )}
            </div>
            <div className="flex-1 flex flex-col gap-1 items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">After</span>
                <StatHpBar
                    hpMax={initialHpMax}
                    hpPercent={(delta.isForcedKo || isCertainKo) ? 0 : (afterStats.median === 0 ? 0.0001 : (afterStats.median / initialHpMax) * 100)}
                    hpCurrent={delta.isForcedKo ? 0 : Math.round(afterStats.median)}
                    statProfile={afterProfile}
                    barHeight={10}
                    className="w-full"
                />
            </div>
        </div>
    )

    const handleForceKo = () => {
        onUpdate({
            ...effect,
            deltas: [{ ...delta, isForcedKo: !delta.isForcedKo } as any]
        })
    }

    const ModeToggleComp = (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
                "w-7 h-7 font-bold text-sm transition-all border shrink-0",
                currentMode === "heal" ? "bg-[var(--color-ally-bg-tint)] text-[var(--color-ally)] border-[var(--color-ally)]/40"
                : currentMode === "damage" ? "bg-[var(--color-opp-bg-tint)] text-[var(--color-opp)] border-[var(--color-opp)]/40"
                : "bg-background text-muted-foreground border-border"
            )}
            onClick={handleModeToggle}
            disabled={readOnly}
        >
            {currentMode === "heal" ? "+" : currentMode === "damage" ? "−" : "="}
        </Button>
    )

    const RollsToggleComp = (hpMode === "rolls") && (
        <button
            type="button"
            onClick={handleRollsToggle}
            disabled={readOnly || currentMode === "set"}
            className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-colors h-5 flex items-center justify-center min-w-[36px]",
                (readOnly || currentMode === "set") ? "cursor-default opacity-20 grayscale" : "cursor-pointer",
                isRollsActive ? "bg-orange-600 border-orange-400 text-white shadow-sm"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            )}
        >
            Rolls
        </button>
    )

    const UnitToggleComp = (
        <button
            type="button"
            onClick={handleUnitToggle}
            disabled={readOnly || isLockedToPercent || isRollsActive}
            className={cn(
                "text-[9px] font-black uppercase min-w-[36px] text-center px-2 py-0.5 rounded border transition-colors h-5 flex items-center justify-center",
                (readOnly || isLockedToPercent || isRollsActive) ? "cursor-default opacity-20 bg-background border-border text-muted-foreground" : "cursor-pointer",
                !isRollsActive && effectiveUnit === "hp" ? "bg-violet-600 border-violet-400 text-white shadow-md glow-active"
                : !isRollsActive && effectiveUnit === "percent" ? "bg-blue-600 border-blue-400 text-white shadow-md glow-active"
                : "bg-background border-border text-muted-foreground"
            )}
        >
            {effectiveUnit === "hp" ? "HP" : "%"}
        </button>
    )

    return (
        <div className="flex flex-col gap-2 w-full">
            {shouldUseTwoLineLayout ? (
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 flex flex-col gap-2 py-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase w-10 text-right shrink-0">Before</span>
                                <div className="flex-1 h-3 flex items-center pr-2">
                                    <StatHpBar
                                        hpMax={initialHpMax}
                                        hpPercent={initialHp ?? 100}
                                        hpCurrent={initialHpCurrent}
                                        statProfile={beforeProfile}
                                        barHeight={8}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[9px] font-black uppercase w-10 text-right shrink-0",
                                    isKoPossible ? "text-red-500 animate-pulse" : "text-slate-400"
                                )}>After</span>
                                <div className="flex-1 h-3 flex items-center pr-2">
                                    <StatHpBar
                                        hpMax={initialHpMax}
                                        hpPercent={(delta.isForcedKo || isCertainKo) ? 0 : (afterStats.median === 0 ? 0.0001 : (afterStats.median / initialHpMax) * 100)}
                                        hpCurrent={delta.isForcedKo ? 0 : Math.round(afterStats.median)}
                                        statProfile={afterProfile}
                                        barHeight={8}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-4 border-l border-r border-slate-200/60 shrink-0 self-stretch">
                            {ModeToggleComp}
                            {isRollsActive ? (
                                <div className="flex flex-col gap-1 justify-center items-center self-stretch">
                                    <EditableText
                                        value={rollsInputStr}
                                        onChange={handleRollsInputChange}
                                        type="text"
                                        placeholder="Paste rolls from calc..."
                                        className="w-48"
                                        rounded={true}
                                        mode="button"
                                        visualMode="border"
                                        textAlign="center"
                                        fontSize={10}
                                        fontWeight="bold"
                                        mainColor={rollError ? "#EF4444" : primaryHex}
                                        readOnly={readOnly}
                                    />
                                </div>
                            ) : (
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
                                    autoWidth={true}
                                    placeholder={
                                        currentMode === "set" 
                                            ? (effectiveUnit === "percent" ? "Target %" : "Target HP...")
                                            : (effectiveUnit === "percent" ? "ex: 25 or = 1/4" : "Amount...")
                                    }
                                    rounded={true}
                                    mode="button"
                                    visualMode="border"
                                    textAlign="center"
                                    fontSize={10}
                                    fontWeight="bold"
                                    mainColor={primaryHex}
                                    readOnly={readOnly}
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-1 items-center justify-center min-w-[45px] shrink-0">
                            {UnitToggleComp}
                            {RollsToggleComp}
                        </div>
                    </div>

                    {isKoPossible && (
                        <div 
                            className="flex items-center justify-between mt-1 pt-2 pb-2 border-t -mx-2 -mb-2 px-4 rounded-b-lg"
                            style={{ 
                                backgroundColor: THEME.ko.bg,
                                borderTopColor: "var(--border-main)"
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span 
                                    className="text-[10px] font-black uppercase tracking-tight"
                                    style={{ color: THEME.ko.uncertain }}
                                >
                                    K.O. Risk detected
                                </span>
                                <div 
                                    className="px-2 py-0.5 text-white text-[10px] font-black rounded shadow-sm glow-active"
                                    style={{ backgroundColor: THEME.ko.uncertain, "--glow-color": THEME.ko.uncertain } as React.CSSProperties}
                                >
                                    {koProbabilityStr}%
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="h-5 text-[10px] font-black uppercase px-3 py-0 transition-all border-none shadow-sm glow-active"
                                style={{ 
                                    backgroundColor: delta.isForcedKo ? THEME.ko.bordeaux : THEME.ko.uncertain,
                                    opacity: delta.isForcedKo ? 1 : 0.8,
                                    "--glow-color": delta.isForcedKo ? THEME.ko.bordeaux : THEME.ko.uncertain
                                } as React.CSSProperties}
                                onClick={handleForceKo}
                            >
                                {delta.isForcedKo ? "K.O. Active" : "Trigger K.O."}
                            </Button>
                        </div>
                    )}

                    {isCertainKo && (
                        <div 
                            className="flex items-center justify-center mt-1 py-1.5 -mx-2 -mb-2 rounded-b-lg border-t gap-2"
                            style={{ 
                                backgroundColor: THEME.ko.bg,
                                borderTopColor: "var(--border-main)"
                            }}
                        >
                             <div 
                                className="px-1.5 py-0.5 text-white text-[8px] font-black rounded uppercase tracking-wider shadow-sm glow-active"
                                style={{ backgroundColor: THEME.ko.bordeaux, "--glow-color": THEME.ko.bordeaux } as React.CSSProperties}
                             >
                                 Guaranteed K.O.
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                /* STANDALONE SINGLE LINE LAYOUT (Fixed Damage or No Variance) */
                <div className="flex items-center gap-4">
                    {barsVisualization}
                    <div className="flex items-center gap-2 shrink-0">
                        {ModeToggleComp}
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
                            autoWidth={true}
                            placeholder={
                                currentMode === "set" 
                                    ? (effectiveUnit === "percent" ? "Target %" : "Target HP...")
                                    : (effectiveUnit === "percent" ? "ex: 25 or = 1/4" : "Amount...")
                            }
                            rounded={true}
                            mode="button"
                            visualMode="border"
                            textAlign="center"
                            fontSize={10}
                            fontWeight="bold"
                            mainColor={primaryHex}
                            readOnly={readOnly}
                        />
                        <div className="flex flex-col gap-1 items-center justify-center min-w-[45px] shrink-0">
                            {UnitToggleComp}
                            {RollsToggleComp}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
