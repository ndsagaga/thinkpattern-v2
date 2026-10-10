import { Platform } from 'react-native';
import { PostHog } from 'posthog-react-native';
import { config } from './config';

// Thin wrapper over PostHog so app code never imports the SDK directly.
// Lets us swap providers without touching every call site, and gives a
// single place to add filtering, batching, or consent gating later.

let client: PostHog | null = null;

// Disabled in __DEV__ on purpose — local taps, repeated test flows, and
// deliberately-triggered errors would otherwise land in the same PostHog
// project as real users and poison every funnel. Mirrors lib/sentry.ts.
// Override with `enableInDev` only when debugging the analytics pipeline.
// (`__DEV__` = running through Metro, incl. the development dev-client build;
// preview/production binaries are not __DEV__ and report normally.)
export function initAnalytics({ enableInDev = false }: { enableInDev?: boolean } = {}) {
  if (__DEV__ && !enableInDev) {
    return;
  }
  if (!config.posthogKey || !config.posthogHost) {
    if (!__DEV__) {
      console.warn('[analytics] PostHog env missing in release build');
    }
    return;
  }
  client = new PostHog(config.posthogKey, {
    host: config.posthogHost,
    // Auto-collect app open / lifecycle events. Screen tracking is
    // navigation-instrumented separately (TBD).
    captureAppLifecycleEvents: true,
  });
  // Super-properties on every event: environment separates preview vs
  // production traffic (one shared project key); platform enables iOS/Android
  // breakdowns. Set explicitly from RN's Platform rather than relying on
  // PostHog's own device-info auto-capture, which needs an optional native
  // module (react-native-device-info / expo-device) this app doesn't install.
  client.register({ environment: config.env, platform: Platform.OS });
}

export function track(event: string, props?: Record<string, any>) {
  client?.capture(event, props);
}

// PostHog's native `$screen` event — powers navigation funnels and
// time-on-screen. `name` is a route pattern (see ScreenTracker), never a
// concrete path, so no ids leak and cardinality stays low.
export function screen(name: string, props?: Record<string, any>) {
  client?.screen(name, props);
}

export function identify(userId: string, traits?: Record<string, any>) {
  client?.identify(userId, traits);
}

export function reset() {
  client?.reset();
}
