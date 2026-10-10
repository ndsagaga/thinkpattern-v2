import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { FNCap } from '@/components/fn/FNCap';
import { colors } from '@/constants/Colors';

type Props = {
  // The place to mark — a story's primary location name. Renders nothing when
  // absent: diffuse / multi-site / non-physical stories have no single center,
  // so the tag simply doesn't appear (no "Multiple locations" fallback).
  place?: string | null;
};

// Location tag — shared by the story card and story-detail header. A thin
// teardrop pin (ink, matching the now-monochrome brand mark [[FNMark]]),
// followed by the place name in the mono metadata voice. No box or chrome;
// sits on the meta row's baseline opposite the timestamp.
// Source: design hifi-fieldnotebook.jsx FNLocationTag.
export function FNLocationTag({ place }: Props) {
  if (!place) return null;
  return (
    <View style={styles.tag}>
      <Svg width={8} height={10} viewBox="0 0 10 13" style={styles.pin} accessible={false}>
        <Path
          d="M5 0.7 C2.5 0.7 0.7 2.6 0.7 4.9 C0.7 8.2 5 12.3 5 12.3 C5 12.3 9.3 8.2 9.3 4.9 C9.3 2.6 7.5 0.7 5 0.7 Z"
          stroke={colors.ink}
          strokeWidth={1.1}
          fill="none"
        />
        <Circle cx={5} cy={4.9} r={1.7} fill={colors.ink} />
      </Svg>
      <FNCap color={colors.ink} style={{ transform: [{ translateY: 0.75 }] }}>{place}</FNCap>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  // The pin has no glyph baseline, so it's optically centered against the caps
  // rather than baseline-aligned, then nudged 0.5px to sit flush with them.
  pin: { alignSelf: 'center', transform: [{ translateY: 0.5 }] },
});
