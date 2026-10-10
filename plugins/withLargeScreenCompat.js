// Local Expo config plugin — opt back into the pre-Android-16 orientation lock.
//
// Why this exists: the app is portrait-only by design (`orientation: "portrait"`
// in app.json → android:screenOrientation="portrait" on MainActivity). Starting
// with apps targeting API 36 (Android 16), that lock — and resizability
// restrictions generally — are ignored on large screens (tablets/foldables,
// shortest side >=600dp), which we haven't tested for. This property restores
// the old behavior until we deliberately invest in large-screen layouts.
//
// This is a temporary escape hatch, not a fix: it stops applying once the app
// targets API 37, at which point Android ignores it unconditionally.
// https://developer.android.com/about/versions/16/behavior-changes-16#large-screen

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const PROPERTY_NAME = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app['property'] = (app['property'] || []).filter((p) => p.$['android:name'] !== PROPERTY_NAME);
    app['property'].push({
      $: {
        'android:name': PROPERTY_NAME,
        'android:value': 'true',
      },
    });
    return cfg;
  });
