import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/constants/Colors';

// Audio control glyphs, ported 1:1 from design/ThinkPattern (AudioPlayGlyph /
// AudioPauseGlyph / AudioSpinner). Colour is passed in so the play button can
// flip ink↔paper on the ochre "playing" disc.

export function AudioPlayGlyph({ color = colors.ink, size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {/* Slight optical nudge right, matching the design's translateX(0.5). */}
      <Path
        d="M4.5 2.6 L13.5 8 L4.5 13.4 Z"
        fill={color}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AudioPauseGlyph({ color = colors.ink, size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect x={3.6} y={2.8} width={3} height={10.4} rx={1} fill={color} />
      <Rect x={9.4} y={2.8} width={3} height={10.4} rx={1} fill={color} />
    </Svg>
  );
}

// Indeterminate loading ring — a 900ms linear spin, stilled under reduced motion.
export function AudioSpinner({ color = colors.ink, size = 16 }: { color?: string; size?: number }) {
  const rot = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(rot);
  }, [reduced, rot]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 16 16">
        <Circle cx={8} cy={8} r={6} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={1.6} />
        <Path d="M8 2 a6 6 0 0 1 6 6" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
