// One-shot readiness gate for spotlight anchors whose measured height only
// settles once an async image has loaded — specifically the first Actors row,
// whose editorial portrait shifts the row's layout as it decodes. The row
// signals `markSpotlightReady` on image load; the onboarding tour awaits
// `whenSpotlightReady` before it measures, so it rings the settled row rather
// than a pre-image height (the 2-equal-reads stability poll alone can settle in
// the pre-image window). Per-session, keyed by anchor id; resets on relaunch.

const ready = new Set<string>();
const waiters = new Map<string, Set<() => void>>();

export function markSpotlightReady(id: string): void {
  if (ready.has(id)) return;
  ready.add(id);
  const set = waiters.get(id);
  if (set) {
    waiters.delete(id);
    set.forEach((w) => w());
  }
}

// Resolves when the anchor is marked ready, or after `timeoutMs` — so a missing
// image (un-backfilled actor) or a slow network never hangs the tour.
export function whenSpotlightReady(id: string, timeoutMs: number): Promise<void> {
  if (ready.has(id)) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      waiters.get(id)?.delete(finish);
      resolve();
    };
    const set = waiters.get(id) ?? new Set<() => void>();
    set.add(finish);
    waiters.set(id, set);
    setTimeout(finish, timeoutMs);
  });
}
