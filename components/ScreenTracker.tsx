import { useEffect } from 'react';
import { useSegments } from 'expo-router';

import { trackScreen } from '@/lib/events';

// Maps the active route pattern (from useSegments — dynamic parts stay
// bracketed, e.g. ['story', '[id]']) to a stable, id-free screen name. Anything
// unmapped falls through to the joined pattern, which is still concrete-id-free
// (e.g. '+not-found'), so cardinality stays bounded.
const SCREEN_NAMES: Record<string, string> = {
  '(tabs)': 'stories',
  '(tabs)/perspectives': 'perspectives',
  '(tabs)/actors': 'actors',
  'story/[id]': 'story_detail',
  'perspective/[id]': 'perspective_detail',
  'actor/[id]': 'actor_detail',
};

function screenName(segments: readonly string[]): string | null {
  // Empty before the navigator is ready — don't emit a spurious view.
  if (segments.length === 0) return null;
  const key = segments.join('/');
  return SCREEN_NAMES[key] ?? key;
}

// Renders nothing. Emits a PostHog $screen + Sentry breadcrumb on every route
// change so we get navigation funnels and crash-context, without the broad
// touch-autocapture (which would hoover up article titles etc.). Lives inside
// the router context alongside NotificationBridge.
export function ScreenTracker() {
  const segments = useSegments();
  const name = screenName(segments);

  useEffect(() => {
    if (name) trackScreen(name);
  }, [name]);

  return null;
}
