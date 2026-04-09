import { Abilities } from "@/assets/data-pokemonshowdown/abilities";
import { Items } from "@/assets/data-pokemonshowdown/items";
import { Moves } from "@/assets/data-pokemonshowdown/moves";
import { Pokedex } from "@/assets/data-pokemonshowdown/pokedex";
import { PokemonType } from "./colors-utils";
import { toShowdownId, canonicalizePokemonName } from "./pokedex-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedPokemon {
  name: string;
  types: PokemonType[];
  item?: string;
  ability?: string;
  teraType?: PokemonType;
  nature?: string;
  level: number;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];
  baseHp: number;
}

const DEFAULT_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

// ─── HP Formula (Gen 3+) ──────────────────────────────────────────────────────

export function calculateMaxHp(baseHp: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

// ─── Pokedex helpers ──────────────────────────────────────────────────────────

function getPokemonData(name: string) {
  const canonical = canonicalizePokemonName(name);
  const id = toShowdownId(canonical);
  return Pokedex[id] || null;
}

function resolveTypes(name: string): PokemonType[] {
  const data = getPokemonData(name);
  if (!data) return [];
  return data.types.map((t: string) => t.toLowerCase() as PokemonType);
}

function resolveBaseHp(name: string): number {
  const data = getPokemonData(name);
  return data?.baseStats?.hp ?? 45;
}

// ─── Showdown Parser ──────────────────────────────────────────────────────────

const NATURES = new Set([
  "hardy", "lonely", "brave", "adamant", "naughty",
  "bold", "docile", "relaxed", "impish", "lax",
  "timid", "hasty", "serious", "jolly", "naive",
  "modest", "mild", "quiet", "bashful", "rash",
  "calm", "gentle", "sassy", "careful", "quirky",
]);

function parseEvLine(line: string): Partial<ParsedPokemon["evs"]> {
  const result: Partial<ParsedPokemon["evs"]> = {};
  const parts = line.replace(/^EVs:\s*/i, "").split("/");
  for (const part of parts) {
    const m = part.trim().match(/(\d+)\s+(\w+)/);
    if (!m) continue;
    const val = parseInt(m[1]);
    const stat = m[2].toLowerCase();
    if (stat === "hp") result.hp = val;
    else if (stat === "atk") result.atk = val;
    else if (stat === "def") result.def = val;
    else if (stat === "spa") result.spa = val;
    else if (stat === "spd") result.spd = val;
    else if (stat === "spe") result.spe = val;
  }
  return result;
}

function parseIvLine(line: string): Partial<ParsedPokemon["ivs"]> {
  const result: Partial<ParsedPokemon["ivs"]> = {};
  const parts = line.replace(/^IVs:\s*/i, "").split("/");
  for (const part of parts) {
    const m = part.trim().match(/(\d+)\s+(\w+)/);
    if (!m) continue;
    const val = parseInt(m[1]);
    const stat = m[2].toLowerCase();
    if (stat === "hp") result.hp = val;
    else if (stat === "atk") result.atk = val;
    else if (stat === "def") result.def = val;
    else if (stat === "spa") result.spa = val;
    else if (stat === "spd") result.spd = val;
    else if (stat === "spe") result.spe = val;
  }
  return result;
}

export function parseShowdownFormat(text: string): ParsedPokemon[] {
  const blocks = text.trim().split(/\n\s*\n/);
  const result: ParsedPokemon[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    let rawName = firstLine;
    let item: string | undefined;

    if (firstLine.includes("@")) {
      const [namePart, itemPart] = firstLine.split("@");
      rawName = namePart.trim();
      item = itemPart.trim();
    }

    const name = canonicalizePokemonName(rawName);

    if (!name || name === "@") continue;

    let ability: string | undefined;
    let teraType: PokemonType | undefined;
    let nature: string | undefined;
    let level = 50;
    let evs = { ...DEFAULT_EVS };
    let ivs = { ...DEFAULT_IVS };
    const moves: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (/^Ability:/i.test(line)) {
        ability = line.replace(/^Ability:\s*/i, "").trim();
      } else if (/^Tera Type:/i.test(line)) {
        teraType = line.replace(/^Tera Type:\s*/i, "").trim().toLowerCase() as PokemonType;
      } else if (/^Level:/i.test(line)) {
        level = parseInt(line.replace(/^Level:\s*/i, "").trim()) || 50;
      } else if (/^EVs:/i.test(line)) {
        evs = { ...evs, ...parseEvLine(line) };
      } else if (/^IVs:/i.test(line)) {
        ivs = { ...ivs, ...parseIvLine(line) };
      } else if (/Nature$/i.test(line)) {
        const n = line.replace(/\s*Nature$/i, "").trim().toLowerCase();
        if (NATURES.has(n)) nature = n;
      } else if (line.startsWith("- ")) {
        const moveName = line.slice(2).trim();
        if (moveName) moves.push(moveName);
      }
    }

    const types = resolveTypes(name);
    const baseHp = resolveBaseHp(name);

    result.push({
      name,
      types,
      item: item || undefined,
      ability: ability || undefined,
      teraType,
      nature,
      level,
      evs,
      ivs,
      moves,
      baseHp,
    });
  }

  return result;
}

// ─── Table Format Parser ──────────────────────────────────────────────────────

type CellRole = "pokemon" | "ability" | "item" | "move" | "nature" | "level" | "unknown";

function classifyCell(cell: string): { role: CellRole; score: number } {
  const lower = cell.trim().toLowerCase();
  if (!lower) return { role: "unknown", score: 0 };

  const canonical = canonicalizePokemonName(cell);
  const id = toShowdownId(canonical);

  if (/^highest\s*lv/i.test(lower) || /^level\s*\d+$/i.test(lower) || /^lv\.?\d+$/i.test(lower)) return { role: "level", score: 1 };
  if (/^\d+$/.test(lower)) {
    const n = parseInt(lower);
    if (n >= 1 && n <= 100) return { role: "level", score: 0.7 };
  }

  const natureParts = lower.replace(/\s*\(.*\)/, "").replace(/\s*nature\s*/i, "").trim();
  if (NATURES.has(natureParts)) return { role: "nature", score: 1 };

  if (Pokedex[id]) return { role: "pokemon", score: 1 };
  if (Abilities[id]) return { role: "ability", score: 1 };
  if (Moves[id]) return { role: "move", score: 1 };
  if (Items[id]) return { role: "item", score: 1 };

  return { role: "unknown", score: 0 };
}

export function parseTableFormat(text: string): ParsedPokemon[] {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const hasTabs = text.includes("\t");
  const rows: string[][] = lines.map(line =>
    hasTabs ? line.split("\t") : line.split(/\s{3,}/)
  ).map(row => row.map(c => c.trim().replace(/^"|"$/g, "").trim()));

  if (rows.length === 0 || rows[0].length === 0) return [];
  const numCols = Math.max(...rows.map(r => r.length));
  
  const isKaizoFormat = rows.some(row => row.some(cell => /^Lv\s*\d+/i.test(cell)));
  if (isKaizoFormat) {
    return parseKaizoFormat(rows, numCols);
  }

  // --- Pre-scanning ---
  const levelCaps: { val: number; row: number }[] = [];
  const statRowIndices = new Set<number>();
  
  rows.forEach((row, rowIndex) => {
    const rowStr = row.join(" ");
    const m = rowStr.match(/LEVEL\s*(\d+)\s*->>/i);
    if (m) levelCaps.push({ val: parseInt(m[1]), row: rowIndex });
    
    if (row.some(c => /SPEED STAT|BASE STAT|HP\t|ATK\t|DEF\t|SPA\t|SPD\t|SPE\t/i.test(c)) || 
        rowStr.includes("SPEED STAT") || rowStr.includes("BASE STATS")) {
        statRowIndices.add(rowIndex);
    }
  });

  // --- Frequent Row Strategy ---
  const rowScores = rows.map((row) => {
    let score = 0;
    row.forEach(cell => {
      if (Pokedex[toShowdownId(cell)]) score++;
    });
    return score;
  });

  const maxScore = Math.max(...rowScores);
  const nameRowIndex = maxScore > 0 ? rowScores.indexOf(maxScore) : -1;

  const result: ParsedPokemon[] = [];

  for (let col = 0; col < numCols; col++) {
    const cells = rows.map(row => row[col] || "").filter(c => c.length > 0);
    if (cells.length === 0) continue;

    let pokemonName: string | undefined;
    let ability: string | undefined;
    let item: string | undefined;
    let nature: string | undefined;
    let level = 50;
    let levelDetected = false;
    let pokemonRowIndex = -1;
    const moves: string[] = [];

    // 1. Determine Name first
    if (nameRowIndex !== -1 && rows[nameRowIndex][col]) {
      const cell = rows[nameRowIndex][col];
      const id = toShowdownId(cell);
      if (Pokedex[id]) {
          pokemonName = Pokedex[id].name || cell;
          pokemonRowIndex = nameRowIndex;
      }
    }

    // 2. Parse Other Details from all cells in column
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (statRowIndices.has(rowIndex)) continue;
      
      const primaryCell = rows[rowIndex][col];
      if (primaryCell && primaryCell.trim()) {
          const id = toShowdownId(primaryCell);
          
          // Auto-identify Name only if still missing
          if (!pokemonName) {
             const { role } = classifyCell(primaryCell);
             if (role === "pokemon") {
                 const canonical = canonicalizePokemonName(primaryCell);
                 pokemonName = canonical;
                 pokemonRowIndex = rowIndex;
             }
             else if (role === "unknown" && primaryCell.length > 2) {
                 const blacklist = ["highest", "level", "stats", "base", "ability", "item", "nature", "moves", "total", "hp", "atk", "def", "spa", "spd", "spe", "speed", "stat:", "if", "rival", "has", "ev", "iv", "you", "are", "re", "punch", "slash", "jet", "fang", "wave", "beam", "powder", "drain", "pulse", "kiss", "wind", "fire", "rock", "sucker", "crunch", "kick", "smash", "fake", "bullet", "aerial", "knock", "ancient", "flame", "charge", "seed", "slide"];
                 if (!blacklist.some(b => primaryCell.toLowerCase().includes(b)) && !/^\d+$/.test(primaryCell) && !/^[.\d]+$/.test(primaryCell)) {
                     pokemonName = canonicalizePokemonName(primaryCell);
                     pokemonRowIndex = rowIndex;
                 }
             }
          }
      }

      if (!pokemonName) continue;

      // Search for details in this column and adjacent ones (misalignment fix)
      const colRange = [col, col + 1, col - 1, col + 2, col - 2];
      for (const currentCol of colRange) {
          if (currentCol < 0 || currentCol >= rows[rowIndex].length) continue;
          const cell = rows[rowIndex][currentCol];
          if (!cell || !cell.trim()) continue;
          
          const id = toShowdownId(cell);
          const { role } = classifyCell(cell);
          
          // Levels are special: handle "Highest Lv"
          const relevantCap = levelCaps.find(c => c.row >= rowIndex)?.val || (levelCaps.length > 0 ? levelCaps[0].val : 50);
          const relativeMatch = cell.match(/(Highest Lv|Player Max Level|Highest)\s*(Lv\.?)?\s*([+-]\s*\d+)?/i);
          if (relativeMatch) {
              const offsetStr = relativeMatch[3] || "";
              const offset = offsetStr ? parseInt(offsetStr.replace(/\s+/g, "")) : 0;
              level = relevantCap + offset;
              levelDetected = true;
          } else if (!levelDetected) {
              if (/^Lv\.?\s*(\d+)/i.test(cell) || /^Level\s*(\d+)/i.test(cell)) {
                  const m = cell.match(/\d+/);
                  if (m) {
                      level = parseInt(m[0]);
                      levelDetected = true;
                  }
              } else if (/^\d+$/.test(cell)) {
                  const n = parseInt(cell);
                  if (n >= 2 && n <= 100) {
                      level = n;
                      levelDetected = true;
                  }
              }
          }

          switch (role) {
            case "ability": ability = ability || Abilities[id]?.name || cell; break;
            case "item": item = item || Items[id]?.name || cell; break;
            case "nature": 
              const nLabel = cell.toLowerCase().replace(/\s*\(.*\)/, "").replace(/\s*nature\s*/i, "").trim();
              if (NATURES.has(nLabel)) nature = nature || nLabel; 
              break;
            case "move": 
              const mName = Moves[id]?.name || cell;
              if (!moves.includes(mName) && moves.length < 4) moves.push(mName);
              break;
          }
      }
    }

    if (!pokemonName) continue;
    const finalName: string = pokemonName;
    const pokemonId = toShowdownId(finalName);

    if (!Pokedex[pokemonId]) {
        // If not a recognized pokemon, be extra picky: check if it has moves/ability/item
        if (!ability && !item && moves.length === 0) continue;
        // If it looks like a move name (shorthand or similar), skip it
        if (/ (Punch|Fang|Wave|Beam|Jet|Slash|Drain|Pulse|Kiss|Wind|Fire|Rock|Sucker|Crunch|Kick|Smash|Fake|Bullet|Seed|Slide)$/i.test(finalName)) continue;
        if (finalName.length > 20) continue; 
    }
    
    // Final check: if the name was actually a move, skip it
    if (Moves[pokemonId] || Moves[toShowdownId(finalName.replace("Pow-Up", "Power-Up"))]) continue;

    const types = resolveTypes(finalName);
    const baseHp = resolveBaseHp(finalName);

    result.push({
      name: finalName,
      types,
      item,
      ability,
      nature,
      level,
      evs: { ...DEFAULT_EVS },
      ivs: { ...DEFAULT_IVS },
      moves,
      baseHp,
    });
  }

  return result.filter(p => p.name);
}

function parseKaizoFormat(rows: string[][], numCols: number): ParsedPokemon[] {
  const result: ParsedPokemon[] = [];

  for (let col = 0; col < numCols; col += 2) {
    const nameCell = rows[0]?.[col] || "";
    const nameMatch = nameCell.match(/^Lv\s*(\d+)\s+(.+)$/i);
    if (!nameMatch) continue;

    const level = parseInt(nameMatch[1]);
    const pokemonName = canonicalizePokemonName(nameMatch[2]);
    const pokemonId = toShowdownId(pokemonName);

    const natureVal = rows[1]?.[col]?.toLowerCase() || "";
    const nature = NATURES.has(natureVal) ? natureVal : undefined;
    const abilityId = toShowdownId(rows[1]?.[col + 1] || "");
    const ability = Abilities[abilityId]?.name || rows[1]?.[col + 1] || undefined;

    const itemId = toShowdownId(rows[2]?.[col] || rows[2]?.[col+1] || "");
    const item = Items[itemId]?.name || rows[2]?.[col] || rows[2]?.[col+1] || undefined;

    const moves: string[] = [];
    for (let r = 3; r <= 10; r++) {
       const m1 = rows[r]?.[col];
       const m2 = rows[r]?.[col + 1];
       if (m1) {
         const id = toShowdownId(m1);
         if (Moves[id] && !moves.includes(Moves[id].name)) moves.push(Moves[id].name);
       } 
       if (m2) {
         const id = toShowdownId(m2);
         if (Moves[id] && !moves.includes(Moves[id].name)) moves.push(Moves[id].name);
       }
    }

    const types = resolveTypes(pokemonName);
    const baseHp = resolveBaseHp(pokemonName);

    result.push({
      name: pokemonName,
      types,
      item,
      ability,
      nature,
      level,
      evs: { ...DEFAULT_EVS },
      ivs: { ...DEFAULT_IVS },
      moves,
      baseHp,
    });
  }

  return result;
}

export type ImportFormat = "showdown" | "table" | "unknown";

export function detectFormat(text: string): ImportFormat {
  const lines = text.trim().split("\n");
  
  const showdownKeywords = lines.filter(l =>
    /^- /.test(l.trim()) ||
    /^Ability:/i.test(l.trim()) ||
    /^EVs:/i.test(l.trim()) ||
    /^IVs:/i.test(l.trim()) ||
    /Nature$/i.test(l.trim())
  );
  if (showdownKeywords.length >= 2) return "showdown";

  if (lines.some(l => /^Lv\s*\d+/i.test(l.trim()))) return "table";
  if (text.includes("\t") || lines.some(l => /\s{2,}/.test(l))) return "table";

  // If we have non-empty lines, treat as potential simple list (names)
  if (lines.some(l => l.trim().length > 1)) return "table"; 

  return "unknown";
}
