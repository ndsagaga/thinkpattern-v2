import {
  getMessaging,
  requestPermission,
  hasPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
  setBackgroundMessageHandler,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';

import { config } from '@/lib/config';
import { parsePushData, type ParsedPush } from './types';

// The single boundary to the RNFirebase messaging SDK. Everything push-related
// goes through here (modular API), so no other file imports the Firebase SDK
// and payloads are parsed to our typed shape (types.ts) in exactly one place.

function instance() {
  return getMessaging();
}

// Background data handler. Must be registered at the top level (index.js),
// before React mounts — RNFirebase requires it to exist for background
// messages. Our payloads always carry a `notification` block (contract), so the
// OS renders the banner itself; the tap is handled on app open via
// onNotificationOpenedApp / getInitialNotification. Nothing to do here.
export function registerBackgroundMessageHandler(): void {
  setBackgroundMessageHandler(instance(), async () => {});
}

// Ask the OS for notification permission. iOS shows the system prompt; Android
// 13+ shows POST_NOTIFICATIONS (RNFirebase maps it). iOS APNs registration is
// automatic (messaging_ios_auto_register_for_remote_messages defaults on), so
// we don't register explicitly. Returns whether granted.
export async function requestNotificationPermission(): Promise<boolean> {
  const status = await requestPermission(instance());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Current OS permission WITHOUT prompting. Used to reconcile the settings
// toggle with reality — permission can be revoked in system settings while the
// app thinks it's still on.
export async function hasNotificationPermission(): Promise<boolean> {
  const status = await hasPermission(instance());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Subscribe this device to the configured FCM topic. No-op (with a warning)
// when the topic env isn't set, so a misconfigured build runs normally with
// push simply inert rather than crashing. Returns the outcome so the opt-in
// funnel can distinguish a real subscribe from a config-skipped no-op.
export async function subscribeToPushTopic(): Promise<'subscribed' | 'skipped'> {
  if (!config.fcmTopic) {
    console.warn('[push] EXPO_PUBLIC_FCM_TOPIC unset; skipping topic subscribe');
    return 'skipped';
  }
  await subscribeToTopic(instance(), config.fcmTopic);
  return 'subscribed';
}

// Unsubscribe from the topic — the "off" half of the settings toggle. Same
// config guard as subscribe.
export async function unsubscribeFromPushTopic(): Promise<'unsubscribed' | 'skipped'> {
  if (!config.fcmTopic) {
    console.warn('[push] EXPO_PUBLIC_FCM_TOPIC unset; skipping topic unsubscribe');
    return 'skipped';
  }
  await unsubscribeFromTopic(instance(), config.fcmTopic);
  return 'unsubscribed';
}

// Foreground messages arrive while the app is open. The OS does NOT show a
// banner in the foreground, so the listener drives an in-app cue instead.
export function onForegroundMessage(
  cb: (parsed: ParsedPush | null) => void,
): () => void {
  return onMessage(instance(), (msg) => cb(parsePushData(msg.data)));
}

// Fired when the user taps a notification that opened the app from background.
export function onNotificationTap(
  cb: (parsed: ParsedPush | null) => void,
): () => void {
  return onNotificationOpenedApp(instance(), (msg) =>
    cb(parsePushData(msg.data)),
  );
}

// The notification (if any) that cold-launched the app from a quit state.
// Returns null when the app was opened normally. Read once at startup.
export async function getInitialNotificationPayload(): Promise<ParsedPush | null> {
  const msg = await getInitialNotification(instance());
  return msg ? parsePushData(msg.data) : null;
}
