import { useSyncExternalStore } from 'react';

import { readJson, writeJson } from './kv';

export interface PersistentStore<T> {
  // The current in-memory value — the source of truth for render.
  get(): T;
  // Replace the value (or update from the previous one), notify subscribers,
  // and write through to disk. Synchronous for callers; the write is fire-and-
  // forget.
  set(next: T | ((prev: T) => T)): void;
  // React binding hook uses this; returns an unsubscribe.
  subscribe(listener: () => void): () => void;
  // Resolves when the initial disk read has been applied. Tests await it;
  // product code generally doesn't need to.
  readonly ready: Promise<void>;
}

// A tiny in-memory store that persists to AsyncStorage and notifies React via
// useSyncExternalStore. Instantiated once at module load, so hydration from
// disk begins at app launch.
//
// Writes that land before the disk read resolves are not lost and do not
// clobber it: each is captured as an updater and, on hydration, folded on top
// of the loaded value in order. So an early logHistory/toggleSaved MERGES with
// prior on-disk state rather than discarding it — which matters because the
// persisted query cache can deep-link straight into a detail and log an open
// before this store's read returns. (A plain value `set` replays as "replace",
// so an explicit clear still wins.)
export function createPersistentStore<T>(key: string, initial: T): PersistentStore<T> {
  let state = initial;
  let hydrated = false;
  const pending: ((prev: T) => T)[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const ready = readJson<T>(key, initial).then((loaded) => {
    state = pending.reduce((s, fn) => fn(s), loaded);
    hydrated = true;
    if (pending.length > 0) {
      void writeJson(key, state); // persist the merged result
      pending.length = 0;
    }
    notify();
  });

  return {
    get: () => state,
    set(next) {
      const apply = typeof next === 'function' ? (next as (prev: T) => T) : () => next;
      state = apply(state);
      notify();
      if (hydrated) {
        void writeJson(key, state);
      } else {
        // Defer the disk write until after hydration replays this onto the
        // loaded value, so we never persist the pre-merge state.
        pending.push(apply);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ready,
  };
}

// Subscribe a component to a slice of a store. The selector MUST return a
// primitive or a stable reference (e.g. the state object itself) — returning a
// freshly-built array/object each call would break useSyncExternalStore's
// identity check and loop. Derive lists in the caller with useMemo instead.
export function usePersistentStore<T, S>(
  store: PersistentStore<T>,
  selector: (state: T) => S,
): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}
