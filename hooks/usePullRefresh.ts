import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { emit } from '@/lib/events';
import { fetchByUrlOnce } from '@/lib/fetch';
import { shortErrorLabel } from '@/utils/errors';
import {
  fetchManifest,
  indexUrlFor,
  INDEX_KEY,
  MANIFEST_KEY,
  type IndexSurface,
} from '@/data/queries';
import type {
  ActorIndexEntry,
  PerspectiveIndexEntry,
  StoryIndexEntry,
} from '@/types/contract';

// One pull-to-refresh contract across all list surfaces: a flat async function
// the consumer awaits. The flow is linear (awaits, not effect-ordering):
//
//   1. Force-fetch the manifest (staleTime:0) — re-runs the schema guard and
//      surfaces a fresh `*_index_url`.
//   2. Force-fetch the surface index from that URL.
//   3. Resolve refreshed / failed.
//
// fetchQuery with staleTime:0 forces a real network round-trip even if the 60s
// window says the data is fresh — the user pulled, they asked for the truest
// current state. It populates the cache through the same path useQuery
// observes, so the mounted list repaints on the next render with no separate
// invalidate step.
//
// No "+N new" diff: under per-object delivery there's no snapshot-rotation
// boundary, and the 60s edge-cached index can return byte-identical bytes a
// minute apart, so a count would sometimes lie (per_object_export_plan.md
// §IX.8). The refreshed list is the feedback; the toast just confirms success
// or offers retry on failure.

export type { IndexSurface };

type IndexEntry = StoryIndexEntry | PerspectiveIndexEntry | ActorIndexEntry;

export type PullOutcome =
  | { kind: 'refreshed' }
  | { kind: 'failed'; error: Error };

export function usePullRefresh(surface: IndexSurface): () => Promise<PullOutcome> {
  const queryClient = useQueryClient();

  return useCallback(async (): Promise<PullOutcome> => {
    emit('pull_initiated');
    try {
      const manifest = await queryClient.fetchQuery({
        queryKey: [MANIFEST_KEY],
        queryFn: ({ signal }) => fetchManifest(signal),
        staleTime: 0,
      });
      const indexUrl = indexUrlFor(surface, manifest);
      await queryClient.fetchQuery<IndexEntry[]>({
        queryKey: [INDEX_KEY[surface]],
        queryFn: ({ signal }) => fetchByUrlOnce<IndexEntry[]>(indexUrl, signal),
        staleTime: 0,
      });
      emit('pull_settled', { outcome: 'refreshed' });
      return { kind: 'refreshed' };
    } catch (err) {
      const error = err as Error;
      emit('pull_settled', { outcome: 'failed', error_label: shortErrorLabel(error) });
      return { kind: 'failed', error };
    }
  }, [queryClient, surface]);
}
