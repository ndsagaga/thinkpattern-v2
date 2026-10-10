import { View, StyleSheet } from 'react-native';

import { spacing } from '@/constants/Spacing';
import { FNSkeleton } from './FNSkeleton';

// Per design hifi-states.jsx FNSkeletonDetail. Mirrors the real detail
// layout — eyebrow + 4-line headline + hero block + body paragraphs —
// so content doesn't shift when data lands.
//
// Body line widths come straight from the design (varied widths read as
// natural prose; uniform widths read as a wall and look fake).
const BODY_BLOCK_1_WIDTHS = [100, 96, 92, 98, 88, 94] as const;
const BODY_BLOCK_2_WIDTHS = [97, 88, 94, 72] as const;

export function FNSkeletonDetail() {
  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <FNSkeleton width={120} height={9} />
        <FNSkeleton width="96%" height={26} marginTop={12} />
        <FNSkeleton width="82%" height={26} marginTop={6} />
        <FNSkeleton width="58%" height={26} marginTop={6} />
      </View>

      <View style={styles.hero}>
        <FNSkeleton width="100%" height={180} />
      </View>

      <View style={styles.bodyBlock1}>
        {BODY_BLOCK_1_WIDTHS.map((w, i) => (
          <FNSkeleton
            key={i}
            width={`${w}%`}
            height={11}
            marginTop={i === 0 ? 0 : 8}
          />
        ))}
        <FNSkeleton width="54%" height={11} marginTop={8} />
      </View>

      <View style={styles.bodyBlock2}>
        {BODY_BLOCK_2_WIDTHS.map((w, i) => (
          <FNSkeleton
            key={i}
            width={`${w}%`}
            height={11}
            marginTop={i === 0 ? 0 : 8}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.gutter,
  },
  head: {
    paddingTop: 16,
  },
  hero: {
    marginTop: 18,
  },
  bodyBlock1: {
    paddingTop: 18,
  },
  bodyBlock2: {
    paddingTop: 22,
  },
});
