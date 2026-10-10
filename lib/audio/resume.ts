// Per-perspective resume position, so narration picks up where you left off.
// A tiny map (perspective id → seconds) persisted through the shared
// persistent-store machinery — same durability + hydration semantics as saved
// items and reading history.
import { createPersistentStore } from '@/lib/persistentStore';

type Positions = Record<string, number>;

const store = createPersistentStore<Positions>('audio.positions', {});
export const positionsReady = store.ready;

// Don't resume the first few seconds (not worth it), and treat a position
// within END_PAD of the end as "finished" so a replay starts fresh rather than
// at the very end.
const MIN_RESUME = 5;
const END_PAD = 5;

function isNegligible(sec: number, duration: number): boolean {
  return sec < MIN_RESUME || (duration > 0 && sec > duration - END_PAD);
}

function without(map: Positions, id: string): Positions {
  if (!(id in map)) return map;
  const { [id]: _drop, ...rest } = map;
  return rest;
}

export function getResumePosition(id: string, duration: number): number {
  const sec = store.get()[id] ?? 0;
  return isNegligible(sec, duration) ? 0 : sec;
}

// Persist progress, or drop the entry when it's negligible/finished — so the
// map only ever holds genuinely resumable positions.
export function savePosition(id: string, sec: number, duration: number): void {
  store.set((prev) =>
    isNegligible(sec, duration) ? without(prev, id) : { ...prev, [id]: Math.round(sec) },
  );
}

export function clearPosition(id: string): void {
  store.set((prev) => without(prev, id));
}
