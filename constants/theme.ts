// ThinkPattern theme — the in-code adapter over the design's token export.
//
// `tokens.json` is copied verbatim from the design side (generated from
// design/ThinkPattern/lib/thinkpattern.jsx, the SSOT). This file is the thin
// platform adapter the backend handoff describes: it maps each design token to a
// React-Native-ready value and nothing more. The one-line update contract —
//
//   design edits lib/thinkpattern.jsx → regenerates tokens.export.json →
//   we copy it to constants/tokens.json → every value below propagates
//
// — only holds if components consume THESE exports and never a raw hex, raw
// `fontSize`, raw spacing, or raw duration. Never hand-edit tokens.json.
//
// Two things live here rather than in tokens.json because they are platform
// mappings, not design values: (1) `fontFamily` — the loaded RN font-instance
// names per role/weight (the JSON carries CSS family stacks); (2) `motion.curve`
// — cubic-bezier control points parsed for use with Reanimated's Easing.bezier.
import tokens from './tokens.json';

// ── Color ────────────────────────────────────────────────────────────────
// Light-locked palette (no dark variants by design). `accent` is the "now"
// semantic — one element per screen, never decorative. `slate` is mark/data-viz
// only. `faint` is dividers only, never text.
export const colors = {
  paper: tokens.color.surface.paper.value,
  paper2: tokens.color.surface.paper2.value,
  ink: tokens.color.text.ink.value,
  ink2: tokens.color.text.ink2.value,
  muted: tokens.color.text.muted.value,
  faint: tokens.color.text.faint.value,
  rule: tokens.color.text.rule.value, // masthead / full-width soft rule (stronger than faint)
  link: tokens.color.interactive.link.value,
  linkPressed: tokens.color.interactive.linkPressed.value,
  accent: tokens.color.semantic.accent.value,
  accentSoft: tokens.color.semantic.accentSoft.value,
  slate: tokens.color.semantic.slate.value,
} as const;

// Relationship-kind colors — fixed meanings, never repurposed for UI chrome.
export const relation = {
  ally: tokens.color.relation.ally.value,
  adversary: tokens.color.relation.adversary.value,
  authority: tokens.color.relation.authority.value,
  dependent: tokens.color.relation.dependent.value,
  neutral: tokens.color.relation.neutral.value,
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────
// 4-point grid. `hair` (2) is the one sub-grid step — optical use only, never
// structural. Anything above s12 is bespoke (raw value + comment).
export const spacing = {
  hair: tokens.spacing.hair,
  s1: tokens.spacing.s1,
  s2: tokens.spacing.s2,
  s3: tokens.spacing.s3,
  s4: tokens.spacing.s4,
  s5: tokens.spacing.s5,
  s6: tokens.spacing.s6,
  s7: tokens.spacing.s7,
  s8: tokens.spacing.s8,
  s9: tokens.spacing.s9,
  s10: tokens.spacing.s10,
  s11: tokens.spacing.s11,
  s12: tokens.spacing.s12,
} as const;

// The left/right inset on every screen. Full-bleed bands cancel it with -GUTTER.
export const GUTTER = tokens.spacing.s5; // 20

// Radii are NOT a design token — the design keeps them bespoke and small
// (1–4) plus the pill. Defined here as the minimal mobile set; do not grow it.
export const radius = {
  hairline: 1,
  xs: 2,
  sm: 3,
  md: 4,
  pill: 999,
} as const;

// ── Typography ───────────────────────────────────────────────────────────
// The scale gives SIZE only — weight, leading, and family stay compositional.
// Reach for a role (`fontSize.base`), never a raw px.
export const fontSize = {
  micro: tokens.typography.scale.micro.px,
  fine: tokens.typography.scale.fine.px,
  detail: tokens.typography.scale.detail.px,
  base: tokens.typography.scale.base.px,
  lead: tokens.typography.scale.lead.px,
  sub: tokens.typography.scale.sub.px,
  title: tokens.typography.scale.title.px,
  head: tokens.typography.scale.head.px,
  display: tokens.typography.scale.display.px,
  hero: tokens.typography.scale.hero.px,
} as const;

// Loaded RN font-instance names per role/weight (platform mapping — the JSON
// carries CSS stacks). The Fraunces "wonky" instance bakes the design's
// opsz60/SOFT50/WONK1 signature; apply it wherever the design uses `.tp-h`
// (all heading sizes), not gated by size. Real italic cut is used for quotes —
// never synthesize italic from a display weight.
export const fontFamily = {
  displayWonky: 'FrauncesWonkyDisplay',
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'InterTight_400Regular',
  bodyMedium: 'InterTight_500Medium',
  bodySemiBold: 'InterTight_600SemiBold',
  bodyBold: 'InterTight_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium', // add to useFonts before adopting (.tp-num = 500)
} as const;

// ── Motion ───────────────────────────────────────────────────────────────
// cubic-bezier(a,b,c,d) → [a,b,c,d] for Reanimated's Easing.bezier(...). CSS
// keyword curves (ease-in-out) resolve to their standard control points.
function bezier(css: string): readonly [number, number, number, number] {
  if (css === 'ease-in-out') return [0.42, 0, 0.58, 1];
  const m = css.match(/-?[\d.]+/g);
  if (m && m.length === 4) {
    return [Number(m[0]), Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [0.4, 0, 0.2, 1]; // standard ease fallback
}

const d = tokens.motion.durations;
const c = tokens.motion.curves;

export const motion = {
  // Durations (ms) sourced from the token export.
  duration: {
    push: d.push.ms,
    pop: d.pop.ms,
    fade: d.fade.ms,
    slide: d.slide.ms,
    dissolve: d.dissolve.ms,
    reduced: d.reduced.ms,
  },
  // Easing control points for Easing.bezier(...spread).
  curve: {
    glide: bezier(c.glide),
    settle: bezier(c.settle),
    ease: bezier(c.ease),
    dissolveEase: bezier(c.dissolveEase),
  },
  // Reduced-motion contract: collapse every transition to a duration.reduced
  // opacity-only fade — no transform, no scale. Gate on useReducedMotion().
  reducedFade: { duration: d.reduced.ms, opacityOnly: true },
  // Splash/skeleton/toast keyframe timings live in the prototype (not the token
  // export). Sourced from design/ThinkPattern/lib/thinkpattern.jsx keyframes.
  anim: {
    rise: 700, // tp-rise — wordmark entrance (ease-out)
    bar: 1500, // tp-bar — splash progress (ease-in-out)
    shimmer: 1800, // tp-sk — skeleton sweep (ease-in-out, infinite)
    toast: 180, // toast entrance/exit
  },
} as const;

// ── Notifications ──────────────────────────────────────────────────────────
// Rationed model: hard cap, quiet hours, channel registry. (The icon/tab badge
// is intentionally NOT rendered — see the build plan; regenerate tokens.json on
// the design side once the badge is dropped there so this stays the SSOT.)
export const notifications = {
  dailyCap: tokens.notifications.dailyCap,
  quietHours: tokens.notifications.quietHours,
  channels: tokens.notifications.channels,
} as const;
