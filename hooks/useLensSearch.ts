import { useCallback, useEffect, useMemo, useState } from 'react';

import { SEARCH_RESULT_LIMIT, useStorySearchQuery } from '@/data/queries';
import { searchIndex, type SearchField } from '@/lib/search';
import type { SearchStoryEntry } from '@/types/contract';

// The two ways a lens turns a typed query into results, behind one shape.
//
// Actors and perspectives rank their already-loaded index entries on-device
// (`useLocalSearch`); stories hand the query to the server (`useStorySearch`),
// because that corpus is the full archive. FNSearch consumes only `LensSearch`
// and so contains no ranking, no fetching, and no per-lens branches.

// How long the field must be idle before a remote query fires. Long enough to
// coalesce a typed word into a single request, short enough to still read as
// live filtering. Local lenses need no debounce — they never leave the device.
const DEBOUNCE_MS = 250;

export type LensSearchStatus = 'ready' | 'loading' | 'error';

export interface LensSearch<T> {
  results: T[];
  status: LensSearchStatus;
  // True when `results` is a ranked best-of rather than every match, so the
  // count reads "Top 50" instead of claiming an exact total.
  capped: boolean;
  // Called on every keystroke with the raw field value. Producers decide
  // whether to act on it immediately or wait for the field to settle.
  onQueryChange: (query: string) => void;
  // Re-runs a failed search. Absent for local lenses — nothing can fail.
  onRetry?: () => void;
}

// `value`, but only once it has stopped changing for `delayMs`. Each change
// restarts the timer, so a burst of keystrokes settles to one value.
// Deliberately local: story search is the only caller, and a shared
// `useDebounced` util invites use where the tradeoff hasn't been thought about.
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return settled;
}

// On-device ranking over a corpus the lens already holds. Synchronous, so it
// is always 'ready' and can never fail or be truncated.
//
// `items` accepts undefined because callers must invoke this before they know
// their index has loaded — the search UI renders behind an `ui.kind === 'data'`
// branch, but hooks run unconditionally. No corpus simply means no matches.
export function useLocalSearch<T>(
  items: T[] | undefined,
  toFields: (item: T) => SearchField[],
): LensSearch<T> {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (items && query.trim() ? searchIndex(items, query, toFields) : []),
    [items, query, toFields],
  );
  return { results, status: 'ready', capped: false, onQueryChange: setQuery };
}

// Server-ranked archive search. The debounce is the whole reason this hook
// holds the raw query itself rather than taking it as an argument.
export function useStorySearch(): LensSearch<SearchStoryEntry> {
  const [query, setQuery] = useState('');
  const settled = useDebounced(query, DEBOUNCE_MS);
  const { data, isError, refetch } = useStorySearchQuery(settled);

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const results = data ?? [];
  return {
    results,
    // Data-first, matching the detail queries: once a term has produced rows,
    // a failed refetch keeps showing them rather than blanking to an error.
    // 'error' therefore means "nothing to show AND the last attempt failed".
    status: data !== undefined ? 'ready' : isError ? 'error' : 'loading',
    capped: results.length >= SEARCH_RESULT_LIMIT,
    onQueryChange: setQuery,
    onRetry,
  };
}
