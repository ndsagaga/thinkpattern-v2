import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';

export function HeartIcon({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? colors.link : 'none'}
        stroke={filled ? colors.link : colors.ink2}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CommentIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 5.5h16v10.5H9.5L5 19.5V16H4z"
        fill="none"
        stroke={colors.ink2}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
