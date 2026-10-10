import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';

type Variant = 'primary' | 'secondary' | 'footer';

type Props = {
  onPress: () => void;
  // Defaults to "Try again". Override for context-specific copy.
  label?: string;
  // 'primary' (default) — ink-fill, paper text, ink border. The dominant
  //   action in an error placeholder. Per design FNErrorDetail.
  // 'secondary' — paper-fill, ink text, ink border. Pairs alongside
  //   primary in the two-button row (e.g. "← Back to list").
  // 'footer' — text-only, top-border-only, full-width. Used by
  //   FNColdOffline as the bottom-of-page action.
  //
  // Per a11y handoff §1.2: ochre-fill buttons are explicitly ruled out
  // (paper-on-ochre fails contrast). Ink is the spec'd primary fill.
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

// Both 'primary' and 'secondary' stretch by default — they're designed
// to sit in flex:1 containers in two-button rows. Wrap in a fixed-width
// view if you need an auto-width button. 'footer' always stretches.
export function FNRetryButton({
  onPress,
  label = 'Try again',
  variant = 'primary',
  style,
}: Props) {
  const baseStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'secondary'
        ? styles.btnSecondary
        : styles.btnFooter;
  const labelStyle =
    variant === 'primary'
      ? styles.labelPrimary
      : variant === 'secondary'
        ? styles.labelSecondary
        : styles.labelFooter;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [baseStyle, pressed && styles.pressed, style]}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Per design FNErrorDetail: 1px ink border + ink fill + 12px padding.
  // No alignSelf — the consumer decides width by wrapping or letting it
  // stretch.
  btnPrimary: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  // Same shape as primary, paper fill, ink text. Used as the "← Back to
  // list" companion.
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  // FNColdOffline's bottom-of-page button: top-border, no fill, larger
  // padding. Distinct from primary/secondary on purpose — full-page
  // editorial errors get a quieter action.
  btnFooter: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pressed: { opacity: 0.85 },
  labelPrimary: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.26, // 0.02em at 13px
    color: colors.paper,
  },
  labelSecondary: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.26,
    color: colors.ink,
  },
  labelFooter: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28, // 0.02em at 14px
    color: colors.ink,
  },
});
