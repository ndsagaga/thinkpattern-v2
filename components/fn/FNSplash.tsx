import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import { FNWordmark } from './FNWordmark';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { motion } from '@/constants/theme';

// Launch / splash — paper ground, the mark rises in (tp-rise), an ochre
// hairline loads left→right (tp-bar), a mono caption sits below.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → Splash.
//
// Self-contained overlay: `app/_layout.tsx` mounts it on top of the tree and
// cross-dissolves it out once the app is ready. It owns only the *entrance*
// keyframes; the exit dissolve is the caller's concern.
//
// Reduced-motion contract: render the final resting state instantly — no
// transform, no scale, the bar full, the wordmark settled.

// Splash progress track — bespoke (design: width 116, height 2; not SP rungs).
const TRACK_W = 116;
const TRACK_H = 2;
// The fill is ochre; the track behind it is a 12%-ink hairline. Design:
// color-mix(in oklch, ink 12%, transparent). RN has no runtime color-mix, so
// this is ink (#1f1a14 → rgb 31,26,20) at 0.12 alpha — the closest faithful
// resolve. FLAG: oklch-mixed 12% reads slightly different from sRGB-alpha 12%;
// eyeball on device against the design and nudge alpha if the track is off.
const TRACK_BG = 'rgba(31, 26, 20, 0.12)';
// design: caption + bar sit ~56px off the bottom; wordmark optically centred.
const BOTTOM_INSET = 56;

export function FNSplash() {
  const reducedMotion = useReducedMotion();

  // tp-rise — wordmark entrance.
  const riseOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const riseTranslateY = useSharedValue(reducedMotion ? 0 : 10);
  const riseScale = useSharedValue(reducedMotion ? 1 : 0.96);
  // tp-bar — progress fill, scaleX 0→1 from the left edge.
  const barScaleX = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      // Final state already set above; nothing to animate.
      return;
    }
    riseOpacity.value = withTiming(1, {
      duration: motion.anim.rise,
      easing: Easing.out(Easing.ease),
    });
    riseTranslateY.value = withTiming(0, {
      duration: motion.anim.rise,
      easing: Easing.out(Easing.ease),
    });
    riseScale.value = withTiming(1, {
      duration: motion.anim.rise,
      easing: Easing.out(Easing.ease),
    });
    barScaleX.value = withTiming(1, {
      duration: motion.anim.bar,
      easing: Easing.bezier(...motion.curve.dissolveEase), // ease-in-out
    });
  }, [reducedMotion, riseOpacity, riseTranslateY, riseScale, barScaleX]);

  const riseStyle = useAnimatedStyle(() => ({
    opacity: riseOpacity.value,
    transform: [
      { translateY: riseTranslateY.value },
      { scale: riseScale.value },
    ],
  }));

  // transform-origin: left. RN scales about centre, so we offset the fill by
  // half-width, scale, then offset back — the net effect anchors the left edge.
  // FLAG: verify the fill grows from the left on device (see summary).
  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -TRACK_W / 2 },
      { scaleX: barScaleX.value },
      { translateX: TRACK_W / 2 },
    ],
  }));

  return (
    <View style={styles.root} accessibilityElementsHidden>
      <View style={styles.center}>
        <Animated.View style={riseStyle}>
          <FNWordmark />
        </Animated.View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
        <Text style={styles.caption}>Compiling today’s brief</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.paper,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // bespoke: optical-centre nudge above the mark (design paddingBottom 70).
    paddingBottom: 70,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_INSET,
    alignItems: 'center',
    gap: spacing.lg, // 16 (design gap SP.s4)
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    backgroundColor: TRACK_BG,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
  },
  caption: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro, // 10 — TS.micro
    letterSpacing: 1.6, // 0.16em at 10px
    textTransform: 'uppercase',
    color: colors.muted,
  },
});
