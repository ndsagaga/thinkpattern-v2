import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useRootNavigationState, type Href } from 'expo-router';

import {
  getInitialNotificationPayload,
  onForegroundMessage,
  onNotificationTap,
} from '@/lib/notifications/messaging';
import { resolveNotificationRoute } from '@/lib/notifications/routing';
import { pushKind, type ParsedPush } from '@/lib/notifications/types';
import { emit } from '@/lib/events';
import { Sentry } from '@/lib/sentry';

// Renders nothing. Wires notification taps to navigation:
//   - cold launch from a tapped notification (app was quit) → getInitialNotification
//   - tap that brought the app from background → onNotificationOpenedApp
//   - foreground message (OS shows no banner) → breadcrumb only for now
//
// Backend sends only kind + object_id; the route is resolved client-side
// (routing.ts). Lives high in the tree (inside the router context) so the
// listeners outlive individual screens.
export function NotificationBridge() {
  const router = useRouter();
  // `key` is defined once the root navigator is mounted — navigating before
  // that throws, so the cold-launch handler waits for it.
  const navReady = !!useRootNavigationState()?.key;
  const handledInitial = useRef(false);

  const open = useCallback(
    (parsed: ParsedPush | null) => {
      if (!parsed) return;
      const objectId = parsed.status === 'ok' ? parsed.data.object_id : parsed.objectId;
      emit('notification_opened', {
        notification_id: parsed.status === 'ok' ? parsed.data.notification_id : null,
        kind: pushKind(parsed),
        object_id: objectId,
      });
      // A notification tap should land on its target as a fresh, shallow stack
      // — never pushed on top of whatever detail screens the user happened to
      // have open when the push arrived. Collapse any pushed routes back to the
      // tab root first, then open below. canDismiss() guards the no-op case
      // (cold launch: stack already at root) so dismissAll() doesn't emit a
      // dev-only "nothing to go back to" warning. Runs before both the
      // malformed-fallback and resolved-target branches.
      if (router.canDismiss()) {
        router.dismissAll();
      }
      // Unknown kind or missing object_id/detail_url can't resolve to a real
      // screen — routing falls back to home. That's a failed open, observable here.
      if (parsed.status === 'malformed') {
        emit('notification_open_failed', {
          reason: 'malformed_payload',
          kind: parsed.kind,
          object_id: objectId,
        });
        router.push('/');
        return;
      }
      // The screen hydrates from the id alone (frozen detail path — see
      // data/queries.ts); `from=notification` only tags the open for the
      // analytics funnels. A dead object (deleted between send and tap)
      // surfaces at the detail fetch → toast + list fallback.
      const route = resolveNotificationRoute(parsed.data);
      router.push(`${route}?from=notification` as Href);
    },
    [router],
  );

  // Cold-launch notification: handle once, after navigation is ready.
  useEffect(() => {
    if (!navReady || handledInitial.current) return;
    handledInitial.current = true;
    getInitialNotificationPayload()
      .then((payload) => {
        if (payload) open(payload);
      })
      .catch((e) => Sentry.captureException(e, { tags: { surface: 'push-initial' } }));
  }, [navReady, open]);

  // Live listeners (app already running → navigation is ready).
  useEffect(() => {
    const unsubTap = onNotificationTap(open);
    const unsubForeground = onForegroundMessage((parsed) => {
      // OS shows no banner in the foreground. No in-app cue yet (a deliberate
      // v1 gap — content surfaces on the next list refresh); breadcrumb keeps
      // it visible in Sentry. A lightweight banner can be added later.
      Sentry.addBreadcrumb({
        category: 'push',
        message: 'foreground message',
        data: { kind: pushKind(parsed) },
        level: 'info',
      });
    });
    return () => {
      unsubTap();
      unsubForeground();
    };
  }, [open]);

  return null;
}
