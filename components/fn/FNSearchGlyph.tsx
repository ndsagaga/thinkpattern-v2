import Svg, { Circle, Line } from 'react-native-svg';

import { colors } from '@/constants/Colors';

type Props = {
  size?: number;
  color?: string;
};

// Magnifier glyph — shared by the FNHeader search entry and the search field.
// Geometry from design hifi-search.jsx SGlyph (circle + diagonal handle).
export function FNSearchGlyph({ size = 20, color = colors.ink }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={8.5} cy={8.5} r={6} stroke={color} strokeWidth={1.6} />
      <Line
        x1={13}
        y1={13}
        x2={17.5}
        y2={17.5}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
