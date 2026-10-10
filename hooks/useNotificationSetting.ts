import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { emit } from '@/lib/events';
import { getMeta, patchMeta } from '@/lib/meta';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  subscribeToPushTopic,
  unsubscribeFromPushTopic,
} from '@/lib/notifications/messaging';
import { Sentry } from '@/lib/sentry';

export type NotificationSetting = {
  // Whether push is currently on (subscribed). Hydrated from meta on mount.
  enabled: boolean;
  // In-flight guard — the row is disabled while a change is applying.
  busy: boolean;
  // Flip the setting. Turning on requests OS permission (routing to system
  // settings if it's been denied) then subscribes; turning off unsubscribes.
  setEnabled: (next: boolean) => Promise<void>;
};

// Backs the Settings → Notifications toggle. The stored `notificationsEnabled`
// pref is the display source of truth; each flip reconciles it with the OS
// permission and the FCM topic subscription. Best-effort: any failure is
// captured and the toggle re-syncs to the persisted value.
export function useNotificationSetting(): NotificationSetting {
  const [enabled, setEnabledState] = useState(false);
  const [busy, setBusy] = useState(false);

  // The toggle shows on only when BOTH the OS permission is granted and we've
  // subscribed. If permission was revoked in system settings while our pref
  // still said on, reflect off and persist that so the pref stays honest.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [granted, m] = await Promise.all([hasNotificationPermission(), getMeta()]);
        if (!alive) return;
        const on = granted && !!m.notificationsEnabled;
        setEnabledState(on);
        if (!granted && m.notificationsEnabled) {
          void patchMeta({ notificationsEnabled: false });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { surface: 'notif-setting-init' } });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (busy) return;
      setBusy(true);
      try {
        if (next) {
          // requestPermission's RETURN is unreliable on Android — it can report
          // granted while notifications are actually off in system settings. So
          // hasPermission is the authoritative read: prompt only if not already
          // granted, then re-check. Still off ⇒ it's been denied at the system
          // level; route to settings and leave the toggle off (no optimistic
          // flip, so it never briefly shows on).
          let granted = await hasNotificationPermission();
          if (!granted) {
            await requestNotificationPermission();
            granted = await hasNotificationPermission();
          }
          if (!granted) {
            setEnabledState(false);
            void Linking.openSettings();
            return;
          }
          const on = (await subscribeToPushTopic()) === 'subscribed';
          await patchMeta({ notificationsEnabled: on, notificationsPrompted: true });
          setEnabledState(on);
          emit('notification_setting_changed', { on });
        } else {
          await unsubscribeFromPushTopic();
          await patchMeta({ notificationsEnabled: false });
          setEnabledState(false);
          emit('notification_setting_changed', { on: false });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { surface: 'notif-setting' } });
        const m = await getMeta();
        setEnabledState(!!m.notificationsEnabled);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return { enabled, busy, setEnabled };
}
