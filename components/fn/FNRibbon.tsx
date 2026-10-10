import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';

// The save ribbon/bookmark glyph — resting = ink outline, saved = ochre-accent
// fill. Shared by the detail save button, the inline card saved-mark, and the
// Settings row icon so the mark is drawn in exactly one place.
export function FNRibbon({ saved = false, size = 20 }: { saved?: boolean; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={saved ? colors.accent : 'none'}
      stroke={saved ? colors.accent : colors.ink}
      strokeWidth={1.7}
      strokeLinejoin="round"
    >
      <Path d="M6 3.2h12a1 1 0 0 1 1 1V21l-7-4.4L5 21V4.2a1 1 0 0 1 1-1Z" />
    </Svg>
  );
}
