import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';

type Props = {
  style?: StyleProp<ViewStyle>;
  // True when the host slot is too small for the "IMAGE / UNREACHABLE"
  // mono caps to read (rule of thumb: width < 70px). The glyph centers
  // instead and the label is dropped.
  compact?: boolean;
};

// Editorial fallback for an image whose URL exists but failed to load.
// Per design hifi-states.jsx FNBrokenImages: paper2 box, 1px faint border,
// mono caps "IMAGE / UNREACHABLE", ochre `!` anchored top-right. The `!`
// is the one piece of color in the cell — a single mark of trouble against
// a paper background, in the editorial vocabulary the rest of the app uses.
export function FNBrokenSrcImg({ style, compact = false }: Props) {
  if (compact) {
    return (
      <View style={[styles.frame, style]}>
        <Text style={styles.glyphCenter}>!</Text>
      </View>
    );
  }
  return (
    <View style={[styles.frame, style]}>
      <Text style={styles.glyphCorner}>!</Text>
      <Text style={styles.label}>{'IMAGE\nUNREACHABLE'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    lineHeight: 12, // ~1.3
    letterSpacing: 0.9, // 0.1em at 9px
    textAlign: 'center',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  glyphCorner: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontFamily: fontFamily.mono,
    fontSize: 9,
    lineHeight: 9,
    color: colors.accent,
  },
  glyphCenter: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    lineHeight: 14,
    color: colors.accent,
  },
});
