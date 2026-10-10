import { View, StyleSheet } from 'react-native';

import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { FNSkeleton } from './FNSkeleton';

// Per design hifi-states.jsx FNColdStartFirstRun: four story-shaped rows
// at decreasing opacity (1, 0.88, 0.76, 0.64). Each row mirrors the real
// list-item layout — eyebrow caps, two-line title, two-line summary —
// so the transition into real data doesn't shift content.
const ROW_COUNT = 4;
const ROW_OPACITY = [1, 0.88, 0.76, 0.64] as const;

export function FNSkeletonList() {
  return (
    <View style={styles.container}>
      {Array.from({ length: ROW_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.row,
            { opacity: ROW_OPACITY[i] },
            i === ROW_COUNT - 1 && styles.rowLast,
          ]}
        >
          <FNSkeleton width={86} height={9} />
          <FNSkeleton width="94%" height={18} marginTop={10} />
          <FNSkeleton width="72%" height={18} marginTop={5} />
          <FNSkeleton width="100%" height={11} marginTop={10} />
          <FNSkeleton width="64%" height={11} marginTop={4} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.gutter,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.faint,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});
