import { Image } from 'expo-image';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/ExternalLink';
import {
  FNAllSourcesSheet,
  type FNAllSourcesSheetHandle,
} from '@/components/fn/FNAllSourcesSheet';
import { Reactions } from '@/components/Reactions';
import { useScrollToOnce } from '@/hooks/useScrollToOnce';
import { FNCap } from '@/components/fn/FNCap';
import { FNLocationTag } from '@/components/fn/FNLocationTag';
import { FNQuote } from '@/components/fn/FNQuote';
import { FNRichText } from '@/components/fn/FNRichText';
import { FNRule } from '@/components/fn/FNRule';
import { FNSrcImg } from '@/components/fn/FNSrcImg';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { FRAUNCES_LEADING, fontFamily, fontSize, typography } from '@/constants/Typography';
import type {
  ExportArticle,
  StoryDetail as StoryDetailType,
  StoryEntityRef,
} from '@/types/contract';
import { entityInitials, faviconUrl, friendlySourceName } from '@/utils/sources';
import { formatRecency, formatShortDate } from '@/utils/time';

type Props = { story: StoryDetailType; focusComments?: boolean };

const TOP_SOURCES_LIMIT = 3;

// Tints from design/ThinkPattern (thinkpattern.jsx StoryDetail actor section).
const PERSON_TINT = '#7d4a18'; // burnt sienna
const ORG_TINT = '#1f5a4e'; // teal

export function StoryDetail({ story, focusComments }: Props) {
  const scrollToComments = useScrollToOnce(focusComments);
  // Imperative handle to the sources sheet. Idiomatic gorhom usage:
  // tap the "+N more" Pressable → call sheet.open() directly. No React
  // state to mirror the sheet's open/closed status — the sheet owns it.
  // This avoids gorhom issue #2669 by construction (no programmatic
  // dismiss() before the first present()).
  const sheetRef = useRef<FNAllSourcesSheetHandle>(null);
  const topArticles = story.articles.slice(0, TOP_SOURCES_LIMIT);
  const moreCount = Math.max(0, story.articles.length - topArticles.length);

  // The single physical center of the story (LLM-picked). Predicate, not
  // locations[0] — the list is primary-first, but when nothing is primary
  // (diffuse stories, or pre-re-enrichment all-false rows) there is no center
  // to mark, and the tag renders nothing rather than mislabeling the first
  // entry.
  const primaryLocation = story.locations?.find((l) => l.is_primary);

  return (
    <ScrollView ref={scrollToComments.ref} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headSection}>
        {/* Meta kicker is a date (start), not relative recency, per design SSOT. */}
        <View style={styles.metaRow}>
          <FNCap>
            {formatShortDate(story.time_start)} · <Text style={typography.num}>{story.articles.length}</Text> sources
          </FNCap>
          <FNLocationTag place={primaryLocation?.country} />
        </View>
        <Text style={styles.title}>{story.title}</Text>
        {/* "Last updated · {end_date}" — the end_date carries the ochre "now"
            accent. Only shown when the story spans a window (time_end differs
            from time_start); a point-in-time story has nothing to update. */}
        {story.time_end !== story.time_start ? (
          <FNCap style={styles.lastUpdated}>
            Last updated · <Text style={{ color: colors.accent }}>{formatShortDate(story.time_end)}</Text>
          </FNCap>
        ) : null}

        <FNRichText text={story.full_summary} style={styles.body} />
      </View>

      {/* Actors */}
      <FNRule style={styles.sectionRule} />
      <View style={styles.sectionHeader}>
        <FNCap>
          Who's involved · <Text style={typography.num}>{story.entities.length}</Text>
        </FNCap>
        <Text style={styles.sectionHeading}>Actors on this story</Text>
      </View>
      {story.entities.map((e, i) => (
        <ActorRow
          key={`${e.name}-${i}`}
          entity={e}
          isLast={i === story.entities.length - 1}
        />
      ))}

      {/* Sources */}
      <FNRule style={styles.sectionRule} />
      <View style={styles.sectionHeader}>
        <FNCap>
          <Text style={typography.num}>{story.articles.length}</Text> sources
        </FNCap>
        <Text style={styles.sectionHeading}>Sources</Text>
      </View>
      {topArticles.map((a, i) => (
        <SourceRow
          key={a.id}
          article={a}
          isLast={i === topArticles.length - 1 && moreCount === 0}
        />
      ))}
      {moreCount > 0 && (
        <Pressable
          onPress={() => sheetRef.current?.open()}
          accessibilityRole="button"
          accessibilityLabel={`View all ${story.articles.length} sources`}
        >
          <Text style={styles.moreLink}>+ {moreCount} more sources →</Text>
        </Pressable>
      )}
      <View onLayout={(e) => scrollToComments(e.nativeEvent.layout.y)}>
        <Reactions type="story" id={story.id} />
      </View>
      <FNAllSourcesSheet
        ref={sheetRef}
        storyTitle={story.title}
        totalCount={story.articles.length}
        articles={story.articles}
      />
    </ScrollView>
  );
}

function ActorRow({ entity, isLast }: { entity: StoryEntityRef; isLast: boolean }) {
  const isPerson = entity.entity_type === 'person';
  const tint = isPerson ? PERSON_TINT : ORG_TINT;
  const initials = entityInitials(entity.name);
  const quotes = entity.quotes ?? [];
  return (
    <View style={[styles.actorRow, !isLast && styles.actorDivider]}>
      <View
        style={[
          styles.actorAvatar,
          { borderColor: `${tint}47`, backgroundColor: `${tint}14` },
        ]}
      >
        <Text style={[styles.actorInitials, { color: tint }]}>{initials}</Text>
      </View>
      <View style={styles.actorMeta}>
        <View style={styles.actorNameRow}>
          <Text style={styles.actorName}>{entity.name}</Text>
          <FNCap color={tint}>{entity.entity_type}</FNCap>
        </View>
        <Text style={styles.actorRole}>{entity.role}</Text>
        {quotes.map((q, i) => (
          <FNQuote key={i} text={q} size="detail" style={styles.actorQuote} />
        ))}
      </View>
    </View>
  );
}

function SourceRow({ article, isLast }: { article: ExportArticle; isLast: boolean }) {
  const content = (
    <View style={[styles.sourceRow, !isLast && styles.sourceDivider]}>
      {article.image_url ? (
        <FNSrcImg imageUrl={article.image_url} style={styles.sourceThumb} />
      ) : (
        <View style={styles.sourceFaviconFrame}>
          <Image
            source={faviconUrl(article.source_domain)}
            style={styles.faviconImg}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
      )}
      <View style={styles.sourceMeta}>
        <View style={styles.sourceTopRow}>
          <Text style={styles.sourceDomain}>{friendlySourceName(article.source_domain)}</Text>
          <FNCap>{formatRecency(article.published_at)}</FNCap>
        </View>
        <Text style={styles.sourceTitle} numberOfLines={3}>
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
  scroll: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  headSection: { paddingTop: spacing.lg }, // 16 (SP.s4)
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: fontFamily.displayWonky,
    fontSize: fontSize.head, // 30
    lineHeight: fontSize.head * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    marginTop: spacing.sm, // 8 (SP.s2)
    letterSpacing: -0.54,
  },
  // "Last updated · {date}" cap under the title. design: marginTop SP.s3 (12).
  lastUpdated: { marginTop: spacing.md },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.lead, // 17
    lineHeight: 24, // 1.41 ratio — detail-screen body tier
    color: colors.ink,
    marginTop: spacing.xl, // 20 (SP.s5)
  },

  // Section
  sectionRule: { marginTop: spacing.xxl }, // 24 (SP.s6)
  sectionHeader: { paddingTop: spacing.lg, paddingBottom: spacing.xs }, // 16 / 4
  sectionHeading: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.lead, // 17 (SP design: TS.lead)
    lineHeight: 22,
    color: colors.ink,
    marginTop: spacing.xs, // 4 (SP.s1)
  },

  // Actor row. design: padding sp(SP.s3,0), gap SP.s3, alignItems flex-start.
  actorRow: {
    paddingVertical: spacing.md, // 12 (SP.s3)
    flexDirection: 'row',
    gap: spacing.md, // 12 (SP.s3)
    alignItems: 'flex-start',
  },
  actorDivider: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  actorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorInitials: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.base, // 15 (SP design: TS.base)
  },
  actorMeta: { flex: 1, minWidth: 0 },
  actorNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  actorName: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.lead, // 17 (SP design: TS.lead)
    lineHeight: fontSize.lead * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
  },
  actorRole: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // 13 (SP design: TS.detail)
    lineHeight: 19, // 1.45 ratio
    color: colors.ink2,
    marginTop: spacing.sm, // 8 (SP.s2)
  },
  // Quote sits flush under the role line (no rule). Per-quote spacing is the
  // FNQuote component's default; we own the gap from role → first quote here.
  // design: marginTop SP.s1 (4). NOTE: design renders this inline actor quote at
  // TS.detail (13) italic; FNQuote's `sm` is fixed at 15 — see report (chrome gap).
  actorQuote: { marginTop: spacing.xs }, // 4 (SP.s1)

  // Source row
  sourceRow: { paddingVertical: 12, flexDirection: 'row', gap: 12 },
  sourceDivider: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  sourceThumb: { width: 76, height: 76 },
  // No-image fallback: 76×76 paper-bg framed box with the source's favicon
  // centered. Editorial stamp treatment, not a substitute for the article image.
  sourceFaviconFrame: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: colors.faint,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faviconImg: {
    width: 36,
    height: 36,
  },
  sourceMeta: { flex: 1, minWidth: 0 },
  sourceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm, // 8 (SP.s2)
  },
  sourceDomain: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.fine, // 12 (SP design: TS.fine)
    color: colors.ink,
    letterSpacing: 0,
  },
  sourceTitle: {
    fontFamily: fontFamily.displayPlain, // Fraunces 600 — editorial source headline
    fontSize: fontSize.base, // 15 (SP design: TS.base)
    lineHeight: fontSize.base * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    marginTop: 2, // SP.hair — optical sub-grid step; not on the Spacing shim
  },
  moreLink: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.fine, // 12 (SP design: TS.fine)
    color: colors.link,
    paddingVertical: spacing.md, // 12 (SP.s3)
    paddingBottom: spacing.xxl, // 24 (SP.s6)
    marginTop: spacing.sm, // 8 (SP.s2)
  },
});
