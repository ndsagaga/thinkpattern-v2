import { View, Text, Pressable, StyleSheet } from 'react-native';

import { FNCap } from './FNCap';
import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';

type Props = {
  title: string;
  onPress?: () => void;
};

// Thread continuation block — promoted from a "↳" link to a doorway.
// 16×2 ochre bar + cap label + serif-bold title + arrow. Source:
// design/design_handoff_perspectives/hifi-fieldnotebook.jsx FNThread.
//
// The design uses FN.accent for the cap and arrow, but per a11y handoff §1.1
// accent fails AA as text on paper (2.72:1). Cap and arrow use colors.link
// (5.16:1 AA) instead. The 16×2 bar is decorative, so accent is fine there.
export function FNThread({ title, onPress }: Props) {
  return (
    <Pressable
      style={styles.wrap}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Thread: ${title}` : undefined}
    >
      <View style={styles.bar} />
      <FNCap color={colors.link}>Thread</FNCap>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.arrow}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
  },
  bar: {
    width: 16,
    height: 2,
    backgroundColor: colors.accent,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.ink,
  },
  arrow: {
    color: colors.link,
    fontFamily: fontFamily.uiMedium,
    fontSize: 14.5,
  },
});
