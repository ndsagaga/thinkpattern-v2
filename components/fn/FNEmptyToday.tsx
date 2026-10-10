import { View, Text, StyleSheet } from 'react-native';

import { colors } from '@/constants/Colors';
import { typography, fontFamily, fontSize, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { FNRetryButton } from './FNRetryButton';

type Lens = 'stories' | 'perspectives' | 'actors';

type Props = {
  // Which lens is empty — drives the tailored copy (kicker + headline +
  // lede) per design `EMPTY_COPY`. Defaults to Stories.
  lens?: Lens;
  // Per-field overrides. Default to the resolved per-lens copy; pass to
  // narrow the context (e.g. a per-filter empty: "Filter result").
  kicker?: string;
  // Headline override.
  title?: string;
  // Lede override.
  body?: string;
  // Optional recovery action under the lede (e.g. "Edit pill").
  action?: { label: string; onPress: () => void };
};

// Per-lens empty copy — design/ThinkPattern `EMPTY_COPY` (EmptyLens). Each
// lens gets its own kicker / headline / lede; the chrome is identical.
const EMPTY_COPY: Record<Lens, { kicker: string; title: string; body: string }> = {
  stories: {
    kicker: 'A finding, not an absence',
    title: 'Nothing crossed the threshold today.',
    body: 'A quiet day. Take it as the news.',
  },
  perspectives: {
    kicker: 'Between editions',
    title: 'No new column today.',
    body: 'The columnist files when a pattern earns the read — not on a schedule. Yesterday’s pieces are still in your library.',
  },
  actors: {
    kicker: 'Positions held',
    title: 'No tracked actor shifted today.',
    body: 'Every stance is where it was. When one materially changes, it surfaces here first.',
  },
};

// Editorial empty state per design/ThinkPattern EmptyLens. Used when a list is
// genuinely empty — no stories in today's brief, no new column, no actor shifts.
// The `lens` prop selects the tailored copy; per-field overrides allow narrower
// contexts (per-filter empties) while keeping the visual treatment consistent.
export function FNEmptyToday({ lens = 'stories', kicker, title, body, action }: Props) {
  const copy = EMPTY_COPY[lens] ?? EMPTY_COPY.stories;
  const resolvedKicker = kicker ?? copy.kicker;
  const resolvedTitle = title ?? copy.title;
  const resolvedBody = body ?? copy.body;
  return (
    <View style={styles.wrap}>
      <Text style={[typography.cap, styles.kicker]}>{resolvedKicker}</Text>
      <Text style={styles.title}>{resolvedTitle}</Text>
      {resolvedBody ? <Text style={styles.body}>{resolvedBody}</Text> : null}
      {action ? (
        <FNRetryButton
          variant="secondary"
          label={action.label}
          onPress={action.onPress}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xxxl, // SP.s7 (28)
    paddingTop: spacing.xxxl, // SP.s8 (32)
    paddingBottom: spacing.xxxl,
  },
  kicker: {
    color: colors.accent,
  },
  // TS.title (24) wonky Fraunces — design EmptyLens head.
  title: {
    fontFamily: fontFamily.displayWonky,
    fontSize: fontSize.title,
    lineHeight: fontSize.title * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: fontSize.title * -0.018,
    color: colors.ink,
    marginTop: spacing.md, // SP.s3 (12)
  },
  // Inter Tight 400 at TS.base / 1.55 — lede voice.
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.55,
    color: colors.ink2,
    marginTop: spacing.lg, // SP.s4 (16)
  },
  // Auto-width outline button under the lede (design PillNoMatches).
  action: { alignSelf: 'flex-start', marginTop: spacing.xl, paddingHorizontal: spacing.lg }, // SP.s5 / s4
});
