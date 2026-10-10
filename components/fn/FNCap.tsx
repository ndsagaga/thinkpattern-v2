import { Text, StyleProp, TextStyle } from 'react-native';

import { typography } from '@/constants/Typography';
import { colors } from '@/constants/Colors';

type Props = {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
};

// Mono uppercase caps — eyebrow, metadata, section labels.
// Default color is `muted`. Override via prop for emphasis (`ink`) or affordance (`link`).
export function FNCap({ children, color = colors.muted, style }: Props) {
  return <Text style={[typography.cap, { color }, style]}>{children}</Text>;
}
