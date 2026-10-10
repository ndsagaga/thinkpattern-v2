import { useCallback, useEffect, useRef, useState } from 'react';

import { emit } from '@/lib/events';
import { getMeta, patchMeta } from '@/lib/meta';
import {
  requestNotificationPermission,
  subscribeToPushTopic,
} from '@/lib/notifications/messaging';
import { Sentry } from '@/lib/sentry';
import { shortErrorLabel } from '@/utils/errors';

// Result of the opt-in flow. Backward-compatible with the old `void` return:
// existing call sites that ignore it keep compiling.
//
//   showPriming  → true once, at the first value moment, when we haven't yet
//                  prompted. The host renders <FNNotifPriming> while this is set.
//   enable()     → the "Turn on notifications" tap. ONLY here does the OS
//                  `requestNotificationPermission` fire; on grant we subscribe.
//   skip()       → the "Not now" tap. Marks the prompt settled WITHOUT touching
//                  the OS, so we never re-prime and the system dialog is never
//                  shown.
export type NotificationOptIn = {
  showPriming: boolean;
  enable: () => Promise<void>;
  skip: () => Promise<void>;
};

// Drives the one-time notification opt-in at a "value moment" — call it from the
// detail screens, so we surface the ask the first time the user actually opens
// something worth reading (not on cold launch).
//
// The OS permission dialog is now GATED behind the editorial priming screen
// (design/ThinkPattern → NotifPriming): on the first value moment this returns
// `showPriming: true`; the host mounts <FNNotifPriming onEnable={enable}
// onSkip={skip} />. The system prompt fires only inside `enable()` (the "Turn
// on notifications" tap) — never on mount, never on skip.
//
// Persisted via meta so we never re-prompt on our own; the OS also won't
// re-show its prompt once permission is decided. Everything is best-effort:
// push opt-in must never break a detail screen, so failures go to Sentry and
// the screen renders normally regardless.
//
// HOST: the three detail screens mount <NotifPrimingHost /> once their content
// loads; it drives this hook and overlays <FNNotifPriming> when `showPriming` is
// set. The OS prompt fires only from the priming "Turn on" tap. The Settings →
// Notifications toggle (useNotificationSetting) is the second opt-in path and
// can enable/disable independently afterwards.
export function useNotificationOptIn(): NotificationOptIn {
  const [showPriming, setShowPriming] = useState(false);
  // Guards against double-settle (rapid taps, re-renders) — the flow resolves
  // exactly once.
  const settling = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meta = await getMeta();
      if (cancelled || meta.notificationsPrompted) return;
      // Surface the priming screen; the funnel "shown" event fires once here,
      // when the editorial ask is actually presented (not on a later OS prompt).
      emit('notification_prompt_shown');
      setShowPriming(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // "Turn on notifications" — the only place the OS prompt fires. Mirrors the
  // original on-grant subscribe + funnel events; just deferred behind the tap.
  const enable = useCallback(async () => {
    if (settling.current) return;
    settling.current = true;
    setShowPriming(false);
    try {
      const granted = await requestNotificationPermission();
      await patchMeta({ notificationsPrompted: true });
      emit('notification_permission_settled', { granted, via: 'os_prompt' });
      if (granted) {
        const outcome = await subscribeToPushTopic();
        if (outcome === 'subscribed') {
          await patchMeta({ notificationsEnabled: true });
        }
        emit('push_subscribe_settled', { outcome });
      }
    } catch (e) {
      // Any throw in the opt-in flow (permission request or topic subscribe) —
      // surface it as a failed subscribe so the funnel has a terminal event.
      emit('push_subscribe_settled', {
        outcome: 'failed',
        error_label: e instanceof Error ? shortErrorLabel(e) : 'unknown',
      });
      Sentry.captureException(e, { tags: { surface: 'push-optin' } });
    }
  }, []);

  // "Not now" — settle without asking the OS, so we never re-prime.
  const skip = useCallback(async () => {
    if (settling.current) return;
    settling.current = true;
    setShowPriming(false);
    try {
      await patchMeta({ notificationsPrompted: true });
      emit('notification_permission_settled', { granted: false, via: 'skip' });
    } catch (e) {
      Sentry.captureException(e, { tags: { surface: 'push-optin' } });
    }
  }, []);

  return { showPriming, enable, skip };
}
