import { Pokedex } from "@/assets/data-pokemonshowdown/pokedex";
import { Moves } from "@/assets/data-pokemonshowdown/moves";
import { Items } from "@/assets/data-pokemonshowdown/items";
import { Abilities } from "@/assets/data-pokemonshowdown/abilities";
import { toShowdownId } from "./pokedex-utils";
import { PokemonType } from "./colors-utils";

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

/**
 * Calculates a Pokemon's max HP according to the official Gen 3+ formula.
 * HP = floor((2 × base + iv + floor(ev/4)) × level / 100) + level + 10
 */
export function calculateMaxHp(baseHp: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

// ─── Pokedex helpers ──────────────────────────────────────────────────────────

function getPokemonData(name: string) {
  const id = toShowdownId(name);
  return Pokedex[id] || null;
}

function resolveTypes(name: string): PokemonType[] {
  const data = getPokemonData(name);
  if (!data) return [];
  return data.types.map((t: string) => t.toLowerCase() as PokemonType);
}

function resolveBaseHp(name: string): number {
  const data = getPokemonData(name);
  return data?.baseStats?.hp ?? 45; // 45 as a safe fallback
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
  // Parsing "EVs: 252 SpA / 4 SpD / 252 Spe"
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
  // Parsing "IVs: 0 Atk / 0 Spe"
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

/**
 * Parses Pokemon Showdown format export.
 * Returns an array of ParsedPokemon.
 */
export function parseShowdownFormat(text: string): ParsedPokemon[] {
  const blocks = text.trim().split(/\n\s*\n/);
  const result: ParsedPokemon[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Line 1 : "Name (Gender) @ Item" or "Name @ Item" or just "Name"
    const firstLine = lines[0];
    let rawName = firstLine;
    let item: string | undefined;

    if (firstLine.includes("@")) {
      const [namePart, itemPart] = firstLine.split("@");
      rawName = namePart.trim();
      item = itemPart.trim();
    }

    // Strip gender in parentheses, e.g. "Hydreigon (F)" → "Hydreigon"
    const name = rawName.replace(/\s*\([MF]\)\s*/, "").trim();

    if (!name) continue;

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
      // Ignore: "Shiny: Yes", "Happiness:", etc.
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

// Key cache for fast recognition
const pokemonNames = new Set(Object.values(Pokedex).map((p: any) => p.name.toLowerCase()));
const abilityNames = new Set(Object.values(Abilities).map((a: any) => a.name.toLowerCase()));
const itemNames = new Set(Object.values(Items).map((i: any) => i.name.toLowerCase()));
const moveNames = new Set(Object.values(Moves).map((m: any) => m.name.toLowerCase()));

function classifyCell(cell: string): { role: CellRole; score: number } {
  const lower = cell.trim().toLowerCase();
  if (!lower) return { role: "unknown", score: 0 };

  // Level : "Level 17", "Lv.17", or simple integer between 1 and 100
  if (/^level\s*\d+$/i.test(lower) || /^lv\.?\d+$/i.test(lower)) return { role: "level", score: 1 };
  if (/^\d+$/.test(lower)) {
    const n = parseInt(lower);
    if (n >= 1 && n <= 100) return { role: "level", score: 0.7 };
  }

  // Nature : "Timid Nature", "Timid", or formats like "(+Spe -Def)"
  const natureParts = lower.replace(/\s*\(.*\)/, "").replace(/\s*nature\s*/i, "").trim();
  if (NATURES.has(natureParts)) return { role: "nature", score: 1 };

  if (pokemonNames.has(lower)) return { role: "pokemon", score: 1 };
  if (abilityNames.has(lower)) return { role: "ability", score: 1 };
  if (moveNames.has(lower)) return { role: "move", score: 1 };
  // Items : check with toShowdownId too as "Oran Berry" → "oranberry"
  if (itemNames.has(lower) || Items[toShowdownId(cell.trim())]) return { role: "item", score: 1 };

  return { role: "unknown", score: 0 };
}

/**
 * Parses table format (copied from Excel or game documentation).
 * Returns an array of ParsedPokemon.
 */
export function parseTableFormat(text: string): ParsedPokemon[] {
  // Split by tabs and detect columns
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect separator: tab or multiple spaces
  const hasTabs = lines[0].includes("\t");
  const rows: string[][] = lines.map(line =>
    hasTabs ? line.split("\t") : line.split(/\s{2,}/)
  ).map(row => row.map(c => c.trim().replace(/^"|"$/g, "").trim()));

  if (rows.length === 0 || rows[0].length === 0) return [];

  const numCols = Math.max(...rows.map(r => r.length));
  if (numCols === 0) return [];

  const result: ParsedPokemon[] = [];

  for (let col = 0; col < numCols; col++) {
    const cells = rows.map(row => row[col] || "").filter(c => c.length > 0);

    let pokemonName: string | undefined;
    let ability: string | undefined;
    let item: string | undefined;
    let nature: string | undefined;
    let level = 50;
    const moves: string[] = [];

    for (const cell of cells) {
      const { role } = classifyCell(cell);

      switch (role) {
        case "pokemon":
          if (!pokemonName) pokemonName = cell.trim();
          break;
        case "ability":
          if (!ability) ability = cell.trim();
          break;
        case "item":
          if (!item) item = cell.trim();
          break;
        case "nature": {
          const n = cell.toLowerCase().replace(/\s*\(.*\)/, "").replace(/\s*nature\s*/i, "").trim();
          if (!nature && NATURES.has(n)) nature = n;
          break;
        }
        case "level": {
          const m = cell.match(/\d+/);
          if (m) level = parseInt(m[0]);
          break;
        }
        case "move":
          if (moves.length < 4) moves.push(cell.trim());
          break;
      }
    }

    if (!pokemonName) continue;

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
      ivs: { ...DEFAULT_IVS }, // Default: IV=31 if not provided
      moves,
      baseHp,
    });
  }

  return result.filter(p => p.name);
}

// ─── Format Auto-detection ────────────────────────────────────────────────────

export type ImportFormat = "showdown" | "table" | "unknown";

/**
 * Detects the input text format (Showdown vs Table).
 */
export function detectFormat(text: string): ImportFormat {
  const lines = text.trim().split("\n");
  // Showdown: has lines starting with "- " (moves), "Ability:", "EVs:", etc.
  const showdownKeywords = lines.filter(l =>
    /^- /.test(l.trim()) ||
    /^Ability:/i.test(l.trim()) ||
    /^EVs:/i.test(l.trim()) ||
    /^IVs:/i.test(l.trim()) ||
    /Nature$/i.test(l.trim())
  );

  if (showdownKeywords.length >= 2) return "showdown";

  // Table: has tabs
  const tabLines = lines.filter(l => l.includes("\t"));
  if (tabLines.length >= 2) return "table";

  // Table (multiple spaces): detectable columns
  const multiSpaceLines = lines.filter(l => /\s{2,}/.test(l));
  if (multiSpaceLines.length >= 2) return "table";

  return "unknown";
}
