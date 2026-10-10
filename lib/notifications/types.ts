// Push-notification payload contract, agreed with backend.
//
// The `data` block on every `perspectives.notify` push is typed by the codegen
// `PushNotificationData` (serve/schemas.py → contract.gen.ts) — the same
// single-source-of-truth contract every index/detail shape uses. We don't
// hand-roll the shape; `parsePushData` validates the untyped FCM map into it at
// this one boundary.
//   - Backend sends kind + object_id + notification_id + detail_url, and owns
//     none of the routing: mobile maps kind → route (routing.ts) and uses
//     detail_url as the fetch shortcut on tap (bucket-relative, CDN base
//     prepended like any `_url`). `kind` matches the app's own naming (the
//     backend's internal "entity" is "actor" on the wire and in-app).
//   - All FCM `data` values are strings on the wire (FCM requires it), so the
//     SDK hands us an untyped map — hence the runtime validation below.
//   - notification_id is the backend row id, echoed to PostHog as a
//     `notification_opened` event for engagement analytics.

import type { PushNotificationData } from '@/types/contract';

export const NOTIFICATION_KINDS = ['story', 'actor', 'perspective'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function isNotificationKind(value: unknown): value is NotificationKind {
  return (
    typeof value === 'string' &&
    (NOTIFICATION_KINDS as readonly string[]).includes(value)
  );
}

// Outcome of validating an FCM `data` block:
//   - 'ok'        → a well-formed routing push; `data` is the typed contract
//                   shape (known kind, non-empty object_id + detail_url).
//   - 'malformed' → looked like ours (had a `kind`) but failed validation —
//                   unknown/forward-compat kind, or missing object_id/detail_url.
//                   Carries the raw kind/objectId so the bridge can report the
//                   failed open to analytics.
// parsePushData returns null only when there's no `kind` at all: a non-routing /
// diagnostic message we silently ignore rather than count as a failed open.
export type ParsedPush =
  | { status: 'ok'; data: PushNotificationData }
  | { status: 'malformed'; kind: string; objectId: string };

export function parsePushData(
  data: Record<string, unknown> | null | undefined,
): ParsedPush | null {
  if (!data) return null;
  const kind = typeof data.kind === 'string' ? data.kind : '';
  if (!kind) return null;

  const objectId = typeof data.object_id === 'string' ? data.object_id : '';
  const detailUrl = typeof data.detail_url === 'string' ? data.detail_url : '';
  // detail_url is required by the contract and is the new fetch path, so a push
  // without it can't drive the resolved-target flow — treat it as malformed.
  if (!isNotificationKind(kind) || !objectId || !detailUrl) {
    return { status: 'malformed', kind, objectId };
  }

  const notificationId =
    typeof data.notification_id === 'string' ? data.notification_id : '';
  // `kind` is narrowed to NotificationKind here; assigning into the codegen
  // PushNotificationData['kind'] also fails the build if the two ever drift.
  return {
    status: 'ok',
    data: {
      kind,
      object_id: objectId,
      notification_id: notificationId,
      detail_url: detailUrl,
    },
  };
}

// The kind of a parsed push, for analytics/diagnostics — defined whether the
// push validated ('ok') or not ('malformed'), undefined when there was nothing
// to parse.
export function pushKind(parsed: ParsedPush | null): string | undefined {
  if (!parsed) return undefined;
  return parsed.status === 'ok' ? parsed.data.kind : parsed.kind;
}
