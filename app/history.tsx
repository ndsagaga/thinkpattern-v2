import { useMemo } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FNCap } from '@/components/fn/FNCap';
import { FNEmptyState } from '@/components/fn/FNEmptyState';
import { FNScreen } from '@/components/fn/FNScreen';
import { FNSubNav } from '@/components/fn/FNSubNav';
import { FNTextAction } from '@/components/fn/FNTextAction';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize, typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { SURFACE_LABEL } from '@/lib/content';
import { emit } from '@/lib/events';
import { clearHistory, useHistory, type HistoryEntry } from '@/lib/history';
import { formatClock, formatDayLabel } from '@/utils/time';

type DayGroup = { day: string; items: HistoryEntry[] };

export default function HistoryScreen() {
  const rows = useHistory();

  // Rows are newest-first, so a single pass buckets them into contiguous days.
  const groups = useMemo(() => {
    const out: DayGroup[] = [];
    for (const row of rows) {
      const day = formatDayLabel(row.at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(row);
      else out.push({ day, items: [row] });
    }
    return out;
  }, [rows]);

  return (
    <FNScreen>
      <FNSubNav
        title="History"
        action={
          rows.length ? (
            <FNTextAction
              label="Clear"
              onPress={() => {
                emit('content_cleared', { surface: 'history' });
                clearHistory();
              }}
            />
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <FNEmptyState
            title="No history."
            body="Stories, perspectives, and actors you open appear here."
          />
        ) : (
          groups.map((group) => (
            <View key={group.day}>
              <FNCap style={styles.dayLabel}>{group.day}</FNCap>
              {group.items.map((item, i) => (
                <HistoryRow key={`${item.id}-${item.at}`} item={item} last={i === group.items.length - 1} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </FNScreen>
  );
}

function HistoryRow({ item, last }: { item: HistoryEntry; last: boolean }) {
  return (
    <Link href={`/${item.surface}/${item.id}` as Href} asChild>
      {/* Row layout lives on the inner View: <Link asChild> clones the Pressable
          and overrides its style, which would otherwise flatten the two columns
          into a vertical stack. */}
      <Pressable accessibilityRole="link">
        <View style={[styles.row, last && styles.rowLast]}>
          <Text style={styles.time}>{formatClock(item.at)}</Text>
          <View style={styles.rowMain}>
            <FNCap>{SURFACE_LABEL[item.surface]}</FNCap>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  dayLabel: { marginTop: spacing.xl, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    // top-align: the time sits on the TYPE cap line. (baseline is unreliable
    // here — RN can't derive one from the column View holding cap + title.)
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.faint,
  },
  rowLast: { borderBottomWidth: 0 },
  time: { ...typography.num, fontSize: fontSize.fine, color: colors.muted, width: 56, flexShrink: 0 },
  rowMain: { flex: 1 },
  title: {
    fontFamily: fontFamily.bodySemiBold, // design: sans 600
    fontSize: fontSize.detail, // 13 (TS.detail)
    lineHeight: 16, // ~1.25
    color: colors.ink,
    marginTop: spacing.hair, // 2
  },
});
