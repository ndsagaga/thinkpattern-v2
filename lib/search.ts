// Client-side search for the IN-MEMORY lenses: a tiny token scorer ranks
// actor/perspective index entries by how well their fields match the query.
// No deps — the corpus is whatever the lens already loaded, so ranking it
// locally costs nothing and works offline.
//
// Stories are NOT here. That corpus is the full archive (~168k rows) and is
// ranked server-side by `GET /api/search` (Cloudflare D1 + FTS5, bm25 with
// recency/prominence weighting) — see data/queries.ts:useStorySearchQuery.
// It moved off-device because the corpus outgrew the approach below: the app
// was downloading ~84 MB of JSON and rescanning every row per keystroke.
//
// Scoring (see `searchIndex`):
//   • The query is split into words; matching is OR — an entry needs only one
//     word to appear. Entries matching MORE words score higher (so "hormuz
//     strait" floats results with both above results with just one).
//   • Each lens exposes weighted fields; a word matching a higher-weight field
//     contributes more. Actors weight `name` above `focus_topics`, so a name
//     hit outranks a topic-only hit.
//   • Ties preserve the index's salience order (stable sort on position).
// Single-word queries reduce to a plain substring filter in salience order.

import type { ActorIndexEntry, PerspectiveIndexEntry } from '@/types/contract';

// A weighted slice of an entry's searchable text. Higher weight = a match here
// counts for more when ranking.
export interface SearchField {
  text: string;
  weight: number;
}

// Join defined, non-empty parts into one lowercased string.
function lower(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// Perspectives: title is the primary axis (weight 2) over the thesis (weight 1),
// mirroring actors' name-over-topics weighting. Only title + thesis are on the
// index entry — no summary, source, or location to search.
export const perspectiveFields = (p: PerspectiveIndexEntry): SearchField[] => [
  { text: lower([p.title]), weight: 2 },
  { text: lower([p.thesis]), weight: 1 },
];

// Actors: name is the primary axis (weight 2) over focus topics (weight 1), so
// "donald" ranks Donald Trump above an actor merely focused on him.
export const actorFields = (a: ActorIndexEntry): SearchField[] => [
  { text: lower([a.name]), weight: 2 },
  { text: lower([...a.focus_topics]), weight: 1 },
];

// Sum, over each query word, the highest-weight field that word appears in.
// A word matching nothing adds 0; an entry scoring 0 is filtered out.
function scoreFields(fields: SearchField[], words: string[]): number {
  let score = 0;
  for (const word of words) {
    let best = 0;
    for (const f of fields) {
      if (f.weight > best && f.text.includes(word)) best = f.weight;
    }
    score += best;
  }
  return score;
}

// Rank `items` against `query`. A blank query returns the list unchanged
// (callers gate on "typed" before showing results — this is a safe identity).
export function searchIndex<T>(
  items: T[],
  query: string,
  toFields: (item: T) => SearchField[],
): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items
    .map((item, index) => ({ item, index, score: scoreFields(toFields(item), words) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.item);
}
