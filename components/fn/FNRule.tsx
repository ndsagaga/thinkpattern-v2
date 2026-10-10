import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/constants/Colors';

type Props = { style?: StyleProp<ViewStyle> };

export const FNRule = ({ style }: Props) => <View style={[styles.rule, style]} />;
export const FNRuleSoft = ({ style }: Props) => <View style={[styles.ruleSoft, style]} />;

const styles = StyleSheet.create({
  // Strong section rule (detail screens). Soft rule = the masthead / wordmark
  // hr (design FN.rule #b3ada1, a touch stronger than faint).
  rule: { height: 1, backgroundColor: colors.ink },
  ruleSoft: { height: 1, backgroundColor: colors.rule },
});
