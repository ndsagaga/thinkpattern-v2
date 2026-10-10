// Jest setup. Runs once per test file, before the file's modules are imported.
//
// lib/config.ts reads required build-time env vars (EXPO_PUBLIC_*) at import
// time and throws when they're missing — so any test that transitively imports
// the data/query or fetch layer needs them present. Provide test defaults here.
// `??=` so a real value (e.g. CI) still wins.
process.env.EXPO_PUBLIC_CDN_BASE_URL ??= 'https://test.cdn.example';
process.env.EXPO_PUBLIC_SEARCH_BASE_URL ??= 'https://test.search.example';
