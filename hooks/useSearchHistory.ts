import { useCallback, useEffect, useState } from 'react';

import {
  clearRecent,
  getRecent,
  pushRecent,
  type SearchLens,
} from '@/lib/searchHistory';

export interface SearchHistory {
  // Newest-first recent queries for this lens. Empty until hydrated.
  recent: string[];
  // Persist a query and update `recent`. No-op for blank terms.
  remember: (term: string) => void;
  // Wipe this lens's recents.
  clear: () => void;
}

// Per-lens recent-search state, backed by lib/searchHistory. Hydrates from
// AsyncStorage on mount and writes through on every change — the in-memory
// `recent` is the source of truth for render; storage just survives launches.
export function useSearchHistory(lens: SearchLens): SearchHistory {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    getRecent(lens).then((r) => {
      if (alive) setRecent(r);
    });
    return () => {
      alive = false;
    };
  }, [lens]);

  const remember = useCallback(
    (term: string) => {
      // Optimistic: the store returns the canonical next list, so we adopt
      // whatever it computed (same dedupe/cap rules) rather than guessing.
      pushRecent(lens, term).then(setRecent);
    },
    [lens],
  );

  const clear = useCallback(() => {
    setRecent([]);
    void clearRecent(lens);
  }, [lens]);

  return { recent, remember, clear };
}
