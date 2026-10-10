import * as WebBrowser from 'expo-web-browser';

import { Sentry } from '@/lib/sentry';

// Open a URL in the in-app browser, reporting open failures to Sentry rather
// than letting the promise reject unhandled. `openBrowserAsync` can reject —
// a malformed URL, no available browser, or a present-while-already-presenting
// race — and the tap then silently does nothing. Capture it so a dead "open
// source" tap is observable. `surface` tags the originating UI (e.g.
// 'external-link', 'story-card-source').
export function openInAppBrowser(url: string, surface: string): void {
  WebBrowser.openBrowserAsync(url).catch((e) => {
    Sentry.captureException(e, { tags: { surface } });
  });
}
