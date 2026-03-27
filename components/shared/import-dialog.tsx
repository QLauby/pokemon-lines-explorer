"use client"

import { useState, useMemo } from "react"
import { Upload, CheckCircle2, AlertCircle, RefreshCw, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { THEME } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils/cn"
import { detectFormat, parseShowdownFormat, parseTableFormat, calculateMaxHp, ParsedPokemon } from "@/lib/utils/import-parsers"
import { PokemonSprite } from "@/components/shared/pokemon-sprite"
import { Pokemon, Attack } from "@/types/types"
import { Moves } from "@/assets/data-pokemonshowdown/moves"
import { toShowdownId } from "@/lib/utils/pokedex-utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMoveType(moveName: string): string {
  const id = toShowdownId(moveName);
  return Moves[id]?.type?.toLowerCase() || "normal";
}

function getMoveMaxPP(moveName: string): number {
  const id = toShowdownId(moveName);
  return Moves[id]?.pp || 10;
}

function parsedToPokemons(
  parsed: ParsedPokemon[],
  hpMode: "percent" | "hp" | "rolls"
): Omit<Pokemon, "id">[] {
  return parsed.map((p) => {
    const hpMax = calculateMaxHp(p.baseHp, p.ivs.hp, p.evs.hp, p.level);
    const attacks: Attack[] = p.moves.map((moveName) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: moveName,
      maxPP: getMoveMaxPP(moveName),
      currentPP: getMoveMaxPP(moveName),
      type: getMoveType(moveName) as any,
    }));

    return {
      name: p.name,
      types: p.types,
      teraType: p.teraType,
      heldItemName: p.item,
      abilityName: p.ability,
      hpPercent: 100,
      hpMax: hpMax,
      hpCurrent: hpMax,
      attacks,
      status: null,
      confusion: false,
      love: false,
      heldItem: !!p.item,
    };
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TOOLTIP_CONTENT = (
  <div className="space-y-2 text-[10px] leading-relaxed">
    <div>
      <p className="font-bold text-[11px] mb-1">📋 Pokemon Showdown Format</p>
      <p className="text-slate-300">Paste Showdown export directly (one or more Pokemon separated by a blank line).</p>
      <code className="block mt-1 bg-white/10 rounded px-1.5 py-0.5 text-[9px] whitespace-pre">
        {`Pikachu @ Light Ball\nAbility: Static\nEVs: 252 Spe\nTimid Nature\n- Thunderbolt\n- Surf`}
      </code>
    </div>
    <div>
      <p className="font-bold text-[11px] mb-1">📊 Table Format (Excel/Doc)</p>
      <p className="text-slate-300">Copy-paste a table from Excel or Google Sheets. Each column = 1 Pokemon.</p>
    </div>
    <div className="pt-1 border-t border-white/10 mt-1">
      <p className="text-amber-400 font-bold flex items-center gap-1">
        <AlertCircle className="h-2.5 w-2.5" /> Note on Health points
      </p>
      <p className="text-slate-400 italic">If IV/EV data is missing, HP is calculated using 31 IV and 0 EV (competitive standard).</p>
    </div>
  </div>
);

interface ImportDialogProps {
  isMyTeam: boolean;
  hpMode?: "percent" | "hp" | "rolls";
  currentTeamSize: number;
  onImport: (pokemons: Omit<Pokemon, "id">[], mode: "replace" | "add") => void;
}

export function ImportDialog({ isMyTeam, hpMode = "percent", currentTeamSize, onImport }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const format = useMemo(() => detectFormat(text), [text]);
  const parsed = useMemo(() => {
    if (!text.trim()) return [];
    if (format === "showdown") return parseShowdownFormat(text);
    if (format === "table") return parseTableFormat(text);
    return [];
  }, [text, format]);

  const willAdd = parsed.length;
  const canImport = parsed.length > 0;

  const handleImport = () => {
    const pokemons = parsedToPokemons(parsed, hpMode);
    onImport(pokemons, "add");
    setOpen(false);
    setText("");
  };

  const teamColor = isMyTeam ? THEME.common.ally_text : THEME.common.opponent_text;

  return (
    <>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: teamColor }}
            onClick={() => setOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[280px] whitespace-normal bg-slate-900 text-white border-slate-700 shadow-xl z-[100]"
        >
          {TOOLTIP_CONTENT}
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Pokemon
              <span className="text-sm font-normal text-slate-500 ml-1">
                {isMyTeam ? "— My Team" : "— Opponent Team"}
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* Text Area */}
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text here (Showdown format or Excel table)..."
                className="min-h-[180px] font-mono text-xs resize-none bg-slate-50 border-slate-200"
              />
              {/* Format Badge */}
              {text.trim() && (
                <div className="absolute top-2 right-2">
                  {format === "showdown" && (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Showdown
                    </Badge>
                  )}
                  {format === "table" && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Table
                    </Badge>
                  )}
                  {format === "unknown" && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] gap-1">
                      <AlertCircle className="h-3 w-3" /> Unknown format
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Summary of detected Pokemon */}
            {parsed.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-[10px] text-slate-500 font-medium mb-1.5 flex justify-between items-center">
                  <span>{parsed.length} Pokemon detected:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.map((p, i) => (
                    <div 
                        key={i} 
                        className="flex items-center gap-1 bg-white rounded-md border border-slate-300 px-1.5 py-0.5"
                    >
                      <PokemonSprite name={p.name} className="h-4 w-auto" />
                      <span className="text-[10px] font-medium">{p.name}</span>
                      {p.moves.length > 0 && (
                        <span className="text-[9px] text-slate-400">{p.moves.length} moves</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="mt-1">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleImport}
              disabled={!canImport}
              style={{ backgroundColor: canImport ? teamColor : undefined }}
              className="text-white"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add {willAdd > 0 ? `${willAdd} Pokemon` : ""} to Team
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
