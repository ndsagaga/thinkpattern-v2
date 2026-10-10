import { View, ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FNSrcImg } from './FNSrcImg';
import { FNCap } from './FNCap';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';

export type FNSourceItem = {
  src: string;
  title: string;
  imageUrl?: string | null;
  tint?: number;
  // Article URL. Required when `onItemPress` is wired; safe to omit
  // for read-only displays.
  url?: string;
};

type Props = {
  items: FNSourceItem[];
  more: number;
  onMore?: () => void;
  // Tap handler for individual tiles. When provided, each tile becomes a
  // Pressable. RN's gesture responder claims the tap at the innermost
  // pressable, so this works correctly even when the rail is inside a
  // parent Link that wraps the whole card — the row swallows the tap,
  // the card's outer Link doesn't fire.
  onItemPress?: (item: FNSourceItem) => void;
  // Background the right-edge fade should fade to. Defaults to paper for
  // standalone use; pass the surrounding container's bg when nested inside
  // a tinted block (e.g. story card "Top sources").
  bg?: string;
};

const TILE_WIDTH = 144; // design: flex 0 0 144px
const TILE_GAP = 12; // SP.s3
const BLEED = 20; // SP.s5 — bleed to the gutter

// Horizontal scroll of image-led source tiles. snapToInterval mimics the
// design's `scroll-snap-type: x mandatory`. 28px right-edge gradient hints
// at scroll. Source: design/design_handoff_perspectives/hifi-fieldnotebook.jsx FNSourceRail.
export function FNSourceRail({ items, more, onMore, onItemPress, bg = colors.paper }: Props) {
  // When onMore isn't supplied (e.g. inside a story-card Link), render the
  // "+N more" tile as a plain View so the parent Link receives the tap.
  const MoreTile = onMore ? Pressable : View;
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE_WIDTH + TILE_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.row}
      >
        {items.map((it, i) =>
          onItemPress ? (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => onItemPress(it)}
              accessibilityRole="link"
              accessibilityLabel={`Open ${it.src}: ${it.title}`}
            >
              <FNSrcImg tint={it.tint ?? i} imageUrl={it.imageUrl} style={styles.tileImg} />
              <FNCap style={styles.tileSrc}>{it.src}</FNCap>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {it.title}
              </Text>
            </Pressable>
          ) : (
            <View key={i} style={styles.tile}>
              <FNSrcImg tint={it.tint ?? i} imageUrl={it.imageUrl} style={styles.tileImg} />
              <FNCap style={styles.tileSrc}>{it.src}</FNCap>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {it.title}
              </Text>
            </View>
          ),
        )}
        {more > 0 && (
          <MoreTile
            onPress={onMore}
            style={styles.moreTile}
            accessibilityRole={onMore ? 'button' : undefined}
            accessibilityLabel={onMore ? `View all ${more} more sources` : undefined}
          >
            <Text style={styles.moreNum}>+{more}</Text>
            <FNCap>more</FNCap>
          </MoreTile>
        )}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[`${bg}00`, bg]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginHorizontal: -BLEED, // bleed to the surrounding block's edges
  },
  row: {
    gap: TILE_GAP,
    paddingHorizontal: BLEED,
    paddingBottom: 4,
  },
  tile: {
    width: TILE_WIDTH,
  },
  tilePressed: {
    opacity: 0.6,
  },
  tileImg: {
    height: 78, // design: 78px tile image
    borderRadius: 4,
    backgroundColor: colors.paper2,
  },
  tileSrc: {
    marginTop: 8,
    marginBottom: 4,
  },
  tileTitle: {
    fontFamily: fontFamily.uiMedium,
    fontSize: fontSize.detail, // 13 — design TS.detail
    lineHeight: 17, // ~1.3
    color: colors.ink,
  },
  moreTile: {
    width: 90,
    height: 78,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(31, 26, 20, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moreNum: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 22,
    color: colors.ink2,
    lineHeight: 22,
  },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
});
