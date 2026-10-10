import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reactions } from '@/components/Reactions';
import { useScrollToOnce } from '@/hooks/useScrollToOnce';
import { FNCap } from '@/components/fn/FNCap';
import { FNRule } from '@/components/fn/FNRule';
import { colors } from '@/constants/Colors';
import { FRAUNCES_LEADING, fontFamily, fontSize, typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { parseInlineMarkdown } from '@/lib/markdown';
import type { PerspectiveDetail as PerspectiveDetailType } from '@/types/contract';
import { formatShortDate } from '@/utils/time';
import { PerspectiveBody } from './perspective/PerspectiveBody';
import { PerspectiveListen } from './perspective/PerspectiveListen';

type Props = { perspective: PerspectiveDetailType; focusComments?: boolean };

// The columnist read: dated/topic kicker, title, thesis dek (the standfirst),
// then the parsed body (prose + footnotes + set-off components) closing on the
// auto source rail. `shape` is internal and never shown.
// Source: design/ThinkPattern PerspectiveDetail.
export function PerspectiveDetail({ perspective, focusComments }: Props) {
  const scrollToComments = useScrollToOnce(focusComments);
  const sourceCount = perspective.citations?.length ?? 0;
  return (
    <ScrollView ref={scrollToComments.ref} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        {/* Dateline (local date + time) with its source count on the left;
            topic on the right — mirrors StoryDetail's meta row. */}
        <View style={styles.metaRow}>
          <FNCap>
            {formatShortDate(perspective.published_at)} ·{' '}
            <Text style={typography.num}>{sourceCount}</Text> sources
          </FNCap>
          {perspective.topic ? <FNCap>{perspective.topic}</FNCap> : null}
        </View>
        <Text style={styles.title}>{perspective.title}</Text>
        <Text style={styles.dek}>
          {parseInlineMarkdown(perspective.thesis, { boldFamily: fontFamily.displayBold })}
        </Text>
      </View>
      {perspective.audio_url ? (
        <View style={styles.listen}>
          <PerspectiveListen perspective={perspective} />
        </View>
      ) : null}
      <FNRule style={styles.rule} />
      <PerspectiveBody perspective={perspective} />
      <View onLayout={(e) => scrollToComments(e.nativeEvent.layout.y)}>
        <Reactions type="perspective" id={perspective.id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  head: { paddingTop: 16 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.displayWonky, // 30pt ≥ 28 → wonky cut
    fontSize: fontSize.head, // 30 (TS.head)
    lineHeight: fontSize.head * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.54, // -0.018em at 30px
    color: colors.ink,
    marginTop: 8,
  },
  // Thesis dek — Fraunces roman standfirst (RN ships 600 as the small roman cut).
  dek: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.sub, // 20 (TS.sub)
    lineHeight: 28, // ~1.42
    color: colors.ink2,
    marginTop: 16,
  },
  listen: { marginTop: 20 },
  rule: { marginTop: 20, marginBottom: 24 },
});
