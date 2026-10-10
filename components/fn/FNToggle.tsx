import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/Colors';

// Visual switch only — the containing settings row owns the press + a11y
// (role="switch"). Ochre track when on, ink-tint when off. Source:
// design/ThinkPattern Toggle.
export function FNToggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 27, borderRadius: 20, justifyContent: 'center' },
  trackOn: { backgroundColor: colors.accent },
  trackOff: { backgroundColor: 'rgba(31, 26, 20, 0.22)' }, // ink @ 22%
  knob: {
    position: 'absolute',
    width: 21,
    height: 21,
    borderRadius: 21,
    backgroundColor: colors.paper,
  },
  knobOff: { left: 3 },
  knobOn: { left: 22 },
});
