import { View, Text, StyleSheet } from 'react-native';

import { colors } from '@/constants/Colors';
import { typography, fontFamily } from '@/constants/Typography';
import { FNRule } from './FNRule';

type Props = {
  // Manifest's `generated_at` ISO 8601 timestamp.
  generatedAt: string;
};

// Colophon footer for list screens. Per design hifi-states.jsx
// FNFreshFootnote: rule + ochre cap "Colophon" + serif body line. Sits
// at the tail of the list as a quiet provenance signal — when this
// snapshot was assembled.
export function FNColophon({ generatedAt }: Props) {
  return (
    <View style={styles.wrap}>
      <FNRule />
      <Text style={[typography.cap, styles.kicker]}>Colophon</Text>
      <Text style={styles.body}>
        Today's brief, compiled at{' '}
        <Text style={styles.timestamp}>{formatColophonTime(generatedAt)}</Text>.
      </Text>
    </View>
  );
}

// "14:02" — wall-clock time of compile in the viewer's local timezone.
// 24-hour format is universally readable and matches the editorial vibe;
// no AM/PM clutter, no TZ suffix needed (the sentence anchors it as
// "today, locally").
function formatColophonTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  kicker: {
    color: colors.accent,
    marginTop: 16,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14.5,
    lineHeight: 22, // ~1.55
    color: colors.ink,
    marginTop: 10,
  },
  timestamp: {
    fontFamily: fontFamily.mono,
    fontVariant: ['tabular-nums'],
  },
});
