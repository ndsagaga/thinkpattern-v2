import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
  type DimensionValue,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/constants/Colors';

type Props = {
  width?: DimensionValue;
  height?: number;
  marginTop?: number;
  style?: StyleProp<ViewStyle>;
};

// Shimmer cadence per design hifi-states.jsx FN_SHIMMER_CSS:
// 1.8s ease-in-out, infinite. Sweep moves from 200% to -200% of container
// (background-position equivalent) — total 400% travel.
const SHIMMER_DURATION_MS = 1800;
// Gradient overlay is 220% of container width per design background-size.
// `accentSoft` highlight peaks at 50%; spans 38% → 62% (24% of gradient).
const GRADIENT_WIDTH_FACTOR = 2.2;
// expo-linear-gradient types `locations` as a fixed-arity tuple; declaring
// it inline keeps the literal types and avoids casts.
const GRADIENT_LOCATIONS: readonly [number, number, number, number, number] = [
  0, 0.38, 0.5, 0.62, 1,
];
const GRADIENT_COLORS: readonly [string, string, string, string, string] = [
  colors.paper2,
  colors.paper2,
  colors.accentSoft,
  colors.paper2,
  colors.paper2,
];

// Skeleton block w/ FN-toned shimmer. Base = paper2; sweep = highlight
// tinted with accentSoft. Reads as "considered, not instant" without copy.
//
// Implementation: container holds a paper2 base; an absolutely-positioned
// gradient overlay (220% width) is translated horizontally by Reanimated.
// Width is measured via onLayout rather than animated as a percentage so
// the math works on every screen size and Reanimated can run the worklet
// on the UI thread. Reduced-motion strips the sweep entirely (paper2 base
// only) per design + handoff-a11y §6.
export function FNSkeleton({
  width = '100%',
  height = 12,
  marginTop = 0,
  style,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
  }, [reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    // At progress 0 → translateX = -containerWidth (sweep enters from left).
    // At progress 1 → translateX = +containerWidth (sweep exits right).
    // Total travel: 2 × containerWidth, mirrors design's 400% sweep distance.
    const translateX = -containerWidth + progress.value * containerWidth * 2;
    return { transform: [{ translateX }] };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== containerWidth) setContainerWidth(w);
  };

  const showSweep = containerWidth > 0 && !reducedMotion;
  const overlayWidth = containerWidth * GRADIENT_WIDTH_FACTOR;

  return (
    <View
      onLayout={onLayout}
      style={[styles.base, { width, height, marginTop }, style]}
    >
      {showSweep ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            { width: overlayWidth, height },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            locations={GRADIENT_LOCATIONS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.paper2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    flex: 1,
  },
});
