// App-wide persisted metadata. Single AsyncStorage blob for cross-launch state
// that doesn't fit Query's data-cache model.
//
// Why one blob instead of independent keys:
//   - One read on cold launch instead of N parallel AsyncStorage hits.
//   - Schema evolution is a one-place migration concern.
//
// JSON data caching (and, under v3.0, snapshot bookkeeping for offline
// fallback) used to live here. Both moved to TanStack Query's AsyncStorage
// persister — the persister now owns offline reads, so the only thing left
// that genuinely needs cross-launch persistence is the onboarding flag.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Sentry } from './sentry';

const META_KEY = 'meta';

// Add fields here as needs arise; getMeta / patchMeta survive shape evolution
// because reads default missing fields.
export interface Meta {
  // True once the user has completed first-run onboarding (tapped
  // "Begin →"). Absence is treated as false.
  hasCompletedOnboarding?: boolean;
  // True once we've asked for notification permission (after the first value
  // moment). Gates the one-time opt-in prompt so we never re-ask on our own.
  notificationsPrompted?: boolean;
  // Whether the user currently wants push — i.e. we've subscribed to the FCM
  // topic. Written by the opt-in flow (on grant) and the Settings toggle, and
  // read back to render the toggle. Absence is treated as false.
  notificationsEnabled?: boolean;
}

// Read the full meta blob. Returns an empty object when no meta has been
// written yet (first install) or when the stored value is corrupt.
export async function getMeta(): Promise<Meta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Meta) : {};
  } catch (err) {
    console.warn('[meta] read failed', { err });
    // A failed/corrupt read silently degrades onboarding + opt-in to their
    // "not done" defaults (user re-onboards / re-prompts) — observable, not
    // crashing, so capture rather than swallow.
    Sentry.captureException(err, { tags: { surface: 'meta-read' } });
    return {};
  }
}

// Atomically merge fields into the meta blob. Reads existing, applies
// `patch` (later fields win), writes back. Last-write-wins; no conflict
// resolution beyond that.
export async function patchMeta(patch: Partial<Meta>): Promise<void> {
  try {
    const current = await getMeta();
    const next: Meta = { ...current, ...patch };
    await AsyncStorage.setItem(META_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[meta] write failed', { patch, err });
    // A failed write means the flag never persists (e.g. onboarding re-shows
    // every launch) — capture so a storage-full / permissions issue is visible.
    Sentry.captureException(err, { tags: { surface: 'meta-write' } });
  }
}
