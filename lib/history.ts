// Reading history — local-only, on-device. A capped, newest-first, id-deduped
// list of the story / perspective / actor details the user has opened, backed
// by the same persistent store as saved items.
//
// No metric is emitted here: the analytics side is already covered by the
// detail_opened event at each route. This list exists purely to power the
// user-facing History screen.
import { useEffect } from 'react';

import type { ContentRef, ContentSurface } from './content';
import { createPersistentStore, usePersistentStore } from './persistentStore';

export interface HistoryEntry extends ContentRef {
  at: number; // epoch ms when opened; formatted to local time on display
}

const HISTORY_KEY = 'history.v1';
const MAX_HISTORY = 200; // cap — enough to browse recent reading, bounded

const store = createPersistentStore<HistoryEntry[]>(HISTORY_KEY, []);

// Resolves once the initial disk read is applied. Tests await it.
export const historyReady = store.ready;

// Non-reactive snapshot for non-React callers and tests.
export function getHistory(): HistoryEntry[] {
  return store.get();
}

// Record an open: put it on top, drop any prior entry for the same id
// (re-opening moves it up rather than duplicating), and cap the list.
export function logHistory(ref: ContentRef): void {
  store.set((prev) => {
    const next = [{ ...ref, at: Date.now() }, ...prev.filter((r) => r.id !== ref.id)];
    return next.slice(0, MAX_HISTORY);
  });
}

// Wipe reading history (the History screen's "Clear" affordance).
export function clearHistory(): void {
  store.set([]);
}

// Log an open once the detail's data — and thus its title — is available.
// Callers pass the ref (or null while loading); keyed on the ref's primitives
// so it fires once per open, not on every render.
export function useLogHistory(ref: ContentRef | null | undefined): void {
  const id = ref?.id;
  const surface = ref?.surface;
  const title = ref?.title;
  useEffect(() => {
    if (id && surface && title) logHistory({ id, surface, title });
  }, [id, surface, title]);
}

// Reactive newest-first history for the History screen. Stored in order, so the
// stable array reference is returned directly.
export function useHistory(): HistoryEntry[] {
  return usePersistentStore(store, (s) => s);
}

// Epoch ms the user last opened this ref, or 0 if never opened (or if the open
// aged out of the capped list). Reactive, so a freshness cue keyed on it clears
// the moment the detail is opened and re-logs. Matched on id AND surface —
// logHistory dedups by id alone, so a same-id story/perspective must not answer
// "when did I last open this actor". Returns a primitive, safe as a selector.
export function useLastOpenedAt(surface: ContentSurface, id: string): number {
  return usePersistentStore(store, (s) => {
    const hit = s.find((r) => r.id === id && r.surface === surface);
    return hit ? hit.at : 0;
  });
}
