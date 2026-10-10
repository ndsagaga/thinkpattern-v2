import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';

import { GoneError, HttpError } from './fetch';
import { Sentry } from './sentry';

// Production defaults. Per-query staleTimes live in data/queries.ts, mirroring
// the CDN TTLs (manifest/index 60s, details 1h) — RN `fetch` ignores
// Cache-Control, so those staleTimes ARE the freshness contract. The default
// here is a conservative floor for any query that forgets to set its own.
const DEFAULT_STALE_TIME_MS = 60 * 1000;
const DEFAULT_GC_TIME_MS = 24 * 60 * 60 * 1000;

// After failureCount reaches MAX_ATTEMPTS, retry returns false regardless of
// error class. failureCount=1 means "1 failed attempt so far"; MAX_ATTEMPTS=3
// yields up to 1 initial + 2 retries.
const MAX_ATTEMPTS = 3;

// Retryable: transient by nature.
//   5xx, 408, 429, HttpError status=0 (client-side timeout), TypeError
//   (network-layer — DNS fail, no connectivity, connection reset).
// Non-retryable: other 4xx (a 404 on a removed object won't recover), and
// anything that isn't an HttpError/TypeError — notably UnsupportedSchemaError
// from the manifest schema guard, which is permanent for this build.
function isRetryable(err: unknown): boolean {
  if (err instanceof HttpError) {
    if (err.status === 0) return true;
    if (err.status >= 500) return true;
    if (err.status === 408 || err.status === 429) return true;
    return false;
  }
  if (err instanceof TypeError) return true;
  return false;
}

// onError fires once per failed query (after retries are exhausted). It's the
// single chokepoint that reports every query failure to Sentry, tagged by
// surface. Query keys are [surface, ...rest] — e.g. ['manifest'],
// ['stories-index'], ['story', id]. (v3.0 had a snapshot_id segment and a
// structural-file "snapshot gone → fall forward" path here; per-object
// delivery has no snapshots, so both are gone.)
const queryCache = new QueryCache({
  onError: (error, query) => {
    // A dead-object tap (GoneError) is an expected product event, not a fault —
    // it's tracked via the not_found_redirect analytics event, so keep it out
    // of Sentry. The query-state breadcrumb subscriber below still records it.
    if (error instanceof GoneError) return;
    const [surface, ...rest] = query.queryKey as readonly unknown[];
    Sentry.captureException(error, {
      tags: {
        surface: typeof surface === 'string' ? surface : 'unknown',
      },
      extra: {
        queryKey: query.queryKey,
        queryHash: query.queryHash,
        idArg: rest[0],
      },
    });
  },
});

// State-change breadcrumbs. When a query settles (success/error), drop a
// breadcrumb so Sentry crash reports include the tape of which data the app
// was loading. We ignore noisy non-state-changing events so the finite
// breadcrumb ring buffer stays useful.
queryCache.subscribe((event) => {
  if (event.type !== 'updated') return;
  const action = (event as { action?: { type?: string } }).action;
  if (!action) return;
  if (action.type !== 'success' && action.type !== 'error') return;
  Sentry.addBreadcrumb({
    category: 'data.query',
    level: action.type === 'error' ? 'error' : 'info',
    message: `${event.query.queryHash} → ${action.type}`,
  });
});

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      gcTime: DEFAULT_GC_TIME_MS,
      retry: (failureCount, error) => {
        if (failureCount >= MAX_ATTEMPTS) return false;
        return isRetryable(error);
      },
      // Backoff: 300ms / 600ms ± 100ms jitter.
      retryDelay: (attemptIndex) => 300 * 2 ** attemptIndex + Math.random() * 100,
      // Frozen-on-foreground: lists refresh on pull / tab-mount / reconnect,
      // not when the app returns to foreground (per_object_export_plan.md
      // §IX.8). So focus refetch stays off and we don't wire focusManager.
      refetchOnWindowFocus: false,
      // Functional now that lib/network.ts wires onlineManager to NetInfo:
      // the offline→online transition refetches stale queries.
      refetchOnReconnect: true,
      networkMode: 'online',
    },
  },
});

// The persister gives cold launches their cached state and powers offline
// reads. It's backed by its OWN MMKV instance rather than AsyncStorage: the
// stories index is a ~7MB value (14-week export) and Android's AsyncStorage
// (SQLite) caps a single row at ~2MB, so the whole offline cache was being
// discarded ("Row too big to fit into CursorWindow"). MMKV is mmap-backed with
// no per-value cap and rehydrates faster. We keep createAsyncStoragePersister —
// its async storage interface is satisfied by a thin wrapper over MMKV's sync
// API, so the restore/splash (useIsRestoring) flow is unchanged. Saved/history/
// meta stay on AsyncStorage; only this large, growing cache needed the move.
const cacheStore = createMMKV({ id: 'query-cache' });
const mmkvStorage = {
  getItem: async (key: string) => cacheStore.getString(key) ?? null,
  setItem: async (key: string, value: string) => {
    cacheStore.set(key, value);
  },
  removeItem: async (key: string) => {
    cacheStore.remove(key);
  },
};

// maxAge (in queryPersistOptions) is the hard ceiling on persisted cache age,
// separate from per-query gcTime.
export const queryPersister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: 'PERSPECTIVES_QUERY_CACHE',
  throttleTime: 1000,
});

export const queryPersistOptions = {
  persister: queryPersister,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Cache-shape version. v4.0 keys are path-only (no snapshot segment). Bumped
  // to 'v5' for the v5.3 wire: Timelines are retired, so a device upgrading in
  // place must not rehydrate cached ['timeline', id] / ['timelines-index']
  // entries (or timeline-shaped detail JSON) that no longer have a renderer.
  // Bumped to 'v6' for the v6.0 wire: actor posture is retired
  // (public_posture/posture_reasoning → bio_line/bio_summary), so cached
  // 5.3-shaped actor payloads must not rehydrate with missing fields.
  // Bumped to 'v7' for the schema 1.0 public baseline (StoryIndexEntry gains
  // article_count; StoryCard drops outlet_count) — discard 6.0-shaped blobs.
  // Bumping discards the old blob on first launch. Bump again on any future
  // breaking change to the cached query shape.
  buster: 'v7',
  // Only persist successful queries — errored queries shouldn't survive a
  // relaunch; a fresh fetch will resurface the current error or succeed.
  // Queries tagged `meta.noPersist` (story search — see data/queries.ts
  // useStorySearchQuery) are excluded entirely: everything here serializes into
  // ONE AsyncStorage value that Android caps at ~2MB, and search caches one entry
  // per query term, so persisting it would grow that value without bound. It is
  // also pointless — a new session re-queries rather than reading rows back.
  dehydrateOptions: {
    shouldDehydrateQuery: (query: {
      state: { status: string };
      meta?: { noPersist?: boolean };
    }) => query.state.status === 'success' && query.meta?.noPersist !== true,
  },
};
