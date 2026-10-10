import { View, Text, Pressable, StyleSheet } from 'react-native';

import { FNSrcImg } from './FNSrcImg';
import { FNCap } from './FNCap';
import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import type { FNSourceItem } from './FNSourceRail';

type Props = {
  items: FNSourceItem[];
  more: number;
  onMore?: () => void;
  // Tap handler for individual rows. When provided, each row becomes a
  // Pressable. RN's gesture responder claims the tap at the innermost
  // pressable, so this works correctly even when the list is inside a
  // parent Link that wraps the whole card.
  onItemPress?: (item: FNSourceItem) => void;
};

const ROW_DIVIDER = 'rgba(31, 26, 20, 0.14)'; // ink @ 14%

// Vertical thumbnail rows. 2-line clamp on headline so card height stays
// stable across long titles. Source: design/design_handoff_perspectives/hifi-fieldnotebook.jsx FNSourceList.
export function FNSourceList({ items, more, onMore, onItemPress }: Props) {
  // When onMore isn't supplied (e.g. inside a story-card Link), render the
  // "+N more" row as a plain View so the parent Link receives the tap.
  // A nested Pressable would swallow it.
  const MoreRow = onMore ? Pressable : View;
  return (
    <View style={styles.list}>
      {items.map((it, i) =>
        onItemPress ? (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.rowTopBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() => onItemPress(it)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${it.src}: ${it.title}`}
          >
            <FNSrcImg tint={it.tint ?? i} imageUrl={it.imageUrl} style={styles.thumb} compact />
            <View style={styles.meta}>
              <FNCap>{it.src}</FNCap>
              <Text style={styles.title} numberOfLines={2}>
                {it.title}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View key={i} style={[styles.row, i > 0 && styles.rowTopBorder]}>
            <FNSrcImg tint={it.tint ?? i} imageUrl={it.imageUrl} style={styles.thumb} compact />
            <View style={styles.meta}>
              <FNCap>{it.src}</FNCap>
              <Text style={styles.title} numberOfLines={2}>
                {it.title}
              </Text>
            </View>
          </View>
        ),
      )}
      {more > 0 && (
        <MoreRow
          onPress={onMore}
          style={[styles.moreRow, styles.rowTopBorder]}
          accessibilityRole={onMore ? 'button' : undefined}
          accessibilityLabel={onMore ? `View all ${more} more sources` : undefined}
        >
          <Text style={styles.moreLabel}>+{more} more sources</Text>
          <Text style={styles.moreArrow}>→</Text>
        </MoreRow>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    gap: 12, // SP.s3
    paddingVertical: 12, // SP.s3 (design: padding sp(SP.s3, 0))
    alignItems: 'center',
  },
  rowTopBorder: {
    borderTopWidth: 1,
    borderTopColor: ROW_DIVIDER,
  },
  rowPressed: {
    opacity: 0.6,
  },
  thumb: {
    width: 54, // design: 54×40 source thumb
    height: 40,
    borderRadius: 3,
    backgroundColor: colors.paper2,
  },
  meta: {
    flex: 1,
    flexDirection: 'column',
    gap: 2, // SP.hair
  },
  title: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.ink,
  },
  moreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  moreLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.ink,
    letterSpacing: 1.2,
  },
  moreArrow: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.2,
  },
});
