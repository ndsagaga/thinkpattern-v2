// Imperative, app-global toast trigger. lib/events.ts is analytics-only (no
// in-app listeners), so transient on-screen notices ride this tiny pub-sub
// instead. A single host (components/fn/ToastHost) subscribes and renders;
// any code can fire one via showToast(). One visible toast at a time.

export type ToastMessage =
  // 'gone' — a tapped object was removed between the push being sent and
  // opened; the user has been dropped to the matching list.
  | { kind: 'gone'; surface: 'story' | 'actor' | 'perspective' }
  // 'notice' — a plain informational line (e.g. the custom-pill limit).
  | { kind: 'notice'; message: string };

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();

export function showToast(toast: ToastMessage): void {
  listeners.forEach((listener) => listener(toast));
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
