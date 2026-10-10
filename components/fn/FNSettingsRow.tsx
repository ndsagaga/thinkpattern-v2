import { forwardRef, type ReactNode } from 'react';
import { Pressable, type PressableProps, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  icon?: ReactNode;
  label: string;
  // Optional secondary line under the label — e.g. the Contact row surfaces the
  // support email as visible text (a mailto alone shows the reader nothing).
  sublabel?: string;
  // Trailing accessory — a count, a chevron, or (pass 2) a toggle.
  right?: ReactNode;
  // Drop the hairline on the final row of a group.
  last?: boolean;
};

// A settings-menu row: optional leading icon, label, optional right accessory,
// hairline divider unless `last`. Forwards press + ref so it can be a
// `<Link asChild>` child (navigation rows) or take a plain onPress (in-place
// rows). Source: design/ThinkPattern SettingsRow.
export const FNSettingsRow = forwardRef<View, Props>(function FNSettingsRow(
  { icon, label, sublabel, right, last, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      // `...rest` (which includes the props <Link asChild> injects) comes first
      // so it can supply onPress/role — but `style` stays last so the row's
      // flexDirection is never overwritten by an injected style.
      {...rest}
      style={[styles.row, last && styles.last]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg, // 16 (design SP.s4)
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.faint,
  },
  last: { borderBottomWidth: 0 },
  icon: { width: 20, alignItems: 'center' },
  labelCol: { flex: 1 },
  label: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.base, color: colors.ink },
  // Support address, shown as visible text so contact info is legible in-app
  // (not hidden behind a mailto). Mono muted reads as an address, not a heading.
  sublabel: { fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.muted, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
