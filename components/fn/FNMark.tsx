import Svg, { G, Path, Circle } from 'react-native-svg';

import { colors } from '@/constants/Colors';

type Props = {
  size?: number;
  // Single-fill override (solid stroke, pulli dropped) — spinners / motion specs.
  color?: string;
  // 1-color variant (strand + pulli both in ink) — 16px favicon / 1-color print.
  mono?: boolean;
};

// Sikku-knot mark — one unbroken strand woven through a 4×4 pulli lattice,
// rotated 45° on a 100-unit grid, with five ochre pulli (the dots). Geometry is
// generated, never hand-authored; ported verbatim from the design export
// design/ThinkPattern/assets/brand/thinkpattern-mark.svg (lib/knot.js buildKnot).
// `strokeWidth` is intentionally fractional — it is pre-divided by the scale
// transform so a literal port matches the export; do not "fix" it or reach for
// non-scaling-stroke.
// Always rendered with accessible={false}; consumers (FNWordmark, splash) own the label.
const KNOT_T = 'translate(50 50) rotate(45) scale(12.564) translate(-2.5 -2.5)';

const STRAND = [
  'M1 0.54 L1 4.46', 'M2 0.54 L2 4.46', 'M3 0.54 L3 4.46', 'M4 0.54 L4 4.46',
  'M0.54 1 L4.46 1', 'M0.54 2 L4.46 2', 'M0.54 3 L4.46 3', 'M0.54 4 L4.46 4',
  'M1 0.54 A 0.46 0.46 0 1 0 0.54 1', 'M4 0.54 A 0.46 0.46 0 1 1 4.46 1',
  'M1 4.46 A 0.46 0.46 0 1 1 0.54 4', 'M4 4.46 A 0.46 0.46 0 1 0 4.46 4',
  'M2 0.54 A 0.5 0.5 0 0 1 3 0.54', 'M2 4.46 A 0.5 0.5 0 0 0 3 4.46',
  'M0.54 2 A 0.5 0.5 0 0 0 0.54 3', 'M4.46 2 A 0.5 0.5 0 0 1 4.46 3',
];

const PULLI: ReadonlyArray<readonly [number, number]> = [
  [2.5, 2.5], [0.54, 0.54], [4.46, 0.54], [0.54, 4.46], [4.46, 4.46],
];

export function FNMark({ size = 14, color, mono = false }: Props) {
  const stroke = color ?? colors.ink;
  // Default: ink strand + ochre pulli. `mono`: pulli in ink. `color` override:
  // solid single-ink mark, pulli dropped (spinner / motion variant).
  const dotColor = color ? null : mono ? colors.ink : colors.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <G transform={KNOT_T}>
        <G fill="none" stroke={stroke} strokeWidth={0.191} strokeLinecap="round" strokeLinejoin="round">
          {STRAND.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
      </G>
      {dotColor && (
        <G transform={KNOT_T}>
          <G fill={dotColor} stroke="none">
            {PULLI.map(([cx, cy], i) => (
              <Circle key={i} cx={cx} cy={cy} r={0.14} />
            ))}
          </G>
        </G>
      )}
    </Svg>
  );
}
