import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';

import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import { motion } from '@/constants/theme';

// Status toasts in one component — per design hifi-states.jsx FNRefreshToast.
// Bottom-anchored above the tab bar; ink ground; serif label + mono caps meta;
// optional action on the right (failed state only). (The v3.0 "up to date" /
// "+N new" split required a snapshot-rotation diff that per-object delivery
// can't reliably produce — collapsed to a single "Refreshed." confirmation.)
//
// Entrance/exit live at this layer rather than baked into the hook so the hook
// stays pure-state. Hosts conditionally mount/unmount the toast (slot → null);
// Reanimated layout animations let us run the exit BEFORE the view leaves the
// tree — without that, unmount would be abrupt. Design grammar: `tp-fd-in`
// (opacity 0→1 + translateY 8→0) in, `tp-fd-out` (opacity 1→0) out, both on
// motion.curve.ease over motion.anim.toast. ReduceMotion.System defers to the
// OS preference: reduced motion collapses transform out and shortens to a fade.

export type FNRefreshToastProps =
  | { kind: 'refreshed'; metaLabel: string }
  | { kind: 'failed'; onRetry: () => void; metaLabel?: string }
  // 'gone' — a notification target that was removed before the user opened it.
  // Same visual language as 'failed' (no retry — the object isn't coming back).
  | { kind: 'gone'; metaLabel?: string }
  // 'notice' — an informational line: no status dot, no meta (design ToastBar).
  | { kind: 'notice'; label: string };

const FAIL_DOT = '#c75a4f';
// design tp-fd-in lift: translateY 8→0 (FadeInDown's default offset is larger).
const ENTER_TRANSLATE_Y = 8;

// tp-fd-in: opacity 0→1 + translateY 8→0, motion.curve.ease, toast duration.
// FadeInDown enters from +distance below to 0; withInitialValues pins that
// distance to the design's 8px lift instead of the builder default.
// (.easing accepts the EasingFunctionFactory directly; no .factory() call.)
const enterAnim = FadeInDown.duration(motion.anim.toast)
  .easing(Easing.bezier(...motion.curve.ease))
  .withInitialValues({ transform: [{ translateY: ENTER_TRANSLATE_Y }] })
  .reduceMotion(ReduceMotion.System);

// tp-fd-out: opacity 1→0 (no transform), same easing + duration — a true
// fade-out before unmount where there used to be an abrupt cut.
const exitAnim = FadeOut.duration(motion.anim.toast)
  .easing(Easing.bezier(...motion.curve.ease))
  .reduceMotion(ReduceMotion.System);

export function FNRefreshToast(props: FNRefreshToastProps) {
  const { dotColor, label, metaLabel, onAction, actionLabel } = describe(props);

  return (
    <Animated.View
      entering={enterAnim}
      exiting={exitAnim}
      style={styles.toast}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.copy}>
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <Text style={styles.label}>{label}</Text>
        {metaLabel ? <Text style={styles.meta}>{metaLabel}</Text> : null}
      </View>
      {onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function describe(props: FNRefreshToastProps): {
  dotColor?: string;
  label: string;
  metaLabel?: string;
  onAction?: () => void;
  actionLabel?: string;
} {
  switch (props.kind) {
    case 'refreshed':
      return {
        dotColor: colors.accent,
        label: 'Refreshed.',
        metaLabel: props.metaLabel,
      };
    case 'failed':
      return {
        dotColor: FAIL_DOT,
        label: "Couldn't refresh.",
        metaLabel: props.metaLabel ?? 'No connection',
        onAction: props.onRetry,
        actionLabel: 'Retry',
      };
    case 'gone':
      return {
        dotColor: FAIL_DOT,
        label: 'No longer available.',
        metaLabel: props.metaLabel ?? 'Removed',
      };
    case 'notice':
      return { label: props.label };
  }
}

const DOT_SIZE = 6;

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    backgroundColor: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    // 0 6px 20px rgba(0,0,0,0.18) per design.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignSelf: 'center',
  },
  label: {
    flexShrink: 1, // a longer notice wraps instead of pushing past the toast
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.paper,
  },
  meta: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2, // 0.12em at 10px
    textTransform: 'uppercase',
    color: colors.accentSoft,
  },
  action: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionPressed: { opacity: 0.7 },
  actionLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.paper,
  },
});
