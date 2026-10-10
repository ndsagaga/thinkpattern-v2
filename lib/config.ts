// Runtime config sourced from build-time env vars. EAS build profiles in
// `eas.json` set these per environment; for local `expo start`, `.env.local`
// provides them.
//
// IMPORTANT: env vars MUST be accessed by literal property name
// (`process.env.EXPO_PUBLIC_FOO`) for `babel-preset-expo` to inline the
// values at build time. Dynamic access like `process.env[name]` is NOT
// inlined and resolves to `undefined` in release bundles (where there is
// no Metro dev server populating `process.env` at runtime).
//
// To make that constraint impossible to violate accidentally, ALL env
// reads in this app live inside the `rawEnv` object below — each entry
// is a literal access. Everything else in the app imports from `config`,
// never from `process.env` directly.
const rawEnv = {
  EXPO_PUBLIC_CDN_BASE_URL: process.env.EXPO_PUBLIC_CDN_BASE_URL,
  EXPO_PUBLIC_SEARCH_BASE_URL: process.env.EXPO_PUBLIC_SEARCH_BASE_URL,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  EXPO_PUBLIC_FCM_TOPIC: process.env.EXPO_PUBLIC_FCM_TOPIC,
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// Throw loudly on missing required values rather than fall back silently —
// a misconfigured build should fail at launch, not at first request.
function requireEnv(name: keyof typeof rawEnv): string {
  const v = rawEnv[name];
  if (!v) {
    throw new Error(
      `Missing required env var: ${name}. ` +
        'Set it via eas.json build profile (release builds) or .env.local (local dev).',
    );
  }
  return v;
}

export const config = {
  cdnBaseUrl: requireEnv('EXPO_PUBLIC_CDN_BASE_URL').replace(/\/$/, ''),
  // Story search (`/api/search`) is a live endpoint on the public web worker,
  // NOT a file on the CDN — a different host from `cdnBaseUrl`, hence its own
  // var. Separate so a build can point at a staging worker without moving the
  // whole data plane. If the manifest ever grows a `search_url`, this becomes
  // redundant and the query layer should follow that instead (the convention
  // everywhere else: reach URLs by following the manifest).
  searchBaseUrl: requireEnv('EXPO_PUBLIC_SEARCH_BASE_URL').replace(/\/$/, ''),
  sentryDsn: rawEnv.EXPO_PUBLIC_SENTRY_DSN ?? null,
  posthogKey: rawEnv.EXPO_PUBLIC_POSTHOG_KEY ?? null,
  posthogHost: rawEnv.EXPO_PUBLIC_POSTHOG_HOST ?? null,
  // FCM topic this build subscribes to (push-notifications-test vs the live
  // push-notifications), set per EAS profile. Optional: when unset, the app
  // runs normally but does not subscribe to push (notifications are inert).
  fcmTopic: rawEnv.EXPO_PUBLIC_FCM_TOPIC ?? null,
  // Build environment, baked per EAS profile (development | preview |
  // production). Unset when running locally from Metro (`expo start`) — falls
  // back to 'local'. Used to tag Sentry events and PostHog super-properties so
  // dev/preview/prod traffic stays separable. Note `__DEV__` (running through
  // Metro) is the on/off switch for telemetry; this is only the label.
  env: rawEnv.EXPO_PUBLIC_ENV ?? 'local',
  // Supabase (accounts, likes, comments). Optional: unset → reactions hidden.
  supabaseUrl: rawEnv.EXPO_PUBLIC_SUPABASE_URL ?? null,
  supabaseAnonKey: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null,
};

// Resolve a bucket-relative asset path to a full CDN URL. Per
// docs/serve_v2_contract.md, entity portrait `image_url` is a bucket-relative
// path (e.g. "images/entities/123.png"), not a full URL — mobile prepends the
// CDN base. Article `image_url` is already a full external URL (publisher
// og:image) and passes through unchanged.
export function resolveCdnUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${config.cdnBaseUrl}/${path.replace(/^\//, '')}`;
}
