import { useCallback, useMemo, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FNCap } from '@/components/fn/FNCap';
import { FNLocationTag } from '@/components/fn/FNLocationTag';
import { FNSavedMark } from '@/components/fn/FNSavedMark';
import { FNSourceList } from '@/components/fn/FNSourceList';
import { FNSourceRail, type FNSourceItem } from '@/components/fn/FNSourceRail';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { FRAUNCES_LEADING, fontFamily, fontSize, typography } from '@/constants/Typography';
import { CardReactions } from '@/components/CardReactions';
import { emit } from '@/lib/events';
import type { SearchStoryEntry, StoryIndexEntry } from '@/types/contract';
import { openInAppBrowser } from '@/utils/browser';
import { chooseSourceLayout, friendlySourceName } from '@/utils/sources';
import { formatRecency } from '@/utils/time';
import { hostnameOf } from '@/utils/url';

type Props = {
  story: StoryIndexEntry;
  // Optional ref to the "Top sources" block, so a coach-mark can spotlight that
  // sub-region without reproducing the card layout. Inert in normal use.
  sourcesRef?: Ref<View>;
};

// Story card. Per design/ThinkPattern (thinkpattern.jsx StoriesList): eyebrow has
// no category; title is wonky-700 TS.sub (20); summary uses Inter Tight 400 at
// TS.base (15)/1.47; "Top sources · {N}" cap leads a rail-or-list source picker
// chosen by max headline length; the count is the muted mono article_count.
// Card is visual-only here; tap-to-detail wiring lives in Phase 4.
export function StoryListItem({ story, sourcesRef }: Props) {
  const top = useMemo<FNSourceItem[]>(
    () =>
      story.preview_articles.slice(0, 3).map((a, i) => ({
        src: friendlySourceName(a.source_domain),
        title: a.title,
        imageUrl: a.image_url,
        url: a.url,
        tint: i,
      })),
    [story.preview_articles],
  );
  const layout = chooseSourceLayout(top.map((t) => t.title));

  // Tap on a source row/tile opens the article in the in-app browser.
  // The parent Link wrapping the card stays the default tap target for
  // empty space + title/summary — sources are explicit per-row exceptions.
  const onSourcePress = useCallback((item: FNSourceItem) => {
    if (!item.url) return;
    emit('external_link_opened', { domain: hostnameOf(item.url) });
    openInAppBrowser(item.url, 'story-card-source');
  }, []);

  return (
    <View style={styles.card}>
      {/* Eyebrow carries recency + the primary-location tag. The true source
          count rides the "Top sources · {N}" cap below (design SSOT), sourced
          from article_count. */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLeft}>
          <FNSavedMark id={story.id} />
          <FNCap>{formatRecency(story.time_start)}</FNCap>
        </View>
        <FNLocationTag place={story.primary_location?.country} />
      </View>
      <Text style={styles.title}>{story.title}</Text>
      <Text style={styles.summary}>{story.short_summary}</Text>
      <CardReactions type="story" id={story.id} />
      <View ref={sourcesRef} style={styles.sourcesBlock}>
        {/* "Top sources · {N}" — ink label + muted count (design SSOT). The
            count rides article_count; the live CDN (schema 6.0) omits it, so
            guard and render the label alone when it's absent. */}
        <View style={styles.topSourcesRow}>
          <FNCap color={colors.ink}>Top sources</FNCap>
          {story.article_count != null ? (
            <FNCap>· <Text style={typography.num}>{story.article_count}</Text></FNCap>
          ) : null}
        </View>
        {/* `more={0}` — design intent: card preview shows top 3 only; the +N
            more affordance lives on the story detail (which opens the all-
            sources sheet). Tapping the card itself is the doorway. */}
        {layout === 'rail' ? (
          <FNSourceRail items={top} more={0} bg={SOURCES_BG} onItemPress={onSourcePress} />
        ) : (
          <FNSourceList items={top} more={0} onItemPress={onSourcePress} />
        )}
      </View>
    </View>
  );
}

// Search-result row — renders from the lean full-archive corpus entry
// (stories/search.json), which ships no preview_articles/article_count, so
// there is no source block by construction: eyebrow (recency + location tag),
// title, summary clamped to two lines. Same type rungs as the card so results
// read as the same object. The tag shows COUNTRY for parity with the feed
// card above; name stays a match axis only (lib/search.ts). Absent country
// (diffuse story, or a corpus cached before the field shipped) hides the tag,
// exactly as on the card.
export function StorySearchRow({ entry }: { entry: SearchStoryEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.eyebrowRow}>
        <FNCap>{formatRecency(entry.time_start)}</FNCap>
        <FNLocationTag place={entry.primary_location_country} />
      </View>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={[styles.summary, styles.summaryCondensed]} numberOfLines={2}>
        {entry.short_summary}
      </Text>
    </View>
  );
}

// Tinted block bg for the "Top sources" section. Sits between paper (#efebde)
// and paper2 (#e2dccb); a subtle inset tone, not a token (yet).
const SOURCES_BG = '#e6e0d0';

const styles = StyleSheet.create({
  card: { paddingTop: spacing.xl, paddingBottom: spacing.xxl }, // 20 / 24
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // center (not baseline): the left group can hold the ribbon SVG, and RN
    // can't derive a text baseline from a View wrapping an SVG — baseline would
    // drop the recency below the location text whenever the item is saved.
    alignItems: 'center',
    marginBottom: spacing.sm, // 8 (SP.s2)
  },
  // Ochre saved-ribbon (when present) sits just left of the recency cap.
  eyebrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // 8 (SP.s2)
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.sub, // 20
    lineHeight: fontSize.sub * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    marginBottom: spacing.md, // 12
  },
  summary: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base, // 15
    lineHeight: 22, // 1.47 ratio — list-card body tier
    color: colors.ink2,
    marginBottom: spacing.lg, // 16
  },
  // Condensed (search) rows have no source block below the summary, so the
  // summary owns the bottom edge — drop its trailing margin.
  summaryCondensed: { marginBottom: 0 },
  // "Top sources · {N}" — two baseline-aligned caps (ink label + muted count).
  topSourcesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm, // 8 (SP.s2)
    marginBottom: spacing.sm, // 8 (SP.s2)
  },
  // Inset block holding "Top sources" + rail/list. Bleeds the full -gutter
  // (-SP.s5) past the card content so the rail's edge fade lands on the block
  // tint and the block reads edge-to-edge against the screen.
  sourcesBlock: {
    backgroundColor: SOURCES_BG,
    marginHorizontal: -spacing.gutter, // -20 (-SP.s5)
    paddingTop: spacing.sm, // 8 (SP.s2)
    paddingHorizontal: spacing.gutter, // 20 (SP.s5)
    paddingBottom: spacing.md, // 12 (SP.s3)
  },
});
