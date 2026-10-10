import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FNRuleSoft } from './FNRule';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

type Props = {
  title: string;
  // Optional right-edge action (e.g. a "Clear" text button).
  action?: ReactNode;
};

// Secondary-screen masthead — back arrow + bold title + optional right action,
// with a soft rule below. Used by Settings / Saved / History. Sibling to FNNav
// (the detail masthead). Source: design/ThinkPattern SubNav.
export function FNSubNav({ title, action }: Props) {
  const router = useRouter();
  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <FNRuleSoft style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md, // 12 (design SP.s3)
    paddingHorizontal: spacing.gutter,
    paddingVertical: 8,
  },
  back: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 17, // design TS.lead
    lineHeight: 17,
    color: colors.ink,
  },
  title: {
    fontFamily: fontFamily.displayBold, // design tp-h, weight 700
    fontSize: fontSize.title, // 24 (TS.title)
    color: colors.ink,
  },
  action: { marginLeft: 'auto' },
  rule: { marginHorizontal: spacing.gutter },
});
