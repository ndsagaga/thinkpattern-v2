import * as Sentry from '@sentry/react-native';
import { config } from './config';

// Sentry initialization. DSN is build-time-baked via EXPO_PUBLIC_SENTRY_DSN
// (see eas.json profiles); a missing DSN no-ops cleanly so dev without env
// works the same as it always did.
//
// Disabled in __DEV__ on purpose — local Hermes errors and Fast Refresh
// noise would drown signal. Override by setting `enableInDev` if you're
// debugging the Sentry pipeline itself.
export function initSentry({ enableInDev = false }: { enableInDev?: boolean } = {}) {
  if (!config.sentryDsn) {
    if (!__DEV__) {
      console.warn('[sentry] EXPO_PUBLIC_SENTRY_DSN missing in release build');
    }
    return;
  }
  Sentry.init({
    dsn: config.sentryDsn,
    // Per-EAS-profile label (development | preview | production), or 'local'
    // when run from Metro. All profiles share one DSN, so this is what keeps
    // preview/prod issues separable. See lib/config.ts `env`.
    environment: config.env,
    enabled: enableInDev || !__DEV__,
    // Performance traces are off — we'll opt in per-flow once we have
    // enough volume to read them.
    tracesSampleRate: 0,
  });
}

// Re-exports so callers don't need a second import line.
export { Sentry };
