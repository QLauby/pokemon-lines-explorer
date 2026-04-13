"use client"

import { Moves } from "@/assets/data-pokemonshowdown/moves"
import { PokemonSprite } from "@/components/shared/pokemon-sprite"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { THEME } from "@/lib/constants/color-constants"
import { cn } from "@/lib/utils/cn"
import { calculateMaxHp, detectFormat, ParsedPokemon, parseShowdownFormat, parseTableFormat } from "@/lib/utils/import-parsers"
import { toShowdownId, getPokemonDetails } from "@/lib/utils/pokedex-utils"
import { Attack, Pokemon } from "@/types/types"
import { AlertCircle, CheckCircle2, Gamepad2, PlusCircle, RefreshCw, Trash2, Upload } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useIsDark } from "@/lib/hooks/use-is-dark"

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TrainerDB {
  game: string;
  id: string;
  splits: {
    name: string;
    trainers: {
      name: string;
      team: any[];
    }[];
  }[];
}

interface Manifest {
  games: { id: string; name: string; file: string }[];
}

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
    const hpMax = calculateMaxHp(p.baseHp || 70, p.ivs?.hp || 31, p.evs?.hp || 0, p.level);
    const attacks: Attack[] = p.moves.map((moveName) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: moveName,
      maxPP: getMoveMaxPP(moveName),
      currentPP: getMoveMaxPP(moveName),
      type: getMoveType(moveName) as any,
    }));

    const dexData = getPokemonDetails(p.name);
    let types = p.types || [];
    if (dexData && dexData.types) {
      types = dexData.types.map((t: string) => t.toLowerCase());
    }

    return {
      name: p.name,
      types: types,
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
      <p className="opacity-70">Paste Showdown export directly (one or more Pokemon separated by a blank line).</p>
      <code className="block mt-1 bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 text-[9px] whitespace-pre border border-black/5 dark:border-white/5">
        {`Pikachu @ Light Ball\nAbility: Static\nEVs: 252 Spe\nTimid Nature\n- Thunderbolt\n- Surf`}
      </code>
    </div>
    <div>
      <p className="font-bold text-[11px] mb-1">📊 Table Format (Excel/Doc)</p>
      <p className="opacity-70">Copy-paste a table from Excel or Google Sheets. Each column = 1 Pokemon.</p>
    </div>
    <div className="pt-1 border-t mt-1 border-current opacity-20" />
    <div className="pt-0">
      <p className="text-amber-500 font-bold flex items-center gap-1">
        <AlertCircle className="h-2.5 w-2.5" /> Note on Health points
      </p>
      <p className="opacity-60 italic">If IV/EV data is missing, HP is calculated using 31 IV and 0 EV (competitive standard).</p>
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
  const isDark = useIsDark();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  
  // Database state
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [db, setDb] = useState<TrainerDB | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedSplit, setSelectedSplit] = useState<string>("");
  const [selectedTrainer, setSelectedTrainer] = useState<string>(""); // Store index as string
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const storageKey = `pokemon-explorer-import-box-${isMyTeam ? 'ally' : 'opponent'}`;

  useEffect(() => {
    if (open) {
      fetch('/data-trainers/manifest.json')
        .then(res => res.json())
        .then(data => setManifest(data))
        .catch(err => console.error("Failed to load trainer manifest", err));
        
      // Load persistence
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { text: st, game: sg, split: ss, trainer: str } = JSON.parse(saved);
          if (st) setText(st);
          if (sg) setSelectedGame(sg);
          if (ss) setSelectedSplit(ss);
          if (str) setSelectedTrainer(str);
        } catch (e) {
          console.error("Failed to load saved box", e);
        }
      }
    }
  }, [open, storageKey]);

  // Save persistence
  useEffect(() => {
    if (open) {
      localStorage.setItem(storageKey, JSON.stringify({
        text,
        game: selectedGame,
        split: selectedSplit,
        trainer: selectedTrainer
      }));
    }
  }, [text, selectedGame, selectedSplit, selectedTrainer, open, storageKey]);

  useEffect(() => {
    if (selectedGame && manifest) {
      const game = manifest.games.find(g => g.id === selectedGame);
      if (game) {
        fetch(`/data-trainers/${game.file}`)
          .then(res => res.json())
          .then(data => {
            setDb(data);
          })
          .catch(err => console.error("Failed to load game DB", err));
      }
    }
  }, [selectedGame, manifest]);

  // Reset trainer selection when game or split changes
  useEffect(() => {
    setSelectedTrainer("");
  }, [selectedGame, selectedSplit]);

  const clearBox = () => {
    setText("");
    setSelectedGame("");
    setSelectedSplit("");
    setSelectedTrainer("");
    setSelectedIndices([]);
    localStorage.removeItem(storageKey);
  };

  const splits = useMemo(() => db?.splits || [], [db]);
  const trainers = useMemo(() => {
    const split = db?.splits.find(s => s.name === selectedSplit);
    if (!split) return [];
    
    return split.trainers.map((t, index) => {
      const cleanName = t.name.split(/[(\-\[]/)[0].trim();
      return {
        ...t,
        index,
        displayName: cleanName || t.name
      };
    });
  }, [db, selectedSplit]);

  const selectedTrainerData = useMemo(() => {
    const idx = parseInt(selectedTrainer, 10);
    if (isNaN(idx)) return undefined;
    return trainers[idx];
  }, [trainers, selectedTrainer]);

  const dbParsed = useMemo<ParsedPokemon[]>(() => {
    if (!selectedTrainerData) return [];
    return selectedTrainerData.team.map(p => ({
      name: p.name,
      level: p.level,
      item: p.item,
      ability: p.ability,
      nature: p.nature,
      moves: p.moves,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      types: ["normal"],
      baseHp: 70
    }));
  }, [selectedTrainerData]);

  const format = useMemo(() => detectFormat(text), [text]);
  const textParsed = useMemo(() => {
    if (!text.trim()) return [];
    if (format === "showdown") return parseShowdownFormat(text);
    if (format === "table") return parseTableFormat(text);
    return [];
  }, [text, format]);

  const currentParsed = dbParsed.length > 0 ? dbParsed : textParsed;
  
  // Reset/Auto-select when current source changes
  useEffect(() => {
    if (dbParsed.length > 0) {
      // Auto-select all for TRAINER imports
      setSelectedIndices(dbParsed.map((_, i) => i));
    } else if (!isMyTeam && textParsed.length > 0) {
      // Auto-select all for OPPONENT text imports
      setSelectedIndices(textParsed.map((_, i) => i));
    } else {
      // Keep empty for TEXT/BOX imports (manual selection mode)
      setSelectedIndices([]);
    }
  }, [dbParsed, currentParsed.length, isMyTeam, textParsed.length]);

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const selectAll = () => setSelectedIndices(currentParsed.map((_, i) => i));
  const clearAll = () => setSelectedIndices([]);

  const canImport = selectedIndices.length > 0;

  const handleImport = () => {
    const ordered = selectedIndices.map(index => currentParsed[index]);
    const pokemons = parsedToPokemons(ordered, hpMode);
    onImport(pokemons, "add");
    setOpen(false);
    setText("");
    setSelectedGame("");
    setSelectedSplit("");
    setSelectedTrainer("");
    setSelectedIndices([]);
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
          className="max-w-[280px] whitespace-normal shadow-xl z-[100]"
          style={{ 
              backgroundColor: THEME.tooltips.bg, 
              color: THEME.tooltips.text,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`
          }}
        >
          {TOOLTIP_CONTENT}
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden border-border bg-card shadow-2xl">
          <AlertDialogHeader className="p-4 border-b shrink-0" style={{ backgroundColor: THEME.battlefield.side_bg }}>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-black" style={{ color: THEME.battlefield.title_text }}>
              <Upload className="h-5 w-5" style={{ color: THEME.common.ally }} />
              Import Pokémon Team
              <span className="text-sm font-normal opacity-50 ml-1">
                {isMyTeam ? "— My Team" : "— Opponent"}
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Left: Quick Import */}
            {!isMyTeam && (
              <div className="md:col-span-2 space-y-3 p-3 py-4 rounded-xl border" style={{ backgroundColor: THEME.battlefield.side_bg, borderColor: THEME.battlefield.main_border }}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight mb-2" style={{ color: THEME.battlefield.title_text }}>
                  <Gamepad2 className="h-3.5 w-3.5" style={{ color: THEME.common.ally }} />
                  Quick Import Game
                </div>
                
                <div className="space-y-2.5">
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="h-6 w-full text-[10px] font-bold bg-white/50 dark:bg-black/20 border-border truncate shadow-none">
                      <SelectValue placeholder="Select Game" />
                    </SelectTrigger>
                    <SelectContent>
                      {manifest?.games.map(g => (
                        <SelectItem key={g.id} value={g.id} className="text-[10px]">{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedSplit} 
                    onValueChange={setSelectedSplit}
                    disabled={!selectedGame || splits.length === 0}
                  >
                    <SelectTrigger className="h-6 w-full text-[10px] font-bold bg-white/50 dark:bg-black/20 border-border truncate shadow-none">
                      <SelectValue placeholder="Select Split / Area" />
                    </SelectTrigger>
                    <SelectContent>
                      {splits.map(s => (
                        <SelectItem key={s.name} value={s.name} className="text-[10px]">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={selectedTrainer} 
                    onValueChange={setSelectedTrainer}
                    disabled={!selectedSplit || trainers.length === 0}
                  >
                    <SelectTrigger className="h-6 w-full text-[10px] font-bold bg-white/50 dark:bg-black/20 border-border truncate shadow-none">
                      <SelectValue placeholder="Select Trainer" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[300px]">
                      {trainers.map((t) => (
                        <SelectItem 
                          key={`${t.name}-${t.index}`} 
                          value={t.index.toString()} 
                          className="text-[10px] group"
                          extra={(
                            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 min-w-[140px]">
                              <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                {t.team.map((p, pi) => (
                                  <PokemonSprite key={pi} name={p.name} className="h-4 w-auto drop-shadow-sm" />
                                ))}
                              </div>
                            </div>
                          )}
                        >
                          <div className="w-[100px] truncate font-bold">
                            {t.displayName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Right: Manual Text Import */}
            <div className={cn("space-y-3", isMyTeam ? "col-span-5" : "md:col-span-3")}>
              <div className="relative">
                <Textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (e.target.value.trim()) setSelectedTrainer("");
                  }}
                  placeholder={
                    !isMyTeam
                      ? "Paste the opponent's team list here (Showdown format OR Doc Tables). It will be parsed and added directly."
                      : "Ideal for full save boxes! Paste your complete list here (Showdown format OR Doc Tables): it will be automatically saved in your session. You can then pick and order (1, 2, 3...) precisely the Pokemons imported for the battle."
                  }
                  className="min-h-[160px] font-mono text-xs resize-none bg-card border-border"
                />
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result Preview */}
          {currentParsed.length > 0 && (
            <div className="rounded-xl border p-4 mt-2 flex flex-col min-h-0 space-y-4 shadow-inner" style={{ backgroundColor: THEME.battlefield.side_bg, borderColor: THEME.battlefield.main_border }}>
              {/* Header Info & Actions */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {currentParsed.length} Pokemon detected ({selectedIndices.length} selected)
                  </div>
                  {selectedTrainerData && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] font-black px-2 py-0 border leading-relaxed shadow-sm"
                      style={{ 
                        backgroundColor: isMyTeam ? THEME.common.ally_bg_tint : THEME.common.opponent_bg_tint,
                        color: teamColor,
                        borderColor: isMyTeam ? THEME.battlefield.side_border_ally : THEME.battlefield.side_border_opponent
                      }}
                    >
                      {selectedTrainerData.name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-card border border-border rounded-md p-0.5 shadow-sm">
                      <button onClick={selectAll} className="px-2 py-0.5 text-[9px] font-bold hover:text-blue-500 transition-colors">ALL</button>
                      <div className="w-px h-3 bg-border my-auto" />
                      <button onClick={clearAll} className="px-2 py-0.5 text-[9px] font-bold hover:text-red-500 transition-colors">NONE</button>
                    </div>
                    <button 
                      onClick={clearBox} 
                      className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase"
                    >
                      <Trash2 className="h-3 w-3" /> CLEAR BOX
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    <RefreshCw className="h-2.5 w-2.5 opacity-50" />
                    <span>Box persisted in session • Click to order</span>
                  </div>
                </div>
              </div>

              {/* Scrollable grid area */}
              <div className="max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
                {currentParsed.map((p, i) => {
                  const selectionOrder = selectedIndices.indexOf(i);
                  const isSelected = selectionOrder !== -1;
                  return (
                    <div 
                        key={i} 
                        onClick={() => toggleSelection(i)}
                        className={cn(
                          "relative flex items-center gap-2 rounded-lg border pr-3 pl-1 py-1 shadow-sm transition-all cursor-pointer select-none",
                          isSelected 
                            ? "bg-card ring-1" 
                            : "bg-black/5 border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                        )}
                        style={{ 
                          borderColor: isSelected ? teamColor : undefined,
                          boxShadow: isSelected ? `0 0 0 1px ${teamColor}` : undefined
                        }}
                    >
                      <div className="relative">
                        <PokemonSprite name={p.name} className="h-6 w-auto" />
                        {isSelected && (
                          <div 
                            className={cn(
                                "absolute -top-1 -left-1 text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white font-black shadow-sm",
                                isMyTeam ? "text-white dark:text-slate-900" : "text-white"
                            )}
                            style={{ backgroundColor: teamColor }}
                          >
                            {selectionOrder + 1}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div 
                          className="text-[9px] font-bold leading-none mb-0.5 truncate"
                          style={{ color: isSelected ? "var(--text-main)" : "var(--text-dim)" }}
                        >
                          {p.name}
                        </div>
                        <div className="text-[8px] truncate" style={{ color: "var(--text-dim)" }}>
                          Lv.{p.level} • {p.nature} • {p.moves.length} moves
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          </div>

          <AlertDialogFooter className="p-4 border-t shrink-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleImport}
              disabled={!canImport}
              style={{ backgroundColor: canImport ? teamColor : undefined }}
              className="text-white min-w-[160px]"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Import {selectedIndices.length} Pokémon
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
