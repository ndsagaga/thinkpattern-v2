import { useManifestQuery, usePerspectivesIndexQuery } from '@/data/queries';
import type { PerspectiveIndexEntry } from '@/types/contract';

// One typed UI state for the Perspectives screen, mirroring useStoriesUI.
// Perspectives are recency-ordered (published_at DESC) — the index ships
// pre-sorted, so there is no client salience/recency sort here. Topic pills
// come from the manifest's per-surface topic counts; the screen prepends its
// own "All". The empty variant means the surface is genuinely empty (no items,
// no categories) and the screen renders no pills.

export type PerspectivesCategory = { key: string; label: string; count: number };

export type PerspectivesUI =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'empty' }
  | { kind: 'data'; items: PerspectiveIndexEntry[]; categories: PerspectivesCategory[] };

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function buildCategories(
  topics: Record<string, number> | undefined,
): PerspectivesCategory[] {
  if (!topics) return [];
  return Object.entries(topics)
    .sort(([, a], [, b]) => b - a)
    .map(([k, count]) => ({ key: k, label: capitalize(k), count }));
}

export function usePerspectivesUI(): PerspectivesUI {
  const manifest = useManifestQuery();
  const perspectives = usePerspectivesIndexQuery();

  const error = manifest.error ?? perspectives.error;
  if (!perspectives.data && error) return { kind: 'error', error };
  if (!perspectives.data) return { kind: 'loading' };
  if (perspectives.data.length === 0) return { kind: 'empty' };

  const categories = buildCategories(manifest.data?.topics?.perspectives);
  return { kind: 'data', items: perspectives.data, categories };
}
