import type { Href } from 'expo-router';
import type { PushNotificationData } from '@/types/contract';

// kind → in-app route.
//
// The path structure lives in the app binary; the backend only sends kind +
// object_id (see types.ts), so this map is the single place push navigation
// targets are defined. Input is the validated `PushNotificationData` (malformed
// pushes are filtered out by parsePushData before we route), so `kind` is the
// strict contract union and the switch is exhaustive — no fallback needed here.
//
// Matches the app's existing template-literal Href idiom (typed routes are on;
// see e.g. components/StoryDetail.tsx).
//
// NOTE: this only produces the route from the id. Whether the target object
// still exists is decided downstream by the detail fetch, not here — a dead
// object (demoted/deleted between send and tap) surfaces as a failed fetch, not
// a bad route.
export function resolveNotificationRoute(data: PushNotificationData): Href {
  switch (data.kind) {
    case 'story':
      return `/story/${data.object_id}`;
    case 'actor':
      return `/actor/${data.object_id}`;
    case 'perspective':
      return `/perspective/${data.object_id}`;
  }
}
