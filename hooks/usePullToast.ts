import { useCallback, useEffect, useState } from 'react';

import { shortErrorLabel } from '@/utils/errors';
import type { FNRefreshToastProps } from '@/components/fn/FNRefreshToast';
import type { PullOutcome } from './usePullRefresh';

// Promise-driven refresh toast. Replaces useRefreshToast for surfaces on
// TanStack Query (Phase 3 onward). The hook owns three things:
//   - `refreshing` boolean (wired to RefreshControl.refreshing)
//   - `onPull` callback (wired to RefreshControl.onRefresh)
//   - `toastProps` for the FNRefreshToast component
//
// No effect-orchestrated state machine, no `observedFetchingRef`, no
// implicit ordering with useResource. The flow is linear:
//
//   onPull called
//     → set refreshing=true
//     → await pullFn()
//     → set toast from result; set refreshing=false
//     → after DISMISS_AFTER_MS, clear toast
//
// The Failed toast's "Retry" tap re-fires onPull, kicking off the same
// flow again with a fresh requestId in the snapshot reducer.

const DISMISS_AFTER_MS = 4000;

type ToastState =
  | { kind: 'idle' }
  | { kind: 'showing'; props: FNRefreshToastProps; at: number };

export interface UsePullToastReturn {
  toastProps: FNRefreshToastProps | null;
  onPull: () => void;
  refreshing: boolean;
}

export function usePullToast(
  pullFn: () => Promise<PullOutcome>,
): UsePullToastReturn {
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>({ kind: 'idle' });

  // Self-reference dance: the failed-toast Retry button needs to call the
  // current runPull, but toToastProps would otherwise capture a stale one.
  // Declare the ref first (typed by hand to break the recursive inference);
  // assign it after runPull is defined.
  const runPullRef = useStableRef<() => Promise<void>>(async () => {});

  const runPull = useCallback(async () => {
    setRefreshing(true);
    const result = await pullFn();
    const props = toToastProps(result, runPullRef);
    setToast({ kind: 'showing', props, at: Date.now() });
    setRefreshing(false);
  }, [pullFn, runPullRef]);

  runPullRef.current = runPull;

  const onPull = useCallback(() => {
    // Fire-and-forget at the boundary — the awaited work all happens
    // inside runPull. RefreshControl doesn't care if onRefresh returns
    // a Promise; making the surface a plain callback keeps it simple.
    runPull().catch(() => {
      // pullFn resolves (it catches internally and returns {kind:'failed'}),
      // so this .catch is just defensive against an unexpected throw. Data
      // fetch failures are reported to Sentry via QueryCache.onError.
    });
  }, [runPull]);

  useEffect(() => {
    if (toast.kind !== 'showing') return;
    const id = setTimeout(
      () => setToast({ kind: 'idle' }),
      DISMISS_AFTER_MS,
    );
    return () => clearTimeout(id);
  }, [toast]);

  return {
    toastProps: toast.kind === 'showing' ? toast.props : null,
    onPull,
    refreshing,
  };
}

// Returns a stable ref that always holds the latest value. Used so closures
// that need "the current runPull" don't capture a stale one across renders.
function useStableRef<T>(value: T): { current: T } {
  const [box] = useState(() => ({ current: value }));
  box.current = value;
  return box;
}

function toToastProps(
  outcome: PullOutcome,
  retryRef: { current: () => Promise<void> },
): FNRefreshToastProps {
  switch (outcome.kind) {
    case 'refreshed':
      return { kind: 'refreshed', metaLabel: formatLocalTime(Date.now()) };
    case 'failed':
      return {
        kind: 'failed',
        metaLabel: shortErrorLabel(outcome.error),
        // The retry tap fires the latest runPull; ref dereferenced at
        // tap time, not at toast construction time.
        onRetry: () => {
          retryRef.current().catch(() => {});
        },
      };
  }
}

// "14:02" — wall-clock time of the pull in the viewer's local timezone.
// 24-hour format is locale-neutral and matches the editorial aesthetic.
function formatLocalTime(ms: number): string {
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
