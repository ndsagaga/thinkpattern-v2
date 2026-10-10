// Dynamic Expo config layered over app.json. Expo reads app.json first and
// passes its `expo` object in as `config`; this function returns the final
// config. Its ONLY job is to set the iOS `aps-environment` entitlement per
// build: APNs requires "development" for dev/sandbox signing and "production"
// for App Store / TestFlight distribution, and a mismatch fails code-signing
// (exactly what broke the first production build against the pre-Firebase
// provisioning profile). EAS build profiles set APS_ENVIRONMENT (see eas.json);
// local `expo run:ios` leaves it unset and falls back to the app.json default
// ("development").
//
// It also drops a `googleServicesFile` reference when the file isn't present
// locally. GoogleService-Info.plist (iOS) and google-services.json (Android) are
// gitignored Firebase secrets; a missing one otherwise fails config parsing
// ("Could not parse Expo config: android.googleServicesFile") and breaks
// `expo start`. This lets iOS-only local dev run without the Android file — add
// the real file at the repo root to re-enable that platform. Everything else
// stays in app.json.
//
// This stripping is LOCAL-ONLY. On EAS (EAS_BUILD=true) we never drop the
// reference: the Firebase files ride along via .easignore, and a genuinely
// missing one must fail the build loudly rather than silently ship a build
// with no Firebase/push.
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

// Keep googleServicesFile only when the referenced file actually exists —
// except on EAS, where a missing file should fail loudly (see note above).
function withGoogleServices(platform) {
  if (!platform || !platform.googleServicesFile) return platform;
  if (process.env.EAS_BUILD === 'true') return platform;
  if (existsSync(resolve(__dirname, platform.googleServicesFile))) return platform;
  const { googleServicesFile, ...rest } = platform;
  return rest;
}

module.exports = ({ config }) => ({
  ...config,
  ios: withGoogleServices({
    ...config.ios,
    entitlements: {
      ...config.ios?.entitlements,
      'aps-environment':
        process.env.APS_ENVIRONMENT ??
        config.ios?.entitlements?.['aps-environment'] ??
        'development',
    },
  }),
  android: withGoogleServices({ ...config.android }),
});
