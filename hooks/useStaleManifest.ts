import { useManifestQuery } from '@/data/queries';

// The shared "showing cached data we couldn't refresh" signal. We have a
// previously cached manifest (`manifest.data`) but its latest fetch errored or
// is paused offline (`isError`/`isPaused`) — so the brief on screen is stale.
//
// `lastFetchedAt` is the ISO of the most recent successful fetch (from
// `dataUpdatedAt`), the anchor for the "last fetched X ago" line. `hours` is
// the whole-hours age, the masthead "STALE · Nh" kicker (design StaleBrief).
//
// One home for the signal: FNScreen reads it for the FNStaleBrief banner; the
// list screens read it to dim cached content (opacity 0.78) and swap the
// FNHeader date kicker — they must agree, so they share this hook rather than
// each re-deriving the booleans.
export type StaleManifest = {
  stale: boolean;
  // ISO of the last successful manifest fetch, or null before any fetch lands.
  lastFetchedAt: string | null;
  // Whole-hours age of the cached brief (floored), 0 before the first hour.
  hours: number;
};

export function useStaleManifest(): StaleManifest {
  const manifest = useManifestQuery();
  const lastFetchedAt =
    manifest.dataUpdatedAt > 0
      ? new Date(manifest.dataUpdatedAt).toISOString()
      : null;
  const stale =
    !!manifest.data && !!lastFetchedAt && (manifest.isError || manifest.isPaused);
  const hours =
    lastFetchedAt != null
      ? Math.max(0, Math.floor((Date.now() - Date.parse(lastFetchedAt)) / 3_600_000))
      : 0;
  return { stale, lastFetchedAt, hours };
}
