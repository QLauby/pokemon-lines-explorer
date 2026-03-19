
import { Pokemon } from "@/types/types"
import { Eye, Shield, Sparkles, Sword, Target, Wind } from "lucide-react"

interface PokemonCardDisplayStatsProps {
    pokemon: Pokemon
}

export function PokemonCardDisplayStats({ pokemon }: PokemonCardDisplayStatsProps) {
    if (!pokemon.statsModifiers) return null
    const sm = pokemon.statsModifiers

    const renderStat = (label: string, value: number, icon: any) => {
        if (value === 0) return null
        return (
          <div className="flex items-center gap-1 text-[8px] bg-slate-100 px-1 py-0.5 rounded">
            <span className={value > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {value > 0 ? "+" : ""}{value}
            </span>
            <span className="text-slate-500 uppercase">{label}</span>
          </div>
        )
    }

    const hasAnyStat = Object.values(sm).some(val => val !== 0);
    if (!hasAnyStat) return null;

    return (
        <div className="flex flex-wrap gap-0.5">
            {renderStat("Att", sm.att, Sword)}
            {renderStat("Def", sm.def, Shield)}
            {renderStat("SpA", sm.spa, Sparkles)}
            {renderStat("SpD", sm.spd, Shield)}
            {renderStat("Spe", sm.spe, Wind)}
            {renderStat("Acc", sm.acc, Target)}
            {renderStat("Eva", sm.ev, Eye)}
            {renderStat("Crit", sm.crit, Target)}
        </div>
    )
}
