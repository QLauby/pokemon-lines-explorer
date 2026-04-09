import { Pokedex } from "@/assets/data-pokemonshowdown/pokedex";
import { Moves } from "@/assets/data-pokemonshowdown/moves";
import { Items } from "@/assets/data-pokemonshowdown/items";
import { Abilities } from "@/assets/data-pokemonshowdown/abilities";
import Aliases from "@/assets/data-trainers/aliases.json";

// Textes (descriptions) Showdown
const MovesText = (require("@/assets/data-pokemonshowdown/text/moves").MovesText) as any;
const AbilitiesText = (require("@/assets/data-pokemonshowdown/text/abilities").AbilitiesText) as any;
const ItemsText = (require("@/assets/data-pokemonshowdown/text/items").ItemsText) as any;

import { PokemonType } from "./colors-utils";
import type { SuggestionItem } from "@/components/shared/suggestion-list";

/**
 * Normalise un nom pour correspondre aux clés Showdown (ex: "Close Combat" -> "closecombat")
 */
export function toShowdownId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalise un nom de Pokémon pour correspondre à son nom canonique Showdown.
 * Requis pour Radical Red et d'autres hacks aux noms raccourcis.
 */
export function canonicalizePokemonName(name: string): string {
  let n = name.trim();
  const id = toShowdownId(n);

  // Use centralized aliases (case-insensitive ID check)
  for (const [alias, canonical] of Object.entries(Aliases)) {
    if (toShowdownId(alias) === id) return canonical;
  }

  // Régional forms common shorthands
  if (id.endsWith('a') && Pokedex[id.slice(0, -1) + 'alola']) return Pokedex[id.slice(0, -1) + 'alola'].name;
  if (id.endsWith('g') && Pokedex[id.slice(0, -1) + 'galar']) return Pokedex[id.slice(0, -1) + 'galar'].name;
  if (id.endsWith('h') && Pokedex[id.slice(0, -1) + 'hisui']) return Pokedex[id.slice(0, -1) + 'hisui'].name;
  if (id.endsWith('p') && Pokedex[id.slice(0, -1) + 'paldea']) return Pokedex[id.slice(0, -1) + 'paldea'].name;

  return Pokedex[id]?.name || n;
}

/**
 * Recherche des Pokémon dans le Pokedex Showdown.
 */
export function searchPokemon(query: string, limit: number = 10): SuggestionItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];
  
  const results: SuggestionItem[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();
  
  for (const key in Pokedex) {
    const pokemon = Pokedex[key];
    const name = pokemon.name;
    
    if (name.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: key,
        label: name,
        types: pokemon.types.map((t: string) => t.toLowerCase()) as PokemonType[],
        subtitle: (pokemon.abilities[0] || "") as string
      });
      
      if (results.length >= limit) break;
    }
  }
  
  return sortResults(results, lowerQuery);
}

/**
 * Recherche des capacités (moves) dans la base Showdown.
 */
export function searchMoves(query: string, limit: number = 10): SuggestionItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const results: SuggestionItem[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();

  for (const key in Moves) {
    const move = Moves[key];
    const name = move.name;

    if (name.toLowerCase().includes(lowerQuery)) {
      const text = MovesText[key];
      
      // On enrichit le sous-titre avec BP et Accuracy
      const bp = move.basePower ? `BP: ${move.basePower}` : "Status";
      const acc = move.accuracy === true ? "100%" : `${move.accuracy}%`;
      
      results.push({
        id: key,
        label: name,
        types: [move.type.toLowerCase() as PokemonType],
        subtitle: `${bp} - ${acc} - PP: ${move.pp}`,
        metadata: { 
            pp: move.pp,
            power: move.basePower,
            accuracy: move.accuracy,
            category: move.category,
            priority: move.priority,
            flags: move.flags,
            desc: text?.shortDesc || text?.desc || ""
        }
      });

      if (results.length >= limit) break;
    }
  }

  return sortResults(results, lowerQuery);
}

/**
 * Recherche des objets (items) dans la base Showdown.
 */
export function searchItems(query: string, limit: number = 10): SuggestionItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const results: SuggestionItem[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();

  for (const key in Items) {
    const item = Items[key];
    const name = item.name;

    if (name.toLowerCase().includes(lowerQuery)) {
      const text = ItemsText[key];
      results.push({
        id: key,
        label: name,
        subtitle: text?.shortDesc || text?.desc || `Gen ${item.gen || '?'}`
      });

      if (results.length >= limit) break;
    }
  }

  return sortResults(results, lowerQuery);
}

/**
 * Recherche des talents (abilities) dans la base Showdown.
 */
export function searchAbilities(query: string, limit: number = 10): SuggestionItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) return [];

  const results: SuggestionItem[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();

  for (const key in Abilities) {
    const ability = Abilities[key];
    const name = ability.name;

    if (name.toLowerCase().includes(lowerQuery)) {
      const text = AbilitiesText[key];
      results.push({
        id: key,
        label: name,
        subtitle: text?.shortDesc || text?.desc || ""
      });

      if (results.length >= limit) break;
    }
  }

  return sortResults(results, lowerQuery);
}

/**
 * Récupère le texte complet pour un talent par son nom ou ID.
 */
export function getAbilityText(idOrName: string) {
    const id = toShowdownId(idOrName);
    return AbilitiesText[id];
}

/**
 * Récupère le texte complet pour un objet par son nom ou ID.
 */
export function getItemText(idOrName: string) {
    const id = toShowdownId(idOrName);
    return ItemsText[id];
}

/**
 * Récupère les détails complets (data + text) pour un move par son nom ou ID.
 */
export function getMoveDetails(idOrName: string) {
    const id = toShowdownId(idOrName);
    const data = Moves[id];
    const text = MovesText[id];
    if (!data) return null;
    return { ...data, ...text };
}

/**
 * Récupère les données brutes d'un Pokémon par son nom ou ID (ex: types).
 */
export function getPokemonDetails(idOrName: string) {
    const id = toShowdownId(idOrName);
    return Pokedex[id] || null;
}

/**
 * Utilitaire de tri partagé pour mettre en avant les correspondances exactes/début de chaîne.
 */
function sortResults(results: SuggestionItem[], query: string): SuggestionItem[] {
  return results.sort((a, b) => {
    const aStarts = a.label.toLowerCase().startsWith(query);
    const bStarts = b.label.toLowerCase().startsWith(query);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.label.localeCompare(b.label);
  });
}
