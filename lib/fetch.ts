import { config } from './config';

// Single-attempt JSON fetcher with a per-request timeout. Retries are owned by
// the layer above — TanStack Query's `retry` policy (lib/queryClient.ts) for
// every data query, which is the only consumer. There is no hand-rolled retry
// loop here: that existed solely for the v3.0 `current.json` pointer poll,
// which v4.0 removed (mobile bootstraps from `manifest.json` as a normal
// query). Keeping retry in one place avoids the 3×3 attempt multiplication the
// old two-layer design risked.

// Per-attempt timeout. TanStack adds the inter-attempt backoff on top.
const ATTEMPT_TIMEOUT_MS = 15_000;

// status 0 = client-side timeout (distinguishable from any real HTTP status).
export class HttpError extends Error {
  constructor(message: string, public status: number, public url: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// A detail fetch that 404/403'd — the object was removed (demoted/deleted)
// between a notification being sent and tapped. The query layer maps the raw
// HttpError to this so a dead-object tap reads as a terminal "gone" state
// (toast + list fallback), not a generic failure. Deliberately NOT an
// HttpError/TypeError, so queryClient.isRetryable returns false (no point
// retrying a removed object) and onError skips Sentry (the tap is an expected
// product event, tracked via the `not_found_redirect` analytics event).
export class GoneError extends Error {
  constructor(public url: string) {
    super(`object gone (404/403) at ${url}`);
    this.name = 'GoneError';
  }
}

async function fetchJsonOnce<T>(
  path: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<T> {
  const url = /^https?:\/\//.test(path)
    ? path
    : `${config.cdnBaseUrl}/${path.replace(/^\//, '')}`;
  const ctrl = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onUpstreamAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onUpstreamAbort);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      throw new HttpError(`${res.status} ${res.statusText} on ${url}`, res.status, url);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (timedOut) {
      throw new HttpError(`timeout after ${timeoutMs}ms on ${url}`, 0, url);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onUpstreamAbort);
  }
}

// The fetcher every TanStack queryFn uses. `path` may be a bucket-relative
// `_url` field (prepended with the CDN base) or a fully-qualified URL (passed
// through). Single attempt — Query owns retry/backoff at the layer above.
export const fetchByUrlOnce = <T>(url: string, signal?: AbortSignal) =>
  fetchJsonOnce<T>(url, signal, ATTEMPT_TIMEOUT_MS);
