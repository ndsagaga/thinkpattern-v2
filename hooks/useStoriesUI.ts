import { useManifestQuery, useStoriesIndexQuery } from '@/data/queries';
import type { StoryIndexEntry } from '@/types/contract';

// One typed UI state for the Stories screen. Replaces a scattered set of
// `showLoading`, `showError`, `fullDataEmpty`, `filteredEmpty`,
// `pillItems.length > 1` booleans that were drifting against each other.
//
// The `data` variant carries the real categories from the manifest; the
// screen prepends its own "All" pill at render time. The empty variant
// means the brief is genuinely empty — no items, no categories — and the
// screen should not render pills or filter chrome.

export type StoriesCategory = { key: string; label: string; count: number };

export type StoriesUI =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'empty' }
  | { kind: 'data'; items: StoryIndexEntry[]; categories: StoriesCategory[] };

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function buildCategories(
  topics: Record<string, number> | undefined,
): StoriesCategory[] {
  if (!topics) return [];
  return Object.entries(topics)
    .sort(([, a], [, b]) => b - a)
    .map(([k, count]) => ({ key: k, label: capitalize(k), count }));
}

export function useStoriesUI(): StoriesUI {
  const manifest = useManifestQuery();
  const stories = useStoriesIndexQuery();

  const error = manifest.error ?? stories.error;
  if (!stories.data && error) return { kind: 'error', error };
  if (!stories.data) return { kind: 'loading' };
  if (stories.data.length === 0) return { kind: 'empty' };

  const categories = buildCategories(manifest.data?.topics?.stories);
  return { kind: 'data', items: stories.data, categories };
}
