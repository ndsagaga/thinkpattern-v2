import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Link } from 'expo-router';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { formatShortDate } from '@/utils/time';

export type FNQuoteAttribution = {
  storyId: string;
  storyTitle: string;
  saidAt: string; // ISO 8601
};

type Props = {
  text: string;
  // `detail` — inline story/actor-row quote, 13pt italic on ink2 (design TS.detail).
  // `sm` (default) — actor / focus-area context, 15pt italic on ink2.
  // `md` — broadsheet pull-quote on perspective detail, 18pt italic on ink.
  size?: 'detail' | 'sm' | 'md';
  // When supplied, renders a cap line below the quote: `MMM D · STORY_TITLE`.
  // The story title is tappable and routes to the story detail.
  attribution?: FNQuoteAttribution;
  style?: StyleProp<ViewStyle>;
};

// Italic Fraunces quote with an ochre em-dash kicker, optionally followed by
// a cap-line attribution (date · tappable story title). Used in story
// actor rows, actor-detail focus-area rows, and the actor-detail most-recent
// pull-quote. Source: design/design_handoff_perspectives/hifi-fieldnotebook.jsx
// (FNStoryDetail entity quotes, FNActorDetail focus-area quotes, "where they
// stand" pull-quote).
export function FNQuote({ text, size = 'sm', attribution, style }: Props) {
  // Attribution is a declarative <Link>, not router.push — rendered navigation
  // stays declarative (see CLAUDE.md → Navigation).
  const quoteStyle =
    size === 'md'
      ? styles.quoteMd
      : size === 'detail'
        ? styles.quoteDetail
        : styles.quoteSm;

  return (
    <View style={style}>
      <Text style={quoteStyle}>
        <Text style={styles.dash}>— </Text>
        {`“${text}”`}
      </Text>
      {attribution ? (
        <Text
          // `detail` shares the flush-left sm cap-line — both are inline
          // context quotes; only `md` (broadsheet) indents to its border.
          style={size === 'md' ? styles.attributionMd : styles.attributionSm}
          accessible
        >
          {formatShortDate(attribution.saidAt).toUpperCase()}
          {' · '}
          <Link
            href={`/story/${attribution.storyId}`}
            style={styles.attributionLink}
            accessibilityRole="link"
            accessibilityLabel={`Open story: ${attribution.storyTitle}`}
            suppressHighlighting
          >
            {attribution.storyTitle}
          </Link>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Italic Fraunces 400 — inline story/actor-row quote, fontSize.detail (13)
  // per design (TS.detail). 13/18 ≈ 1.4, matching the body leading it sits with.
  quoteDetail: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.detail,
    lineHeight: 18,
    color: colors.ink2,
  },
  // Italic Fraunces 400 — actor/focus-area quote, 15/21 ≈ 1.4.
  // Italic display benefits from being one tier larger than the body roles
  // it accompanies; otherwise it reads as cramped.
  quoteSm: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink2,
  },
  // Broadsheet pull-quote on the perspective detail — the editorial
  // centerpiece. Bigger, full ink.
  quoteMd: {
    fontFamily: fontFamily.displayItalic,
    fontSize: 18,
    lineHeight: 25, // 1.39 ratio
    color: colors.ink,
  },
  // Ochre em-dash glyph — decorative, not text affordance, so accent is fine
  // (a11y rule reserves `colors.link` for actual tap-text).
  dash: {
    color: colors.accent,
  },
  // Cap line — uppercase, tracked. Inline-styled (vs. FNCap) so the size can
  // tighten to 9.5pt to match the design's smaller caps under the quote.
  // sm — actor / focus-area context: 9.5pt, flush left.
  attributionSm: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 1.33, // 0.14em at 9.5px
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 4,
  },
  // md — broadsheet pull-quote on perspective detail: 10.5pt, paddingLeft 14
  // to align with the quote body (parent wraps the quote in a borderLeft
  // container with paddingLeft 14; flush-left attribution looks disconnected).
  attributionMd: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.47, // 0.14em at 10.5px
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 4,
    paddingLeft: 14,
  },
  attributionLink: {
    color: colors.link,
  },
});
