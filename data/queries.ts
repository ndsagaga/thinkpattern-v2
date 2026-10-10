import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';

import { config } from '@/lib/config';
import { fetchByUrlOnce, GoneError } from '@/lib/fetch';
import { detailPath, fetchDetail, followSurvivor } from './detailByUrl';
import { queryClient } from '@/lib/queryClient';
import type {
  ActorDetail,
  ActorIndexEntry,
  Manifest,
  PerspectiveDetail,
  PerspectiveIndexEntry,
  SearchStoryEntry,
  StoryDetail,
  StoryIndexEntry,
} from '@/types/contract';

// Query layer for the v4.0 per-object contract. Each surface is a typed
// `useQuery` keyed on its STABLE PATH — `['story', id]`, not
// `['story', snapshot_id, id]`. There is no snapshot/version segment anymore:
// the backend overwrites detail JSONs in place at fixed bucket keys, so the
// cache key is the resource path, and freshness is time-based.
//
// FRESHNESS — staleTime mirrors the CDN Cache-Control TTL. React Native's
// `fetch` does NOT honor Cache-Control (there is no HTTP cache layer), so
// these staleTimes ARE the freshness contract, not a hint on top of one.
// Mirrors backend per_object_export_plan.md §IX.3:
//   manifest + indexes  max-age=60   → 60s
//   details             max-age=3600 → 1h
// Going fresher than the CDN just adds origin GETs without surfacing newer
// data (serve runs hourly; the CDN's max-age is the floor).
//
// CONSISTENCY — v4.0 is eventual, not atomic (was: frozen per-snapshot set).
// A client can briefly hold a 60s-fresh index next to a ≤1h-stale detail.
// That's by design; `notFound` + FNErrorPlaceholder cover the rare torn read.
//
// `enabled` gates the dependent chain: an index needs the manifest's
// `*_index_url`; a detail needs its index entry's `detail_url`. Until the
// upstream URL exists the query is suspended (no fetch, no error). Standard
// TanStack dependent-query pattern.

const MANIFEST_STALE_MS = 60_000; // 60s — mirrors manifest max-age=60
const INDEX_STALE_MS = 60_000; // 60s — mirrors index max-age=60
const DETAIL_STALE_MS = 60 * 60_000; // 1h — mirrors detail max-age=3600

// The bootstrap path. Every other CDN URL is reached by following `_url` fields
// out of the manifest. (Story search is the one surface that isn't a CDN file
// at all — see `useStorySearchQuery` below.)
const MANIFEST_PATH = 'manifest.json';

// Query keys. Centralized so the hooks and the pull-refresh path (which
// fetchQuery's the same keys to force a network refetch) can't drift.
export const MANIFEST_KEY = 'manifest';

export type IndexSurface = 'stories' | 'actors' | 'perspectives';

export const INDEX_KEY: Record<IndexSurface, string> = {
  stories: 'stories-index',
  actors: 'actors-index',
  perspectives: 'perspectives-index',
};

export function indexUrlFor(surface: IndexSurface, manifest: Manifest): string {
  switch (surface) {
    case 'stories':
      return manifest.stories_index_url;
    case 'actors':
      return manifest.actors_index_url;
    case 'perspectives':
      return manifest.perspectives_index_url;
  }
}

// Schema major version this client build understands. The manifest's
// `schema_version` is the authoritative bail-out: an older client pointed at
// a newer *breaking* export must refuse to render stale-shaped data rather
// than crash deep in a screen. We gate on the MAJOR component only — a minor
// bump (e.g. "1.1") is additive by convention (new optional fields; existing
// screens already render defensively around unknown/missing data), so old
// builds keep working against it. Only a major bump, which lands here
// deliberately with whatever migration the new shape needs, forces an update.
//
// Re-baselined to "1" for the public ThinkPattern launch (backend renumbered
// the shape-unchanged 6.0 wire to 1.0). The cache buster in
// lib/queryClient.ts was bumped in the same change so devices upgrading in
// place discard 6.0-shaped payloads.
const SUPPORTED_SCHEMA_MAJOR = '1';

function schemaMajor(version: string | undefined): string | undefined {
  return version?.split('.')[0];
}

// Thrown from fetchManifest on a schema mismatch. Deliberately NOT an
// HttpError/TypeError, so lib/queryClient.ts:isRetryable returns false — a
// version mismatch is permanent for this build; retrying is pointless. The
// bootstrap surface (BootstrapGate) detects this to show "update required".
export class UnsupportedSchemaError extends Error {
  constructor(public readonly version: string | undefined) {
    super(
      `Unsupported manifest schema_version: ${version ?? '(missing)'}. ` +
        `This build supports ${SUPPORTED_SCHEMA_MAJOR}.x.`,
    );
    this.name = 'UnsupportedSchemaError';
  }
}

// Fetch + validate the manifest. Shared by useManifestQuery and the
// pull-refresh path so the schema guard lives in exactly one place.
export async function fetchManifest(signal?: AbortSignal): Promise<Manifest> {
  const manifest = await fetchByUrlOnce<Manifest>(MANIFEST_PATH, signal);
  if (schemaMajor(manifest.schema_version) !== SUPPORTED_SCHEMA_MAJOR) {
    throw new UnsupportedSchemaError(manifest.schema_version);
  }
  return manifest;
}

// --- Manifest ---------------------------------------------------------------
//
// The root of the data graph. Fetched directly from a fixed path — no
// `current.json` pointer indirection (one fewer network hop than v3.0).
// `dataUpdatedAt` on this query is the app-wide "Last updated" source
// (FNScreen's stale banner), replacing the old SnapshotProvider
// `lastFetchedAt`.

export function useManifestQuery(): UseQueryResult<Manifest> {
  return useQuery<Manifest>({
    queryKey: [MANIFEST_KEY],
    queryFn: ({ signal }) => fetchManifest(signal),
    staleTime: MANIFEST_STALE_MS,
  });
}

// --- Indexes ----------------------------------------------------------------

export function useStoriesIndexQuery(): UseQueryResult<StoryIndexEntry[]> {
  const manifest = useManifestQuery();
  const url = manifest.data?.stories_index_url;
  return useQuery<StoryIndexEntry[]>({
    queryKey: [INDEX_KEY.stories],
    queryFn: ({ signal }) => fetchByUrlOnce<StoryIndexEntry[]>(url as string, signal),
    enabled: !!url,
    staleTime: INDEX_STALE_MS,
  });
}

export function usePerspectivesIndexQuery(): UseQueryResult<PerspectiveIndexEntry[]> {
  const manifest = useManifestQuery();
  const url = manifest.data?.perspectives_index_url;
  return useQuery<PerspectiveIndexEntry[]>({
    queryKey: [INDEX_KEY.perspectives],
    queryFn: ({ signal }) => fetchByUrlOnce<PerspectiveIndexEntry[]>(url as string, signal),
    enabled: !!url,
    staleTime: INDEX_STALE_MS,
  });
}

// --- Story search -------------------------------------------------------------
//
// The odd one out: every other query here GETs a static file off the CDN, but
// stories search a ~168k-row archive that no client should hold. Ranking runs
// server-side in the web worker (`GET /api/search` — Cloudflare D1 + FTS5,
// bm25 weighted by recency and coverage), on a DIFFERENT host from the CDN
// (config.searchBaseUrl), so the URL is built here rather than followed out of
// the manifest.
//
// This replaced downloading the whole corpus and scanning it on-device. That
// file had grown to ~84 MB of JSON (~19 MB on the wire): past the 15s fetch
// timeout on cellular, a multi-hundred-MB parse spike, and a rescan of every
// row on every keystroke. One request now returns <=50 ranked rows (~11 KB).
//
//   - Keyed on the trimmed query, so each term caches independently and a
//     changed key auto-aborts the in-flight request for the previous one.
//   - `placeholderData` keeps the previous term's rows on screen while the next
//     ones load, so typing doesn't strobe between results and a skeleton.
//   - NOT persisted (`meta.noPersist`): results are per-query and ephemeral —
//     they would grow the single AsyncStorage cache value (see lib/queryClient)
//     without ever being read back, since a new session re-queries anyway.

// Not exported: unlike the index keys, nothing outside this module touches it.
// Pull-to-refresh deliberately does NOT refetch search — there is no standing
// query to refresh, only whatever term the user last typed.
const STORIES_SEARCH_KEY = 'stories-search';

// The worker's own ceiling (API_SEARCH_LIMIT_MAX). Ask for all of it: ranking
// is global, so these are the best 50 matches in the archive, not the first 50
// found. Saturating the limit is why the UI says "Top 50" rather than a count.
export const SEARCH_RESULT_LIMIT = 50;

// Mirrors the endpoint's own `cache-control: max-age=60`, on the same reasoning
// as the index queries above: RN's fetch has no HTTP cache, so this IS the
// freshness contract rather than a hint layered on one.
const SEARCH_STALE_MS = 60_000;

// The worker's response envelope. Not in types/contract.gen.ts — that file is
// generated from the backend's Pydantic schemas, and this shape belongs to the
// worker, not the export. Only the rows escape this module.
interface StorySearchResponse {
  results: SearchStoryEntry[];
}

// Ranked archive matches for `query`. A blank query is disabled, never fetched.
export function useStorySearchQuery(
  query: string,
): UseQueryResult<SearchStoryEntry[]> {
  const q = query.trim();
  return useQuery<SearchStoryEntry[]>({
    queryKey: [STORIES_SEARCH_KEY, q],
    queryFn: async ({ signal }) => {
      const url =
        `${config.searchBaseUrl}/api/search` +
        `?q=${encodeURIComponent(q)}&limit=${SEARCH_RESULT_LIMIT}`;
      const { results } = await fetchByUrlOnce<StorySearchResponse>(url, signal);
      return results ?? [];
    },
    enabled: q !== '',
    staleTime: SEARCH_STALE_MS,
    placeholderData: keepPreviousData,
    meta: { noPersist: true },
  });
}

export function useActorsIndexQuery(): UseQueryResult<ActorIndexEntry[]> {
  const manifest = useManifestQuery();
  const url = manifest.data?.actors_index_url;
  return useQuery<ActorIndexEntry[]>({
    queryKey: [INDEX_KEY.actors],
    queryFn: ({ signal }) => fetchByUrlOnce<ActorIndexEntry[]>(url as string, signal),
    enabled: !!url,
    staleTime: INDEX_STALE_MS,
  });
}

// --- Detail queries ---------------------------------------------------------
//
// A detail is fetched straight from its frozen id-addressed path
// (data/detailByUrl.ts:detailPath) — no index lookup, so archive objects
// outside the ≤14d browse indexes hydrate the same as fresh ones. The fetch is
// the existence check: 404 → GoneError → notFound. Screens consume a flat
// shape — loading / error / data / notFound / refetch — and don't care how the
// detail was resolved.

export interface DetailQueryResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  // Terminal "never published or deleted" (the detail GET 404'd), mutually
  // exclusive with `error` — a gone object is a product event, not a fault.
  // Data-first: a cached detail keeps rendering through a failed refetch.
  notFound: boolean;
  // Retry path for the FNErrorPlaceholder button.
  refetch: () => void;
}

function useDetailQuery<T>(
  queryKey: QueryKey,
  fetchFn: (signal?: AbortSignal) => Promise<T>,
): DetailQueryResult<T> {
  const query = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) => fetchFn(signal),
    staleTime: DETAIL_STALE_MS,
  });

  const gone = query.error instanceof GoneError;
  return {
    data: query.data ?? null,
    error: gone ? null : (query.error ?? null),
    loading: query.isLoading,
    notFound: !query.data && gone,
    refetch: () => void query.refetch(),
  };
}

export function useStoryDetailQuery(id: string): DetailQueryResult<StoryDetail> {
  return useDetailQuery<StoryDetail>(['story', id], async (signal) => {
    const get = (url: string) => fetchDetail<StoryDetail>(url, signal);
    // A merged story forwards to its survivor (cached under the merged id —
    // the id the user's link/save named).
    return followSurvivor(await get(detailPath('story', id)), get);
  });
}

export function usePerspectiveDetailQuery(
  id: string,
): DetailQueryResult<PerspectiveDetail> {
  return useDetailQuery<PerspectiveDetail>(['perspective', id], (signal) =>
    fetchDetail(detailPath('perspective', id), signal),
  );
}

export function useActorDetailQuery(id: number): DetailQueryResult<ActorDetail> {
  return useDetailQuery<ActorDetail>(['actor', id], (signal) =>
    fetchDetail(detailPath('actor', id), signal),
  );
}

// Invalidate the whole data graph — used by the global retry surfaces
// (FNColdOffline, FNStaleBrief). Marks manifest + all indexes + all details
// stale so the next render refetches through the chain. (Replaces the v3.0
// snapshot re-key, which achieved the same effect by changing every query key
// at once.)
export function invalidateAll(): Promise<void> {
  return queryClient.invalidateQueries();
}
