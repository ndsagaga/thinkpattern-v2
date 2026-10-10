// Per-lens search history. A single dedicated AsyncStorage blob keyed by lens
// — `{ stories: [...], perspectives: [...], actors: [...] }`. One key (not three)
// for the same reasons meta.ts uses one: a single cold-launch read and a
// single migration point. Kept OUT of `meta` because that blob is documented
// as "flags only"; recents are list data with their own cap/dedupe rules.
//
// Stored value is the query string only — never a tapped item. Newest-first,
// case-insensitive de-duped, capped at MAX_RECENT per lens.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Sentry } from './sentry';
import type { IndexSurface } from '@/data/queries';

const HISTORY_KEY = 'search-history';
const MAX_RECENT = 6;

export type SearchLens = IndexSurface; // 'stories' | 'actors' | 'perspectives'

type HistoryBlob = Partial<Record<SearchLens, string[]>>;

async function readBlob(): Promise<HistoryBlob> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryBlob) : {};
  } catch (err) {
    console.warn('[searchHistory] read failed', { err });
    // A failed/corrupt read degrades to "no recents" — observable, not
    // crashing. Capture so a storage issue is visible.
    Sentry.captureException(err, { tags: { surface: 'search-history-read' } });
    return {};
  }
}

async function writeBlob(blob: HistoryBlob): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(blob));
  } catch (err) {
    console.warn('[searchHistory] write failed', { err });
    // A failed write just means recents don't persist across launches —
    // capture so a storage-full / permissions issue surfaces.
    Sentry.captureException(err, { tags: { surface: 'search-history-write' } });
  }
}

// Read one lens's recents, newest-first. Empty array when none / corrupt.
export async function getRecent(lens: SearchLens): Promise<string[]> {
  const blob = await readBlob();
  return blob[lens] ?? [];
}

// Record a term for a lens: trim → drop empties → case-insensitive dedupe →
// unshift → cap. Returns the new list so the caller can update UI without a
// re-read.
export async function pushRecent(
  lens: SearchLens,
  term: string,
): Promise<string[]> {
  const t = term.trim();
  if (!t) return getRecent(lens);
  const blob = await readBlob();
  const prev = blob[lens] ?? [];
  const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  await writeBlob({ ...blob, [lens]: next });
  return next;
}

// Wipe one lens's recents (the "Clear" affordance). Other lenses untouched.
export async function clearRecent(lens: SearchLens): Promise<void> {
  const blob = await readBlob();
  await writeBlob({ ...blob, [lens]: [] });
}
