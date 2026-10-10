import { useCallback, useEffect, useState } from 'react';

import { getMeta, patchMeta } from '@/lib/meta';
import { emit } from '@/lib/events';

// 'loading' covers the brief async window between app start and the
// AsyncStorage read settling. Render nothing during this state — native
// splash is still up — so the user never sees a flash of the wrong branch.
export type OnboardingStatus = 'loading' | 'incomplete' | 'complete';

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    getMeta().then((meta) => {
      if (cancelled) return;
      setStatus(meta.hasCompletedOnboarding ? 'complete' : 'incomplete');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markComplete = useCallback((outcome: 'completed' | 'skipped' = 'completed', step?: number) => {
    // Optimistic local update; disk write fires-and-forgets. Failure is
    // non-fatal — the user just sees onboarding once more on next launch.
    // hasCompletedOnboarding is set either way — skipping still dismisses the
    // tour for good, only the analytics outcome differs.
    setStatus('complete');
    patchMeta({ hasCompletedOnboarding: true });
    if (outcome === 'skipped') emit('onboarding_skipped', { step });
    else emit('onboarding_completed');
  }, []);

  return { status, markComplete };
}
