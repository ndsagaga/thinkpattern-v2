import { useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { radius } from '@/constants/theme';

import type { AudioUiState } from '@/hooks/usePerspectiveAudio';
import { AudioPauseGlyph, AudioPlayGlyph, AudioSpinner } from './AudioGlyphs';

// The perspective narration bar — ported from design/ThinkPattern (AudioBar and
// its parts). Presentational: all state + handlers come from usePerspectiveAudio.
//
// Accent rule (from the design): ochre appears ONLY while audibly playing — a
// track heard right now IS the "now" beat. Every other state is ink-neutral.
// "This screen's track" is carried by the paper2 inset (a surface signal), never
// by colour, so the active bar and a track playing elsewhere stay distinct
// without spending accent.

const clamp = (n: number) => Math.min(1, Math.max(0, n));

// VoiceOver swipe-up/down seeks ±5%.
const SEEK_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

function fmtClock(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

type Props = {
  state: AudioUiState;
  active: boolean;
  progress: number;
  buffered: number;
  duration: number;
  speed: number;
  onToggle: () => void;
  onSeek: (fraction: number) => void;
  onCycleSpeed: () => void;
};

// 44×44 hit target, 40 visible disc. Ochre disc ONLY while playing.
function AudioPlayButton({ state, onToggle }: { state: AudioUiState; onToggle: () => void }) {
  const playing = state === 'playing' || state === 'buffering';
  const ochre = state === 'playing';
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, state === 'error' && styles.dim]}
    >
      <View style={[styles.disc, ochre && styles.discOchre]}>
        {state === 'loading' ? (
          <AudioSpinner color={colors.ink} />
        ) : playing ? (
          <AudioPauseGlyph color={ochre ? colors.paper : colors.ink} />
        ) : (
          <AudioPlayGlyph color={colors.ink} />
        )}
      </View>
    </Pressable>
  );
}

// Three-tone track: faint (unbuffered) · rule (buffered) · ink (played). Tap or
// drag anywhere to seek; the thumb follows the finger and the seek commits on
// release (kinder to a streamed source than seeking every frame).
function AudioScrubber({
  progress,
  buffered,
  onSeek,
}: {
  progress: number;
  buffered: number;
  onSeek: (f: number) => void;
}) {
  const widthRef = useRef(0);
  const [drag, setDrag] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };
  const previewAt = (x: number) => {
    if (widthRef.current > 0) setDrag(clamp(x / widthRef.current));
  };
  const commitAt = (x: number) => {
    if (widthRef.current > 0) onSeek(clamp(x / widthRef.current));
    setDrag(null);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(previewAt)(e.x))
    .onUpdate((e) => runOnJS(previewAt)(e.x))
    .onEnd((e) => runOnJS(commitAt)(e.x))
    .onFinalize(() => runOnJS(setDrag)(null));

  const pct = drag ?? clamp(progress);
  const bpct = Math.max(pct, clamp(buffered));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.scrubHit}
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(progress) * 100) }}
        accessibilityActions={SEEK_ACTIONS}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onSeek(clamp(progress + 0.05));
          else if (e.nativeEvent.actionName === 'decrement') onSeek(clamp(progress - 0.05));
        }}
      >
        <View style={styles.track}>
          <View style={[styles.buffered, { width: `${bpct * 100}%` }]} />
          <View style={[styles.played, { width: `${pct * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${pct * 100}%` }, drag != null && styles.thumbDrag]} />
      </View>
    </GestureDetector>
  );
}

function AudioSpeedToggle({ speed, onCycle }: { speed: number; onCycle: () => void }) {
  return (
    <Pressable
      onPress={onCycle}
      accessibilityRole="button"
      accessibilityLabel={`Speed ${speed} times`}
      style={({ pressed }) => [styles.speed, pressed && styles.pressed]}
    >
      <Text style={styles.speedText}>{speed}×</Text>
    </Pressable>
  );
}

export function AudioBar({
  state,
  active,
  progress,
  buffered,
  duration,
  speed,
  onToggle,
  onSeek,
  onCycleSpeed,
}: Props) {
  return (
    <View style={[styles.bar, active && styles.barActive]}>
      <AudioPlayButton state={state} onToggle={onToggle} />
      {state === 'error' ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Audio unavailable.</Text>
          <Pressable onPress={onToggle} accessibilityRole="button">
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <AudioScrubber progress={progress} buffered={buffered} onSeek={onSeek} />
          <View style={styles.metaRow}>
            <Text style={styles.clock}>
              {state === 'loading' ? '—:—' : fmtClock(progress * duration)}
              <Text style={styles.clockTotal}> / {fmtClock(duration)}</Text>
            </Text>
            <AudioSpeedToggle speed={speed} onCycle={onCycleSpeed} />
          </View>
        </View>
      )}
    </View>
  );
}

const MONO_TABULAR = { fontFamily: fontFamily.mono, fontVariant: ['tabular-nums' as const] };

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // active = this perspective IS the global track → paper2 inset. Negative
  // margin lets the inset bleed to the reading edges without shifting siblings.
  barActive: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.md,
    backgroundColor: colors.paper2,
    borderRadius: radius.md,
  },
  btn: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  dim: { opacity: 0.4 },
  disc: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  discOchre: { backgroundColor: colors.accent, borderColor: colors.accent },
  body: { flex: 1, minWidth: 0, gap: 3 },
  scrubHit: { height: 22, justifyContent: 'center' },
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.faint,
    overflow: 'hidden',
  },
  buffered: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.rule, borderRadius: radius.pill },
  played: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.ink, borderRadius: radius.pill },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    marginLeft: -6,
    marginTop: -6,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.paper2,
  },
  thumbDrag: { transform: [{ scale: 1.4 }] },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  clock: { ...MONO_TABULAR, fontSize: fontSize.fine, color: colors.ink },
  clockTotal: { color: colors.muted },
  speed: {
    minWidth: 44,
    height: 26,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.faint,
    borderRadius: radius.sm,
  },
  speedText: { ...MONO_TABULAR, fontSize: fontSize.fine, color: colors.ink2 },
  errorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorText: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, color: colors.muted },
  retry: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.detail, color: colors.link },
});
