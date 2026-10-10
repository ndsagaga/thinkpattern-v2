import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize, typography, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { FNWordmark } from './FNWordmark';
import { FNRuleSoft } from './FNRule';

type Props = {
  // Fires only when the user taps "Turn on notifications" — the host then asks
  // the OS for permission. Skipping never touches the system prompt.
  onEnable: () => void;
  onSkip: () => void;
};

// Permission priming — the polite ask before the OS prompt. This audience won't
// tolerate a day-one system dialog; we earn it by naming the restraint first.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → NotifPriming.
export function FNNotifPriming({ onEnable, onSkip }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.wordmarkRow}>
        <FNWordmark />
        <FNRuleSoft style={styles.rule} />
      </View>

      {/* Editorial column; the flex spacer pins the CTAs to the bottom. */}
      <View style={styles.body}>
        <Text style={[typography.cap, styles.kicker]}>Before we ask the system</Text>
        <Text style={styles.headline}>Only what earns your attention.</Text>
        <Text style={styles.lede}>
          We notify sparingly — never to pull you back for its own sake.
        </Text>

        <View style={styles.spacer} />

        <Pressable
          onPress={onEnable}
          accessibilityRole="button"
          accessibilityLabel="Turn on notifications"
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryText}>Turn on notifications</Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Not now"
          hitSlop={12}
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
        >
          <Text style={styles.secondaryText}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // Masthead wordmark + soft hairline (design: padding sp(SP.s2, SP.s5, 0)).
  wordmarkRow: {
    paddingTop: spacing.sm, // 8 (SP.s2)
    paddingHorizontal: spacing.gutter, // 20 (SP.s5)
  },
  rule: { marginTop: spacing.md }, // 12 (SP.s3)
  // design: flex column, padding sp(SP.s8, SP.s7, SP.s7) — 32 / 28 / 28.
  body: {
    flex: 1,
    paddingTop: spacing.xxxl, // 32 (SP.s8)
    paddingHorizontal: 28, // SP.s7
    paddingBottom: 28, // SP.s7
  },
  kicker: { color: colors.accent },
  // Headline — wonky Fraunces, TS.head (30).
  headline: {
    fontFamily: fontFamily.displayWonky,
    fontSize: fontSize.head, // 30 (TS.head)
    lineHeight: fontSize.head * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: fontSize.head * -0.018,
    color: colors.ink,
    marginTop: spacing.lg, // 16 (SP.s4)
  },
  lede: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base, // 15 (TS.base)
    lineHeight: fontSize.base * 1.52,
    color: colors.ink2,
    marginTop: spacing.lg, // 16 (SP.s4)
  },
  spacer: { flex: 1, minHeight: spacing.xxxl }, // design: flex spacer, minHeight SP.s8
  // Primary CTA — filled bistre bar (design: ink ground, paper text, padding sp(SP.s4, 0)).
  primary: {
    paddingVertical: spacing.lg, // 16 (SP.s4)
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  primaryPressed: { backgroundColor: colors.ink2 }, // cta-filled → ink2
  primaryText: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.base, // 15
    color: colors.paper,
    letterSpacing: fontSize.base * 0.01,
  },
  // Secondary "Not now" — muted, centered (design: marginTop SP.s4).
  secondary: {
    marginTop: spacing.lg, // 16 (SP.s4)
    alignItems: 'center',
  },
  secondaryPressed: { opacity: 0.6 },
  secondaryText: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.detail, // 13 (TS.detail)
    color: colors.muted,
  },
});
