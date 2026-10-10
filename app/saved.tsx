import { useMemo, useState } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FNCap } from '@/components/fn/FNCap';
import { FNEmptyState } from '@/components/fn/FNEmptyState';
import { FNPills, type FNPillItem } from '@/components/fn/FNPills';
import { FNSaveButton } from '@/components/fn/FNSaveButton';
import { FNScreen } from '@/components/fn/FNScreen';
import { FNSubNav } from '@/components/fn/FNSubNav';
import { FNTextAction } from '@/components/fn/FNTextAction';
import { colors } from '@/constants/Colors';
import { FRAUNCES_LEADING, fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { SURFACE_LABEL } from '@/lib/content';
import { emit } from '@/lib/events';
import { clearSaved, useSavedItems, type SavedItem } from '@/lib/saved';
import { formatDayLabel } from '@/utils/time';

// Pill keys are 'all' or a ContentSurface, so filtering is a plain equality.
const FILTERS: FNPillItem[] = [
  { key: 'all', label: 'All' },
  { key: 'story', label: 'Stories' },
  { key: 'perspective', label: 'Perspectives' },
  { key: 'actor', label: 'Actors' },
];

export default function SavedScreen() {
  const items = useSavedItems();
  const [filter, setFilter] = useState('all');
  const shown = useMemo(
    () => (filter === 'all' ? items : items.filter((it) => it.surface === filter)),
    [items, filter],
  );

  return (
    <FNScreen>
      <FNSubNav
        title="Saved"
        action={
          items.length ? (
            <FNTextAction
              label="Clear"
              onPress={() => {
                emit('content_cleared', { surface: 'saved' });
                clearSaved();
              }}
            />
          ) : undefined
        }
      />
      {/* FNPills carries no top pad (on the feed the masthead owns that gap);
          FNSubNav doesn't, so add it here. */}
      <View style={styles.pillsWrap}>
        <FNPills
          items={FILTERS}
          active={filter}
          onSelect={(key) => {
            setFilter(key);
            emit('filter_selected', { screen: 'saved', filter: key });
          }}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {shown.length === 0 ? (
          <FNEmptyState
            title="Nothing saved yet."
            body="Tap the ribbon on any story, perspective, or actor to keep it here."
          />
        ) : (
          shown.map((item, i) => <SavedRow key={item.id} item={item} first={i === 0} />)
        )}
      </ScrollView>
    </FNScreen>
  );
}

function SavedRow({ item, first }: { item: SavedItem; first: boolean }) {
  return (
    <View style={[styles.row, first && styles.rowFirst]}>
      {/* Text is the tap target → detail; the ribbon is a separate sibling
          target → un-save, so the two don't nest. */}
      <Link href={`/${item.surface}/${item.id}` as Href} asChild>
        <Pressable style={styles.rowMain} accessibilityRole="link">
          <FNCap>
            {SURFACE_LABEL[item.surface]} · {formatDayLabel(item.at)}
          </FNCap>
          <Text style={styles.title}>{item.title}</Text>
        </Pressable>
      </Link>
      <FNSaveButton item={item} size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  pillsWrap: { paddingTop: spacing.lg }, // 16 (design: filter rail's SP.s4 top pad)
  scroll: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.faint,
  },
  rowFirst: { borderTopWidth: 0 },
  rowMain: { flex: 1, gap: spacing.sm },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.sub, // 20 (TS.sub)
    lineHeight: fontSize.sub * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
  },
});
