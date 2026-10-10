import type { ParsedPush } from './types';

// Web build: push notifications are native-only, so every entry point is inert.

export function registerBackgroundMessageHandler(): void {}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return false;
}

export async function subscribeToPushTopic(): Promise<'subscribed' | 'skipped'> {
  return 'skipped';
}

export async function unsubscribeFromPushTopic(): Promise<'unsubscribed' | 'skipped'> {
  return 'skipped';
}

export function onForegroundMessage(_cb: (parsed: ParsedPush | null) => void): () => void {
  return () => {};
}

export function onNotificationTap(_cb: (parsed: ParsedPush | null) => void): () => void {
  return () => {};
}

export async function getInitialNotificationPayload(): Promise<ParsedPush | null> {
  return null;
}
