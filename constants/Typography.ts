// Type system — sourced from the design token export (constants/theme.ts).
//
// `fontSize` is the canonical 10-rung scale (the design's `TS`); reach for it in
// new/updated code instead of a raw number. `fontFamily` is a compatibility shim
// over theme.fontFamily that preserves the historical key names. The `typography`
// role presets below are legacy — kept working during the per-phase migration to
// `fontSize` + compositional weight/leading (their sizes predate the TS scale and
// are corrected as each surface is brought to parity).
import { fontFamily as ff } from './theme';

export { fontSize } from './theme';

export const fontFamily = {
  displayWonky: ff.displayWonky,
  displayPlain: ff.display,
  displayBold: ff.displayBold,
  // Italic Fraunces 400 — quote treatment. RN's `fontStyle:'italic'` would
  // synthesize from a non-italic file, which Fraunces' display weights don't
  // degrade well from. Use the real italic cut.
  displayItalic: ff.displayItalic,
  bodyRegular: ff.body,
  bodySemiBold: ff.bodySemiBold,
  uiMedium: ff.bodyMedium,
  uiSemiBold: ff.bodySemiBold,
  // 700 — active tab label in the "gold seat" tab bar (the only 700 UI weight).
  uiBold: ff.bodyBold,
  mono: ff.mono,
} as const;

// Every Fraunces cut we ship (Wonky, 600, 700, 400 Italic) reports identical
// OS/2 vertical metrics: unitsPerEm 2000, typoAscender 1956, typoDescender
// -510, typoLineGap 0 (fsSelection's USE_TYPO_METRICS bit is set, so these are
// the foundry's own declared normal-leading values, not just a fallback).
// That's a natural line-height-to-fontSize ratio of (1956+510)/2000 = 1.233 —
// the floor below which a line box is shorter than the font's own glyphs.
// React Native clips glyph ink to the lineHeight box (CSS lets it overflow),
// so any Fraunces style with a tighter custom lineHeight crops the bottom off
// descenders (g/y/p/j/q). 1.25 adds a small margin above that 1.233 floor;
// every Fraunces title/name/headline role should derive its lineHeight from
// this ratio instead of hand-picking a tighter one.
export const FRAUNCES_LEADING = 1.25;

export const typography = {
  // Display — wonky Fraunces, ≥28pt
  display1: { fontFamily: fontFamily.displayWonky, fontSize: 36, lineHeight: 36 * FRAUNCES_LEADING },
  display2: { fontFamily: fontFamily.displayWonky, fontSize: 30, lineHeight: 30 * FRAUNCES_LEADING },
  display3: { fontFamily: fontFamily.displayWonky, fontSize: 28, lineHeight: 28 * FRAUNCES_LEADING },

  // Display plain — Fraunces 600 default opsz, ≤22pt
  displayPlain1: { fontFamily: fontFamily.displayPlain, fontSize: 22, lineHeight: 22 * FRAUNCES_LEADING },
  displayPlain2: { fontFamily: fontFamily.displayPlain, fontSize: 17, lineHeight: 17 * FRAUNCES_LEADING },

  // Body — Inter Tight 400, ~1.5 lh per design `.fn-h-body`
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.07, // -0.005em at 13px
  },
  bodyEmphasis: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    lineHeight: 23,
  },

  // UI sans
  ui: { fontFamily: fontFamily.uiMedium, fontSize: 13, lineHeight: 18 },

  // Caps — Inter Tight 600 uppercase, 0.14em letter-spacing (design .tp-cap,
  // TS.micro 10pt)
  cap: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: 10, // TS.micro (was 10.5)
    lineHeight: 13,
    letterSpacing: 1.4, // 0.14em at 10px
    textTransform: 'uppercase' as const,
  },

  // num is a modifier — inherits fontSize from parent Text. Mono + tabular-nums.
  num: {
    fontFamily: fontFamily.mono,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
} as const;
