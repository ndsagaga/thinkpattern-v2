// Rasterize the canonical FN brand mark into the PNG variants each
// platform requires. SVG sources are the source of truth; PNGs are
// derived. Three sources, because each role has different framing:
//
//   icon-source.svg                       Paper bg, mark at ~60% of
//                                         canvas. Sized for the iOS
//                                         home-screen icon (rounded mask
//                                         crops to the corners — needs
//                                         breathing room) and the web
//                                         favicon at 48px.
//
//   splash-source.svg                     Paper bg, mark at ~25% of
//                                         canvas. The splash takes the
//                                         entire screen, so the mark
//                                         needs to be a focal point
//                                         within a larger expanse rather
//                                         than dominate it.
//
//   adaptive-icon-foreground-source.svg   Transparent bg, mark scaled
//                                         to inner 66% safe zone. Android
//                                         launcher applies a cookie-cutter
//                                         mask that can crop the outer
//                                         ~17%, so the mark must live
//                                         inside the safe zone. Bg layer
//                                         is supplied by app.json
//                                         adaptiveIcon.backgroundColor.
//
// ── WORKFLOW ────────────────────────────────────────────────────────
//
// When icons change:
//
//   1. Edit the SVG source(s) in assets/images/
//   2. Run `npm run icons`
//        - regenerates the PNGs in assets/images/ (this script)
//        - runs `expo prebuild --clean` so the new PNGs are copied
//          into ios/Perspectives/Images.xcassets/ and equivalents.
//          Without this step, the old PNGs stay baked into the native
//          project and the build appears unchanged.
//   3. Uninstall the app from the simulator/device
//        (iOS caches the icon image by bundle ID)
//   4. Run `npm run ios`
//
// Run this script alone (`npm run generate-icons`) only if you want to
// preview PNG output without touching the native projects.
//
// Expo's prebuild step derives all smaller iOS sizes from the 1024
// master, so we only need one PNG per platform/role.

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets', 'images');

const ICON_SOURCE = join(ASSETS, 'icon-source.svg');
const SPLASH_SOURCE = join(ASSETS, 'splash-source.svg');
const ADAPTIVE_FOREGROUND_SOURCE = join(ASSETS, 'adaptive-icon-foreground-source.svg');
const NOTIFICATION_SOURCE = join(ASSETS, 'notification-icon-source.svg');

const render = (source, size) => {
  const svg = readFileSync(source, 'utf-8');
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  })
    .render()
    .asPng();
};

const targets = [
  { source: ICON_SOURCE, name: 'icon.png', size: 1024 },
  { source: SPLASH_SOURCE, name: 'splash-icon.png', size: 1024 },
  { source: ICON_SOURCE, name: 'favicon.png', size: 48 },
  { source: ADAPTIVE_FOREGROUND_SOURCE, name: 'adaptive-icon.png', size: 1024 },
];

for (const { source, name, size } of targets) {
  const png = render(source, size);
  writeFileSync(join(ASSETS, name), png);
  console.log(`${name}  ${size}×${size}  ${png.length.toLocaleString()} bytes`);
}

// Android notification small-icon, per density. 24dp base; each drawable-<dpi>
// bucket needs its own crisp raster (the mark is thin line-art, so scaling one
// master would soften it). Consumed by plugins/withNotificationIcon.js, which
// copies these into android/app/src/main/res/drawable-<dpi>/ at prebuild.
const NOTIF_DIR = join(ASSETS, 'notification');
const NOTIF_DENSITIES = [
  { dir: 'drawable-mdpi', size: 24 },
  { dir: 'drawable-hdpi', size: 36 },
  { dir: 'drawable-xhdpi', size: 48 },
  { dir: 'drawable-xxhdpi', size: 72 },
  { dir: 'drawable-xxxhdpi', size: 96 },
];
for (const { dir, size } of NOTIF_DENSITIES) {
  const outDir = join(NOTIF_DIR, dir);
  mkdirSync(outDir, { recursive: true });
  const png = render(NOTIFICATION_SOURCE, size);
  writeFileSync(join(outDir, 'ic_stat_notification.png'), png);
  console.log(`notification/${dir}/ic_stat_notification.png  ${size}×${size}  ${png.length.toLocaleString()} bytes`);
}
