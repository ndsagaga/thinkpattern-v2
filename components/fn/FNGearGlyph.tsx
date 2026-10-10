import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '@/constants/Colors';

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

// Settings mark — a plain 8-tooth gear (no chrome around it). Source:
// design/ThinkPattern GearGlyph.
export function FNGearGlyph({ color = colors.ink, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {TEETH.map((a) => (
        <Rect
          key={a}
          x={11}
          y={1.4}
          width={2}
          height={4}
          rx={0.6}
          fill={color}
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <Circle cx={12} cy={12} r={6.4} fill="none" stroke={color} strokeWidth={1.7} />
      <Circle cx={12} cy={12} r={2.4} fill="none" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}
