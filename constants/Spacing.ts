// Spacing — a thin compatibility shim over the design token rungs (constants/theme.ts).
//
// New/updated code should import the canonical rungs + screen gutter + radius
// straight from constants/theme.ts (`spacing`, `GUTTER`, `radius`) and the type
// scale from constants/Typography.ts (`fontSize`). This module keeps the
// historical t-shirt names working while components migrate to the rung names
// per phase. The one real value fix baked in here vs the old hand-maintained
// scale: gutter 18 → 20 (the design screen gutter, SP.s5).
import { spacing as rung, GUTTER } from './theme';

export { GUTTER };

export const spacing = {
  hair: rung.hair, // 2  — sub-grid optical step (matches @/constants/theme)
  xs: rung.s1, // 4
  sm: rung.s2, // 8
  md: rung.s3, // 12
  lg: rung.s4, // 16
  gutter: GUTTER, // 20  ← was 18
  xl: rung.s5, // 20
  xxl: rung.s6, // 24
  xxxl: rung.s8, // 32
} as const;

// Legacy radius set. Migrate consumers to `radius` from constants/theme.ts
// (design-true: hairline 1 / xs 2 / sm 3 / md 4 / pill) per phase.
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;
