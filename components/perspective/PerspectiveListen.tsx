import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FNCap } from '@/components/fn/FNCap';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize, typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { radius } from '@/constants/theme';
import { usePerspectiveAudio } from '@/hooks/usePerspectiveAudio';
import type { PerspectiveDetail } from '@/types/contract';

import { AudioBar } from './AudioBar';
import { AudioPlayGlyph } from './AudioGlyphs';

// The detail-screen narration affordance (design/ThinkPattern PerspectiveListen):
// a collapsed paper2 "Listen · N min" chip that expands in place into the full
// AudioBar. It stays expanded whenever this perspective is the loaded track, so
// returning to a piece that's mid-play shows the bar, not the chip.
export function PerspectiveListen({ perspective }: { perspective: PerspectiveDetail }) {
  const audio = usePerspectiveAudio(perspective);
  const [opened, setOpened] = useState(false);

  if (!perspective.audio_url) return null;

  if (!audio.active && !opened) {
    const mins = Math.max(1, Math.round((perspective.audio_duration_sec ?? 0) / 60));
    return (
      <Pressable
        onPress={() => {
          setOpened(true);
          audio.toggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Listen, ${mins} minutes`}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      >
        <View style={styles.chipDisc}>
          <AudioPlayGlyph color={colors.ink} size={13} />
        </View>
        <View style={styles.chipLabel}>
          <Text style={styles.listen}>Listen</Text>
          <Text style={styles.dot}>·</Text>
          <FNCap>
            <Text style={typography.num}>{mins}</Text> min
          </FNCap>
        </View>
      </Pressable>
    );
  }

  return (
    <AudioBar
      state={audio.state}
      active={audio.active}
      progress={audio.progress}
      buffered={audio.buffered}
      duration={audio.duration}
      speed={audio.speed}
      onToggle={audio.toggle}
      onSeek={audio.seek}
      onCycleSpeed={audio.cycleSpeed}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.paper2,
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.85 },
  chipDisc: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  chipLabel: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  listen: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.detail, color: colors.ink },
  dot: { color: colors.faint },
});
