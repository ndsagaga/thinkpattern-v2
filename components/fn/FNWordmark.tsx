import { View, Text } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import { FNMark } from './FNMark';

// Sikku-knot mark + "ThinkPattern" lockup — "Think" in bistre (ink2), "Pattern"
// in ochre (accent). Matched to design/ThinkPattern/assets/brand/
// thinkpattern-lockup-horizontal.svg:
//   - mark→text GAP is the lockup's 24/124 ≈ 0.19× the mark (6px at MARK_SIZE 30)
//   - text is the WONKY Fraunces cut (opsz 60 / SOFT 50 / WONK 1) — the design's
//     heavier, stronger wordmark instance, not the plain 600 cut
//   - tracking -0.46 ≈ the lockup's -0.024em
// The whole group is one accessible header; the mark is decorative.
const FONT_SIZE = 19;
const MARK_SIZE = 30;
const GAP = 6;

export function FNWordmark() {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}
      accessible
      accessibilityLabel="ThinkPattern"
      accessibilityRole="header"
    >
      <FNMark size={MARK_SIZE} />
      <Text
        style={{
          fontFamily: fontFamily.displayWonky,
          fontSize: FONT_SIZE,
          letterSpacing: -0.46, // -0.024em — the lockup's tight tracking
        }}
        accessible={false}
        allowFontScaling={false}
      >
        <Text style={{ color: colors.ink2 }}>Think</Text>
        <Text style={{ color: colors.accent }}>Pattern</Text>
      </Text>
    </View>
  );
}
