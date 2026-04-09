import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';

const DOCS_DIR = 'assets/data-trainers';
const PUBLIC_DIR = 'public/data-trainers';

let pokemonNames = null;
function getPokemonNames() {
  if (pokemonNames) return pokemonNames;
  const pokedexPath = 'assets/data-pokemonshowdown/pokedex.ts';
  if (fs.existsSync(pokedexPath)) {
    const txt = fs.readFileSync(pokedexPath, 'utf8');
    pokemonNames = [...txt.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
    return pokemonNames;
  }
  return [];
}

function normalizePokemon(name) {
  if (!name || name.toLowerCase() === 'none') return name;
  const allNames = getPokemonNames();
  let n = name.trim();

  // Handle Radical Red shorthands and aliases
  n = n.replace(/-A$/, '-Alola');
  n = n.replace(/-G$/, '-Galar');
  n = n.replace(/-H$/, '-Hisui');
  n = n.replace(/-P$/, '-Paldea');

  // Explicit Radical Red aliases (shorthand → canonical PS name)
  const RR_ALIASES = {
    'Necrozma-DM':      'Necrozma-Dusk-Mane',
    'Necrozma-DW':      'Necrozma-Dawn-Wings',
    'Eternatus-Max':    'Eternatus-Eternamax',
    'Urshifu-S':        'Urshifu',
    'Urshifu-RS':       'Urshifu-Rapid-Strike',
    'Lycanroc-M':       'Lycanroc-Midnight',
    'Lycanroc-D':       'Lycanroc-Dusk',
    'Calyrex-Shadow':   'Calyrex-Shadow',
    'Calyrex-Ice':      'Calyrex-Ice',
    'Indeedee-F':       'Indeedee-F',
    'Slowking-G':       'Slowking-Galar',
    'Slowbro-G':        'Slowbro-Galar',
    'Articuno-G':       'Articuno-Galar',
    'Zapdos-G':         'Zapdos-Galar',
    'Moltres-G':        'Moltres-Galar',
    'Exeggutor-A':      'Exeggutor-Alola',
    'Marowak-A':        'Marowak-Alola',
    'Raichu-A':         'Raichu-Alola',
    'Muk-A':            'Muk-Alola',
    'Grimer-A':         'Grimer-Alola',
    'Weezing-G':        'Weezing-Galar',
    'Darmanitan-G':     'Darmanitan-Galar',
    'Darmanitan-G-Z':   'Darmanitan-Galar-Zen',
    'Darmanitan-Z':     'Darmanitan-Zen',
    'Pikachu-Flying':   'Pikachu',
    'Oricorio-Sensu':   'Oricorio-Sensu',
    'Oricorio-Pompom':  'Oricorio-Pom-Pom',
    'Oricorio-Pau':     'Oricorio-Pa\'u',
  };
  if (RR_ALIASES[n]) n = RR_ALIASES[n];

  // Handle Mega shorthand
  if (n.startsWith('Mega ')) n = n.replace('Mega ', '') + '-Mega';
  n = n.replace(/-MegaX$/i, '-Mega-X');
  n = n.replace(/-MegaY$/i, '-Mega-Y');

  // Exact or Case-Insensitive
  if (allNames.includes(n)) return n;
  const lower = n.toLowerCase();
  const ciMatch = allNames.find(an => an.toLowerCase() === lower);
  if (ciMatch) return ciMatch;

  // Fuzzy match (starts with)
  const matches = allNames.filter(an => an.toLowerCase().startsWith(lower));
  if (matches.length > 0) {
    return matches.sort((a, b) => a.length - b.length)[0];
  }

  // Fallback for Mega if not found
  if (lower.includes('mega')) {
     const base = n.replace(/-Mega(-[XY])?$/i, '').trim();
     const baseMatch = allNames.find(an => an.toLowerCase() === base.toLowerCase());
     if (baseMatch) return baseMatch;
  }

  return n;
}

/**
 * Parse a Radical Red level cell.
 * @param {*} raw - Raw cell value (number, string like "Highest Lv -1", etc.)
 * @param {number} refLevel - The "IF YOU'RE LEVEL X" value active at this point
 * @returns {number}
 */
function parseRRLevel(raw, refLevel) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s || s === '0') return refLevel || 100;
  // "Highest Lv -N" or "Highest Lv -N" pattern
  const offsetMatch = s.match(/highest\s+lv\s*([+-]\d+)/i);
  if (offsetMatch) {
    const offset = parseInt(offsetMatch[1]);
    return (refLevel || 100) + offset;
  }
  // Plain "Highest Lv" without offset
  if (s.includes('highest')) return refLevel || 100;
  const n = parseInt(s);
  return isNaN(n) ? (refLevel || 100) : n;
}


// --- PLATINUM KAIZO (XLSX - Kaizo Layout) ---
function parsePK(workbook) {
  const result = { game: "Platinum Kaizo", id: "platinum-kaizo", splits: [] };
  workbook.SheetNames.forEach(sheetName => {
    if (!sheetName.toLowerCase().includes('split')) return;
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const split = { name: sheetName, trainers: [] };
    let currentTrainer = null;

    for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];
        if (row.some(c => /Lv\s*\d+/i.test(String(c)))) {
            if (!currentTrainer) {
                let name = "Trainer " + i;
                for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
                    const pr = data[k] || [];
                    const nonEmp = pr.map(c => String(c || "").trim()).filter(c => c.length > 2);
                    if (nonEmp.length === 1 && !nonEmp[0].includes('|') && !/Lv/i.test(nonEmp[0]) && !/dex|moves|item|nature|ability/i.test(nonEmp[0].toLowerCase())) {
                        name = nonEmp[0];
                        break;
                    }
                }
                currentTrainer = { name, team: [] };
                split.trainers.push(currentTrainer);
            }
            for (let c = 0; c < row.length; c++) {
                const m = String(row[c] || "").trim().match(/Lv\s*(\d+)\s+(.+)$/i);
                if (m) {
                    const mv = [];
                    for (let mr = 3; mr <= 10; mr++) {
                        const v = String(data[i + mr]?.[c] || data[i + mr]?.[c + 1] || "").trim();
                        if (v && v !== "0" && v !== "-" && !v.toLowerCase().includes('lv') && v.length > 2) {
                            if (mv.length < 4) mv.push(v);
                        }
                    }
                    currentTrainer.team.push({
                        name: normalizePokemon(m[2].replace(/[♂♀]/g, "").trim()),
                        level: parseInt(m[1]),
                        nature: String(data[i + 1]?.[c] || "").trim(),
                        ability: String(data[i + 1]?.[c + 1] || "").trim(),
                        item: String(data[i + 2]?.[c] || data[i + 2]?.[c + 1] || "").trim(),
                        moves: mv
                    });
                }
            }
            i += 6;
            currentTrainer = null;
        }
    }
    split.trainers = split.trainers.filter(t => t.team.length > 0);
    if (split.trainers.length > 0) result.splits.push(split);
  });
  return result;
}

// --- EMERALD KAIZO / STANDARD (XLSX - Table Layout) ---
function parseStandardXLSX(workbook, gameName, gameId) {
  const result = { game: gameName, id: gameId, splits: [] };
  workbook.SheetNames.forEach(sheetName => {
    if (sheetName.toLowerCase().includes('dex') || sheetName.toLowerCase().includes('sprite')) return;
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const splitTrainers = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];
        const nIdx = row.findIndex(c => String(c || "").trim().toLowerCase() === 'name');
        if (nIdx !== -1) {
            const tName = String(row[nIdx + 1] || "").trim();
            if (!tName) continue;
            const trainer = { name: tName, team: [] };
            let pRow = -1, lRow = -1, iRow = -1, aRow = -1, nRow = -1, mRow = -1;
            for (let j = i; j < Math.min(i + 30, data.length); j++) {
                const r = (data[j] || []).map(c => String(c || "").trim().toLowerCase());
                if (r.some(c => c === 'pokémon' || c === 'pokemon')) pRow = j + 1;
                else if (r.includes('level')) lRow = j;
                else if (r.includes('held item')) iRow = j;
                else if (r.includes('ability')) aRow = j;
                else if (r.includes('nature')) nRow = j;
                else if (r.includes('moves')) mRow = j;
                if (j > i && r.some((c, idx) => c === 'name' && idx === nIdx)) break;
            }
            if (pRow !== -1) {
                for (let col = nIdx + 1; col < (data[pRow] || []).length; col++) {
                    const pN = String(data[pRow][col] || "").trim();
                    if (!pN || pN.toLowerCase() === 'none') continue;
                    const mv = [];
                    if (mRow !== -1) {
                        for (let o = 0; o < 4; o++) {
                            const v = String(data[mRow + o]?.[col] || "").trim();
                            if (v && v !== "0" && v !== "-" && !v.toLowerCase().includes('move')) mv.push(v);
                        }
                    }
                    trainer.team.push({ 
                        name: normalizePokemon(pN.replace(/[♂♀]/g, "").trim()), 
                        level: parseInt(String(data[lRow]?.[col] || "100").replace(/\D/g, '')) || 100, 
                        item: String(data[iRow]?.[col] || "").trim(), 
                        ability: String(data[aRow]?.[col] || "").trim(), 
                        nature: String(data[nRow]?.[col] || "").trim(), 
                        moves: mv 
                    });
                }
            }
            if (trainer.team.length > 0) splitTrainers.push(trainer);
        }
    }
    if (splitTrainers.length > 0) result.splits.push({ name: sheetName, trainers: splitTrainers });
  });
  return result;
}

// --- RUN & BUN (TXT - Flat List) ---
function parseRBTxt(text) {
  const result = { game: "Run & Bun", id: "run-and-bun", splits: [] };
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const allTrainers = [];
  let currentTrainer = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('------') || line.startsWith('~')) continue;
    const pm = line.match(/^(.+?)\s+Lv\.(\d+)(.*)\[(.+?)\|(.+?)\]$/);
    if (pm) {
        if (!currentTrainer) {
            let name = "Unknown";
            let lineIdx = -1;
            for (let k = i - 1; k >= 0; k--) {
                const pl = lines[k].trim();
                if (pl && !pl.startsWith('-') && !pl.includes('Lv.')) { name = pl; lineIdx = k; break; }
            }
            currentTrainer = { name, team: [], lineIdx };
            allTrainers.push(currentTrainer);
        }
        let rest = pm[3].trim();
        let item = "";
        let moves = [];
        if (rest.startsWith('@')) {
            const im = rest.match(/^@(.+?):(.*)$/);
            if (im) { item = im[1].trim(); rest = im[2].trim(); }
        } else if (rest.startsWith(':')) { rest = rest.substring(1).trim(); }
        if (rest) moves = rest.split(',').map(m => m.trim()).filter(Boolean);
        currentTrainer.team.push({ name: normalizePokemon(pm[1].trim()), level: parseInt(pm[2]), nature: pm[4].trim(), ability: pm[5].trim(), item, moves });
    } else if (line.length > 2 && !line.includes('Lv.') && !line.includes('|')) {
        if (lines[i+1] && lines[i+1].includes('Lv.') && lines[i+1].includes('|')) {
            allTrainers.push(currentTrainer = { name: line, team: [], lineIdx: i });
        }
    }
  }

  const splitsDef = [
    { name: "Brawly Split", start: "Youngster Calvin" },
    { name: "Roxanne Split", start: "Bug Catcher Lyle" },
    { name: "Wattson Split", start: "Hiker Mike" },
    { name: "Norman Split", start: "Psychic Jaclyn" },
    { name: "Flannery Split", start: "Winstrate Victor" },
    { name: "Winona Split", start: "Tuber Simon" },
    { name: "Tate & Liza Split", start: "Bird Keeper Colin" },
    { name: "Juan Split", start: "Team Magma Grunt", after: "Mossdeep Space Center" },
    { name: "Victory Road Split", start: "Pokemon Trainer Wally" },
    { name: "Pokemon League", start: "Elite Four Sidney" }
  ];

  let lastIdx = 0;
  splitsDef.forEach((def, i) => {
    let startIdx = -1;
    for (let k = lastIdx; k < allTrainers.length; k++) {
        let match = false;
        if (def.after) {
            if (allTrainers[k].name.includes(def.start)) {
                for (let l = allTrainers[k].lineIdx; l >= Math.max(0, allTrainers[k].lineIdx - 10); l--) {
                    if (lines[l].includes(def.after)) { match = true; break; }
                }
            }
        } else if (allTrainers[k].name.includes(def.start)) { match = true; }
        if (match) { startIdx = k; break; }
    }
    if (startIdx !== -1) {
        let endIdx = allTrainers.length;
        if (i < splitsDef.length - 1) {
            const nextDef = splitsDef[i+1];
            for (let k = startIdx + 1; k < allTrainers.length; k++) {
                let nm = false;
                if (nextDef.after) {
                    if (allTrainers[k].name.includes(nextDef.start)) {
                        for (let l = allTrainers[k].lineIdx; l >= Math.max(0, allTrainers[k].lineIdx - 10); l--) {
                            if (lines[l].includes(nextDef.after)) { nm = true; break; }
                        }
                    }
                } else if (allTrainers[k].name.includes(nextDef.start)) { nm = true; }
                if (nm) { endIdx = k; break; }
            }
        }
        result.splits.push({ name: def.name, trainers: allTrainers.slice(startIdx, endIdx) });
        lastIdx = endIdx;
    }
  });

  if (result.splits.length > 0 && result.splits[0].trainers[0].name !== allTrainers[0].name) {
    result.splits[0].trainers.unshift(...allTrainers.slice(0, allTrainers.indexOf(result.splits[0].trainers[0])));
  }
  return result;
}

// --- RADICAL RED HARDCORE (XLSX - Vertical Layout) ---
function parseRRHardcore(workbook, gameName, gameId) {
  const result = { game: gameName, id: gameId, splits: [] };
  const allNames = getPokemonNames();

  // Words that are definitely NOT Pokémon names (stats, labels, etc.)
  const INVALID_POKEMON_RE = /^(hp|atk|def|spa|spd|spe|base stats?|speed stat|level|restricted|battle effect|if you.re|moves?|item|nature|ability|held item|highest|no item|\d+|-)$/i;

  function isValidPokemonCell(val) {
    const s = String(val || '').trim();
    if (!s || s.length < 2 || s === '0' || s === '-') return false;
    if (INVALID_POKEMON_RE.test(s)) return false;
    
    // Check if it's a known Pokemon
    const normalized = normalizePokemon(s.replace(/[♂♀]/g, '').trim());
    if (allNames.some(n => n.toLowerCase() === normalized.toLowerCase())) return true;

    // If not in pokedex, allow if it looks like a Proper Noun (start with capital)
    // and isn't a known invalid word (already checked by INVALID_POKEMON_RE)
    const isCapitalized = /^[A-Z]/.test(s);
    if (isCapitalized && s.length > 3) return true;

    return false;
  }

  workbook.SheetNames.forEach((sheetName, sIdx) => {
    if (sIdx === 0 || sheetName.toLowerCase().includes('dex') || sheetName.toLowerCase().includes('order')) return;
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const split = { name: sheetName, trainers: [] };

    // ── Pass 1: Build a row-index → reference level map ──────────────────────
    // The sheet has pairs like:
    //   row N:   ["IF YOU'RE", ...]
    //   row N+1: ["LEVEL 16 ->>", ...]
    // We record the reference level and which row it applies from.
    const levelRefByRow = []; // Array of { fromRow, level }
    for (let i = 0; i < data.length; i++) {
      const cell0 = String((data[i] || [])[0] || '').trim();
      if (cell0.toUpperCase().includes("IF YOU'RE") || cell0.toUpperCase().includes("IF YOU ARE")) {
        // Next row should contain "LEVEL X ->>"
        const next = String(((data[i + 1] || [])[0]) || '').trim();
        const lvMatch = next.match(/LEVEL\s+(\d+)/i);
        if (lvMatch) {
          levelRefByRow.push({ fromRow: i, level: parseInt(lvMatch[1]) });
        }
      }
    }

    // Get the reference level for a block (markers are placed as footers underneath the block)
    function getRefLevel(rowIdx) {
      if (levelRefByRow.length === 0) return 100;
      // Find the first reference marker that occurs AFTER the trainer's row
      for (const entry of levelRefByRow) {
        if (entry.fromRow > rowIdx) return entry.level;
      }
      // Fallback: use the very last marker if none are found after
      return levelRefByRow[levelRefByRow.length - 1].level;
    }

    // ── Pass 2: Parse trainers ────────────────────────────────────────────────
    // Skip cells that are pure headers/labels, NOT multi-line trainer entries.
    // A valid trainer cell in col 0 is either:
    //   - Just a trainer name (e.g. "GYM LEADER\nBROCK")
    //   - A location prefix + trainer name (e.g. "VIRID. FOREST\nLASS\nANNE")
    // Invalid cells are single-value UI labels like "IF YOU'RE", "LEVEL CAPS", etc.
    const PURE_HEADER_RE = /^(BATTLE EFFECT|RESTRICTED|LEVEL CAPS|SPEED STAT|BASE STATS|IF YOU|OPTIONAL BOSS|LEVEL \d)($|\s)/i;
    let currentTrainerName = "";

    for (let i = 0; i < data.length; i++) {
      const row = data[i] || [];
      const tName = String(row[0] || '').trim();

      if (tName && tName.length >= 3 && !PURE_HEADER_RE.test(tName.split('\n')[0].trim())) {
        currentTrainerName = tName.replace(/\n/g, ' ').trim();
      }

      if (!currentTrainerName) continue;

      const firstColPokeInfoRaw = String(data[i]?.[2] || '').trim();
      if (!isValidPokemonCell(firstColPokeInfoRaw)) continue;

      // The row immediately after must have level-like values or "Highest Lv" strings
      const nextRow = data[i + 1] || [];
      const hasLevelRow = nextRow.some(c => {
        const s = String(c || '').trim().toLowerCase();
        return s.includes('highest') || (!isNaN(parseInt(s)) && parseInt(s) > 1);
      });
      if (!hasLevelRow) continue;

      // Look for section label before trainer (for subname)
      let subName = '';
      for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
        const prev = (data[k] || []).find(c => String(c || '').includes('(!)')) || (data[k] || [])[0];
        if (prev && String(prev).includes('(!)')) {
          subName = ' [' + String(prev).replace('(!)', '').replace('!', '').trim() + ']';
          break;
        }
      }

      const trainer = { name: currentTrainerName + subName, team: [] };
      const refLevel = getRefLevel(i);

      [2, 7, 12, 17, 22, 27].forEach(col => {
        const pRaw = String(data[i]?.[col] || '').trim();
        if (!isValidPokemonCell(pRaw)) return;

        const moves = [];
        for (let m = 7; m <= 10; m++) {
          const v = String(data[i + m]?.[col] || '').trim();
          if (v && v !== '0' && v !== '-' && v.length > 2 && !/^(BASE STATS|SPEED STAT|HP|ATK|DEF|SPA|SPD|SPE)$/i.test(v)) {
            moves.push(v);
          }
        }

        trainer.team.push({
          name: normalizePokemon(pRaw.replace(/[♂♀]/g, '').trim()),
          level: parseRRLevel(data[i + 1]?.[col], refLevel),
          nature: String(data[i + 4]?.[col] || '').trim(),
          ability: String(data[i + 5]?.[col] || '').trim(),
          item: String(data[i + 6]?.[col] || '').trim(),
          moves,
        });
      });

      if (trainer.team.length > 0) split.trainers.push(trainer);
      i += 10; // skip the block
    }

    if (split.trainers.length > 0) result.splits.push(split);
  });
  return result;
}

// --- EXEC ---
const games = [];

function finalize(data) {
  fs.writeFileSync(path.join(PUBLIC_DIR, `${data.id}.json`), JSON.stringify(data, null, 2));
  games.push({ id: data.id, name: data.game, file: `${data.id}.json` });
  console.log(`- ${data.game} Done`);
}

console.log("Importing Games...");

const pkP = path.join(DOCS_DIR, 'Platinum Kaizo Trainer Docs.xlsx');
if (fs.existsSync(pkP)) finalize(parsePK(XLSX.readFile(pkP)));

const rbP = path.join(DOCS_DIR, 'Run & Bun Trainer Docs.txt');
if (fs.existsSync(rbP)) finalize(parseRBTxt(fs.readFileSync(rbP, 'utf8')));

const ekP = path.join(DOCS_DIR, 'Emerald Kaizo Trainer Docs.xlsx');
if (fs.existsSync(ekP)) finalize(parseStandardXLSX(XLSX.readFile(ekP), "Emerald Kaizo", "emerald-kaizo"));

const nullP = path.join(DOCS_DIR, 'Pokemon Null Trainer Docs.xlsx');
if (fs.existsSync(nullP)) finalize(parseStandardXLSX(XLSX.readFile(nullP), "Pokemon Null", "pokemon-null"));

const rrP = path.join(DOCS_DIR, 'Radical Red - Restricted Hardcore Mode Trainer Docs.xlsx');
if (fs.existsSync(rrP)) finalize(parseRRHardcore(XLSX.readFile(rrP), "Radical Red Hardcore", "radical-red-hardcore"));

// Update Manifest
const sortedGames = games.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify({ games: sortedGames }, null, 2));
console.log("Manifest Updated. Total games:", games.length);
