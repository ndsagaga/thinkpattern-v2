import { StyleSheet, Text, View } from 'react-native';

import { FNCap } from '@/components/fn/FNCap';
import { FNSavedMark } from '@/components/fn/FNSavedMark';
import { PerspAudioBadge } from '@/components/perspective/PerspAudioBadge';
import { colors } from '@/constants/Colors';
import { FRAUNCES_LEADING, fontFamily, fontSize } from '@/constants/Typography';
import { parseInlineMarkdown } from '@/lib/markdown';
import type { PerspectiveIndexEntry } from '@/types/contract';
import { formatPerspectiveDate } from '@/utils/time';

type Props = {
  perspective: PerspectiveIndexEntry;
  // 'card' (default) is the full browse row. 'condensed' is the search-result
  // row: thesis clamped to 2 lines. Same eyebrow + title.
  variant?: 'card' | 'condensed';
};

// Perspective feed card. Source: design/ThinkPattern PerspectivesList.
// Quieter than the Stories feed — a date eyebrow, a wonky title, and the thesis
// as a serif dek. No shape label and no body/component preview: the index ships
// only title/thesis/topic/date, and `shape` is internal (never reader-facing).
export function PerspectiveListItem({ perspective, variant = 'card' }: Props) {
  const condensed = variant === 'condensed';
  return (
    <View style={styles.card}>
      <View style={styles.eyebrow}>
        <FNSavedMark id={perspective.id} />
        <FNCap>{formatPerspectiveDate(perspective.published_at)}</FNCap>
        {perspective.audio_duration_sec ? (
          <PerspAudioBadge seconds={perspective.audio_duration_sec} />
        ) : null}
      </View>
      <Text style={styles.title}>{perspective.title}</Text>
      <Text style={styles.thesis} numberOfLines={condensed ? 2 : undefined}>
        {parseInlineMarkdown(perspective.thesis, { boldFamily: fontFamily.displayBold })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 20, paddingBottom: 24 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: {
    fontFamily: fontFamily.displayBold, // Fraunces 700 — editorial column headline
    fontSize: fontSize.sub, // 20 (TS.sub)
    lineHeight: fontSize.sub * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.2, // -0.01em at 20px
    color: colors.ink,
    marginBottom: 8,
  },
  // Thesis dek — Fraunces (roman) as the standfirst. RN ships only Fraunces 600
  // as a small roman cut, so the design's "medium" weight reads as displayPlain.
  thesis: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.base, // 15 (TS.base)
    lineHeight: 21, // ~1.42
    color: colors.ink2,
  },
});
