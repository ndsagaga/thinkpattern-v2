import { StyleSheet, Text, View } from 'react-native';

import { FNMark } from './FNMark';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

// Centered empty state — faded mark, title, supporting line. Saved / History.
// Source: design/ThinkPattern EmptyState.
export function FNEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <FNMark size={44} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 48, alignItems: 'center' }, // SP.s12
  mark: { opacity: 0.3, marginBottom: spacing.xl },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.title,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail,
    lineHeight: 20,
    color: colors.ink2,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: spacing.sm,
  },
});
