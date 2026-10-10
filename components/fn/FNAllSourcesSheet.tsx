import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/ExternalLink';
import { colors } from '@/constants/Colors';
import { FRAUNCES_LEADING, fontFamily, typography } from '@/constants/Typography';
import type { ExportArticle } from '@/types/contract';
import { faviconUrl, friendlySourceName, orderArticlesByRecency } from '@/utils/sources';
import { formatRecency } from '@/utils/time';
import { FNCap } from './FNCap';
import { FNSrcImg } from './FNSrcImg';

// Imperative handle exposed to parents. Idiomatic gorhom API: parents call
// open()/close() from event handlers rather than driving the sheet via a
// boolean prop + useEffect bridge. That bridge was the trigger for gorhom
// issue #2669 (dismiss() before present() corrupts statusRef in 5.2.11+);
// the imperative API avoids the bug class entirely because we never call
// dismiss() cold — only after a real open cycle.
export type FNAllSourcesSheetHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  storyTitle: string;
  totalCount: number;
  articles: ExportArticle[];
};

// Bottom-sheet modal listing every article for a story. Uses
// @gorhom/bottom-sheet for the gesture surface — cross-platform
// (iOS + Android), velocity- and threshold-based swipe-down dismissal,
// FlatList scroll-vs-pan coordination handled by the library.
//
// Editorial visual tokens preserved: 22pt top corners, paper background,
// ink-tinted backdrop at 0.32 opacity, custom 36×4 drag handle.
//
// Provider mount + GestureHandlerRootView wiring lives in app/_layout.tsx.
export const FNAllSourcesSheet = forwardRef<FNAllSourcesSheetHandle, Props>(
  function FNAllSourcesSheet({ storyTitle, totalCount, articles }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    // Single snap point at 88% to match the previous editorial height.
    // Memoized — the lib re-runs derivation on array identity changes.
    const snapPoints = useMemo(() => ['88%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
    }));

    // This sheet promises "most recent" — and is the ONLY surface that does.
    // The top-3 on the card/story detail keep their backend-curated order, so
    // recency is scoped here rather than applied to the shared article array.
    const recentArticles = useMemo(() => orderArticlesByRecency(articles), [articles]);

    // Header as ListHeaderComponent with stickyHeaderIndices keeps the
    // "All sources / title / count" block pinned at the top, while the
    // article rows scroll below it. Canonical v5 pattern: a single
    // sheet-aware child (BottomSheetFlatList) so the lib's internal
    // scroll-vs-pan coordination has one source of truth.
    const renderListHeader = useCallback(
      () => (
        <View style={styles.header}>
          <FNCap style={styles.kicker}>All sources</FNCap>
          <Text style={styles.title} numberOfLines={3}>
            {storyTitle}
          </Text>
          <Text style={styles.stat}>
            <Text style={typography.num}>{totalCount}</Text> sources · most recent
          </Text>
        </View>
      ),
      [storyTitle, totalCount],
    );

    // Editorial ink-tinted backdrop. Tap-to-close behavior is the default
    // (pressBehavior: 'close'), restoring the iOS habit users expect — and
    // it works on Android too, unlike native pageSheet's system backdrop.
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.32}
          style={[props.style, styles.backdrop]}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handleIndicator}
        handleStyle={styles.handle}
        accessibilityLabel="All sources"
      >
        <BottomSheetFlatList
          data={recentArticles}
          keyExtractor={(a) => a.id}
          renderItem={({ item, index }) => (
            <SheetRow article={item} isFirst={index === 0} />
          )}
          ListHeaderComponent={renderListHeader}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </BottomSheetModal>
    );
  },
);

function SheetRow({ article, isFirst }: { article: ExportArticle; isFirst: boolean }) {
  const content = (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      {article.image_url ? (
        <FNSrcImg imageUrl={article.image_url} style={styles.thumb} compact />
      ) : (
        <View style={styles.faviconFrame}>
          <Image
            source={faviconUrl(article.source_domain)}
            style={styles.faviconImg}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
      )}
      <View style={styles.meta}>
        <View style={styles.topRow}>
          <FNCap>{friendlySourceName(article.source_domain)}</FNCap>
          <FNCap>{formatRecency(article.published_at)}</FNCap>
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {article.title}
        </Text>
      </View>
    </View>
  );
  return (
    <ExternalLink href={article.url} asChild>
      <Pressable accessibilityRole="link">{content}</Pressable>
    </ExternalLink>
  );
}

const styles = StyleSheet.create({
  // backgroundStyle applies to the sheet surface itself. Editorial 22pt
  // top corners + paper bg. Bottom corners stay square (sheet bottoms
  // are off-screen anyway).
  background: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  // Backdrop tint: ink at 0.32 opacity. The library applies the opacity
  // animation; the style here only carries the color.
  backdrop: {
    backgroundColor: colors.ink,
  },
  // Drag-handle area (the bar above the indicator pill). Tight enough
  // that "ALL SOURCES" sits near the top of the sheet per the design.
  // Total handle-area height = paddingTop + indicator height + paddingBottom.
  handle: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  // The visible indicator pill: 36×4, ink at 20% opacity. Matches the
  // pre-library custom handle proportions.
  handleIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(31, 26, 20, 0.20)',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 26, 20, 0.12)',
    // Opaque paper background is required for stickyHeaderIndices —
    // without it, the scrolling list items bleed through the pinned
    // header on top of the sheet.
    backgroundColor: colors.paper,
  },
  kicker: { marginBottom: 4 },
  title: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 18,
    lineHeight: 18 * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.22, // -0.012em at 18px
    color: colors.ink,
  },
  stat: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: colors.muted,
    marginTop: 6,
    letterSpacing: 0.44, // 0.04em at 11px
  },
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(31, 26, 20, 0.08)',
  },
  thumb: { width: 56, height: 56, borderRadius: 3 },
  faviconFrame: {
    width: 56,
    height: 56,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.faint,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconImg: { width: 28, height: 28 },
  meta: { flex: 1, gap: 4, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  headline: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 13.5,
    lineHeight: 18, // 1.3
    color: colors.ink,
  },
});
