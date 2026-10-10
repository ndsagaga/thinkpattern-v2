import { fetchByUrlOnce, GoneError, HttpError } from '@/lib/fetch';
import type { ContentSurface } from '@/lib/content';
import type { SupersededBy } from '@/types/contract';

// Detail-fetch logic shared by every detail hook in data/queries.ts. Kept free
// of the React/query layer so it unit-tests without the AsyncStorage/Sentry
// import chain that lib/queryClient.ts pulls in.

// The frozen id-addressed detail template (serve_contract.md §2): detail files
// are permanent and full-archive, so any id that ever published resolves here —
// including objects outside the ≤14d browse indexes (deep links, old
// saved/history, tablet selection). Constructing this path is sanctioned by the
// contract; every other URL the app touches still arrives via server data.
const DETAIL_BUCKET: Record<ContentSurface, string> = {
  story: 'stories',
  perspective: 'perspectives',
  actor: 'actors',
};

export function detailPath(surface: ContentSurface, id: string | number): string {
  return `${DETAIL_BUCKET[surface]}/${id}.json`;
}

// The detail fetch IS the existence check: 404/403 → GoneError → the hook's
// terminal notFound state; everything else keeps its retry/error semantics.
export async function fetchDetail<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    return await fetchByUrlOnce<T>(url, signal);
  } catch (err) {
    throw mapDetailFetchError(err, url);
  }
}

// A merged story carries a pointer to where its coverage continued; render the
// survivor, not the husk. The backend writes the pointer to target the final
// survivor (one hop), but a re-merge can race an in-place rewrite, so follow
// defensively with a hop cap — an over-deep chain returns the last payload
// rather than looping.
const MAX_MERGE_HOPS = 3;

export async function followSurvivor<T extends { superseded_by?: SupersededBy | null }>(
  first: T,
  fetchUrl: (url: string) => Promise<T>,
): Promise<T> {
  let current = first;
  for (let hop = 0; current.superseded_by && hop < MAX_MERGE_HOPS; hop++) {
    current = await fetchUrl(current.superseded_by.detail_url);
  }
  return current;
}

// Map a raw detail-fetch failure to the terminal "gone" error (404/403 =
// never published or deleted) or pass it through for the retry/error path.
export function mapDetailFetchError(err: unknown, url: string): unknown {
  if (err instanceof HttpError && (err.status === 404 || err.status === 403)) {
    return new GoneError(url);
  }
  return err;
}

