// Local Expo config plugin — Android notification small-icon.
//
// Why this exists: our push payloads always carry a `notification` block, so on
// Android the OS renders the banner itself (see lib/notifications/messaging.ts).
// The OS picks the status-bar icon from a manifest meta-data entry; with none
// set it falls back to the launcher icon flattened to a white blob. This wires a
// purpose-built monochrome icon instead.
//
// Why a custom plugin (not expo-notifications): expo-notifications would set the
// icon too, but installing it alongside @react-native-firebase/messaging makes
// two libraries register FCM services — a known conflict. This plugin touches
// only the icon/manifest/color and adds no runtime dependency.
//
// The per-density PNGs are produced by scripts/generate-icons.mjs into
// assets/images/notification/drawable-<dpi>/ic_stat_notification.png. `android/`
// is CNG-generated, so this re-applies on every prebuild.

const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withAndroidManifest,
  withAndroidColors,
  AndroidConfig,
} = require('@expo/config-plugins');

const ICON_RES = 'ic_stat_notification';
const COLOR_NAME = 'notification_icon_color';
const COLOR_VALUE = '#b8862a'; // brand accent (ochre) — visible on light + dark shades
const DENSITIES = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi',
];

// 1) Copy the per-density silhouettes into the native res tree.
const withAssets = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const srcRoot = path.join(cfg.modRequest.projectRoot, 'assets', 'images', 'notification');
      const resRoot = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const dir of DENSITIES) {
        const src = path.join(srcRoot, dir, `${ICON_RES}.png`);
        if (!fs.existsSync(src)) {
          throw new Error(
            `[withNotificationIcon] missing ${src} — run \`npm run generate-icons\` first.`,
          );
        }
        const destDir = path.join(resRoot, dir);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, `${ICON_RES}.png`));
      }
      return cfg;
    },
  ]);

// 2) Point FCM at the icon + tint via manifest meta-data (idempotent).
//    RNFirebase's messaging library manifest already ships defaults for these
//    (e.g. default_notification_color=@color/white), so we tools:replace to win
//    the manifest merge instead of colliding.
const withManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    manifest.manifest.$['xmlns:tools'] =
      manifest.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const setMeta = (name, resource) => {
      app['meta-data'] = (app['meta-data'] || []).filter((m) => m.$['android:name'] !== name);
      app['meta-data'].push({
        $: {
          'android:name': name,
          'android:resource': resource,
          'tools:replace': 'android:resource',
        },
      });
    };
    setMeta('com.google.firebase.messaging.default_notification_icon', `@drawable/${ICON_RES}`);
    setMeta('com.google.firebase.messaging.default_notification_color', `@color/${COLOR_NAME}`);
    return cfg;
  });

// 3) The color resource referenced above.
const withColor = (config) =>
  withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: COLOR_NAME,
      value: COLOR_VALUE,
    });
    return cfg;
  });

module.exports = (config) => withColor(withManifest(withAssets(config)));
