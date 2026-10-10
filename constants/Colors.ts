// ThinkPattern palette — now sourced from the design token export.
//
// Values live in constants/tokens.json (generated from design/ThinkPattern) and
// are mapped to RN by constants/theme.ts. This module just re-exports them so the
// long-standing `@/constants/Colors` import sites keep working while the values
// stay the design SSOT.
//
// `accent` (#b8862a) is the "now" semantic — never decorative. `slate` is
// mark/data-viz only. `faint` is dividers only, never text. The retired
// logo-gradient/ring tokens (logoBlue navy, logoOchre, ringOchre, focusRing)
// are gone — the brand mark is the sikku knot (ink strand + ochre pulli), not
// the old ring-p gradient.
export { colors, relation } from './theme';
