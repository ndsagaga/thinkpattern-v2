import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FNCap } from '@/components/fn/FNCap';
import { colors } from '@/constants/Colors';
import { typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

// List-row kicker (design/ThinkPattern PerspAudioBadge): a hushed "· ▶ N min"
// that reads as one unit with the row's cap eyebrow. Shown only when a
// perspective carries audio. Static label — no mono jitter beyond the count.
export function PerspAudioBadge({ seconds }: { seconds: number }) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return (
    <View style={styles.badge} accessible accessibilityLabel={`Audio, ${mins} minutes`}>
      <Text style={styles.dot}>·</Text>
      <Svg width={8} height={9} viewBox="0 0 8 9">
        <Path d="M0.8 0.8 L7.2 4.5 L0.8 8.2 Z" fill={colors.muted} />
      </Svg>
      <FNCap>
        <Text style={typography.num}>{mins}</Text> min
      </FNCap>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { color: colors.faint },
});
