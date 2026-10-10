import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { invalidateAll } from '@/data/queries';
import { emit } from '@/lib/events';
import { formatStaleAge } from '@/utils/time';

type Props = {
  // ISO 8601 of the most recent successful manifest fetch.
  lastFetchedAt: string;
};

const TICK_MS = 60_000;

// Bucket the cached-brief age for analytics — coarse so we never ship a raw
// timestamp, and enough to tell "barely stale" from "badly stale offline".
function staleAgeBucket(iso: string): string {
  const hrs = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (!Number.isFinite(hrs)) return 'unknown';
  if (hrs < 1) return 'under_1h';
  if (hrs < 6) return '1_6h';
  if (hrs < 24) return '6_24h';
  return 'over_24h';
}

// Top-of-screen banner shown when the device is offline AND we have a
// previously cached snapshot to fall back to. Per design/ThinkPattern
// StaleBrief: ink2 ground, paper foreground, mono accentSoft kicker
// "Offline · stale", sans line "Last fetched 6h 14m ago. Showing cached
// brief.", paper-bordered "Retry" button on the right.
//
// NOTE: the design also dims the cached list to opacity 0.78 and shows a
// "STALE · Nh" masthead kicker (dated) on FNHeader — those are HOST
// integrations (list screens + FNHeader), flagged in the handoff; this
// component renders the banner only.
//
// Re-renders every TICK_MS so the relative age string stays live as the
// user reads. (Network reconnect bumps the refresh epoch independently;
// that path is the actual recovery, the tick is just for display.)
export function FNStaleBrief({ lastFetchedAt }: Props) {
  const [now, setNow] = useState(() => new Date());

  // One impression per mount (mirrors FNColdOffline / FNErrorPlaceholder).
  useEffect(() => {
    emit('stale_brief_shown', { age_bucket: staleAgeBucket(lastFetchedAt) });
  }, [lastFetchedAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const ageLabel = formatStaleAge(lastFetchedAt, now);

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.copy}>
        <Text style={styles.kicker}>Offline · stale</Text>
        <Text style={styles.body}>
          Last fetched {ageLabel}. Showing cached brief.
        </Text>
      </View>
      <Pressable
        onPress={() => {
          void invalidateAll();
        }}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        <Text style={styles.retryLabel}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.ink2,
    paddingVertical: spacing.md, // SP.s3 (12)
    paddingHorizontal: spacing.gutter, // SP.s5 (20)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  // Mono accentSoft cap per design — JetBrains Mono, TS.micro, 0.14em.
  kicker: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro, // TS.micro (10)
    lineHeight: 13,
    letterSpacing: fontSize.micro * 0.14, // 0.14em
    textTransform: 'uppercase',
    color: colors.accentSoft,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // TS.detail (13)
    lineHeight: fontSize.detail * 1.38,
    color: colors.paper,
    marginTop: 2, // SP.hair
  },
  retry: {
    paddingVertical: spacing.sm, // SP.s2 (8)
    paddingHorizontal: spacing.md, // SP.s3 (12)
    borderWidth: 1,
    borderColor: colors.paper,
  },
  retryPressed: {
    opacity: 0.7,
  },
  retryLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.fine, // TS.fine (12)
    lineHeight: 16,
    color: colors.paper,
  },
});
