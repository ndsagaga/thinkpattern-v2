import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';

// Share affordance — an arrow rising out of a tray. The detail-nav action glyph.
// Source: design hifi-fieldnotebook.jsx FNNav shareIcon.
export function FNShareGlyph({ color = colors.ink, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 12 L10 3.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path
        d="M7 6.5 L10 3.5 L13 6.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 10 L5.5 10 Q4 10 4 11.5 L4 15.5 Q4 17 5.5 17 L14.5 17 Q16 17 16 15.5 L16 11.5 Q16 10 14.5 10 L13 10"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
