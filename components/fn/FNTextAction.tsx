import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';

// Small right-edge text button — the "Clear" affordance in the Saved / History
// mastheads. Uppercase micro, link-coloured. Source: design/ThinkPattern TextAction.
export function FNTextAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.micro,
    letterSpacing: 1, // ~0.1em at 10px
    textTransform: 'uppercase',
    color: colors.link,
  },
});
