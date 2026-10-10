import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import type { Lens } from '@/lib/tabletSelection';
import { FNCap } from './FNCap';
import { FNMark } from './FNMark';
import { FNSkeletonDetail } from './FNSkeletonDetail';

// The detail pane with nothing selected — the canonical iPad "no selection"
// state (design: TabletEmptyDetail). A quiet, centred, lens-aware prompt; the
// mark recedes to faint. While the selected item's detail is fetching, the
// pane shows the shared detail skeleton instead.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → TabletEmptyDetail.

const NOSEL_COPY: Record<Lens, string> = {
  stories: 'Select a story to read it in full — its actors and time-ordered sources open here.',
  perspectives: 'Choose a perspective to read the column, its argument, and every citation.',
  actors: 'Pick an actor for their positions, focus areas, and key relationships.',
};
const NOSEL_NOUN: Record<Lens, string> = {
  stories: 'story',
  perspectives: 'perspective',
  actors: 'actor',
};

export function FNTabletEmptyDetail({
  lens,
  loading = false,
}: {
  lens: Lens;
  loading?: boolean;
}) {
  if (loading) return <FNSkeletonDetail />;
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.mark}>
          <FNMark size={56} />
        </View>
        <FNCap style={styles.cap}>No {NOSEL_NOUN[lens]} selected</FNCap>
        <Text style={styles.copy}>{NOSEL_COPY[lens]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl, // SP.s8 (32)
    backgroundColor: colors.paper,
  },
  body: { maxWidth: 360, alignItems: 'center' },
  mark: { opacity: 0.34 },
  cap: { marginTop: spacing.xl, textAlign: 'center' }, // SP.s5 (20)
  copy: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.lead,
    lineHeight: 25, // ~1.5
    color: colors.muted,
    marginTop: spacing.md, // SP.s3 (12)
    textAlign: 'center',
  },
});
