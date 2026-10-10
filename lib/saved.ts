// Saved items (bookmarks) — local-only, on-device. Backed by a single
// AsyncStorage blob, exposed reactively so the ribbon in a detail's nav and the
// Saved list screen always agree without prop-drilling or an event bus.
//
// Shape is a map keyed by id: membership, toggle, and dedupe are all O(1), and
// "is this saved?" is a plain `id in map`. Each save carries `at` so the list
// orders newest-first.
import { useMemo } from 'react';

import type { ContentRef } from './content';
import { emit } from './events';
import { createPersistentStore, usePersistentStore } from './persistentStore';

export interface SavedItem extends ContentRef {
  at: number; // epoch ms; formatted to local time on display
}
type SavedMap = Record<string, SavedItem>;

const SAVED_KEY = 'saved.v1';

const store = createPersistentStore<SavedMap>(SAVED_KEY, {});

// Resolves once the initial disk read is applied. Product code doesn't need it;
// tests await it before asserting.
export const savedReady = store.ready;

// Imperative membership check for non-React call sites (e.g. detail routes).
export function isSaved(id: string): boolean {
  return id in store.get();
}

// Toggle a ref's saved state and emit the matching metric. Local write only —
// the event is the sole thing that leaves the device, for aggregate counts.
export function toggleSaved(ref: ContentRef): void {
  const map = store.get();
  if (ref.id in map) {
    // Functional updater so a tap in the pre-hydration window folds onto the
    // loaded value instead of replacing it (see persistentStore); mirrors
    // logHistory. A plain value-set would clobber on-disk saves.
    store.set((prev) => {
      const next = { ...prev };
      delete next[ref.id];
      return next;
    });
    emit('content_unsaved', { surface: ref.surface, id: ref.id });
  } else {
    store.set((prev) => ({ ...prev, [ref.id]: { ...ref, at: Date.now() } }));
    emit('content_saved', { surface: ref.surface, id: ref.id });
  }
}

// Wipe all saved items (the Saved screen's "Clear" affordance).
export function clearSaved(): void {
  store.set({});
}

// Reactive membership for one item — the SaveButton. Re-renders only when this
// id's saved state flips.
export function useIsSaved(id: string): boolean {
  return usePersistentStore(store, (m) => id in m);
}

// Reactive newest-first list for the Saved screen. usePersistentStore returns
// the stable map reference; the sorted array is derived here so the upstream
// identity check stays sound.
export function useSavedItems(): SavedItem[] {
  const map = usePersistentStore(store, (m) => m);
  return useMemo(() => Object.values(map).sort((a, b) => b.at - a.at), [map]);
}
