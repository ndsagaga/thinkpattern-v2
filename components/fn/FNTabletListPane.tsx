import { type ReactNode, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { useManifestQuery } from '@/data/queries';
import { StoryListItem, StorySearchRow } from '@/components/StoryListItem';
import { ActorListItem } from '@/components/ActorListItem';
import { StoryFilterEmpty, StoryFilterRail, type StoryFilterRailHandle } from '@/components/StoryFilterRail';
import { PerspectiveListItem } from '@/components/PerspectiveListItem';
import { actorFields, perspectiveFields } from '@/lib/search';
import { useLocalSearch, useStorySearch } from '@/hooks/useLensSearch';
import type { Lens } from '@/lib/tabletSelection';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { usePullToast } from '@/hooks/usePullToast';
import { useStoriesUI } from '@/hooks/useStoriesUI';
import { useActorsUI } from '@/hooks/useActorsUI';
import { usePerspectivesUI } from '@/hooks/usePerspectivesUI';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import { useStoryFilter } from '@/hooks/useStoryFilter';
import { diagnosticFromError } from '@/utils/errors';
import { FNColophon } from './FNColophon';
import { FNEmptyToday } from './FNEmptyToday';
import { FNErrorPlaceholder } from './FNErrorPlaceholder';
import { FNPills } from './FNPills';
import { FNRuleSoft } from './FNRule';
import { FNSearch } from './FNSearch';
import { FNSearchGlyph } from './FNSearchGlyph';
import { FNSkeletonList } from './FNSkeletonList';

// The list column of the split view. Reuses each lens's UI hook, list item, and
// edge states — the phone's list, re-seated in a 392pt pane. Differences from
// the phone tab screen: a slim masthead (the rail owns the wordmark + gear), a
// selected-row highlight, and taps that SELECT into the detail pane (onOpen)
// rather than push a route. Search runs in place with the same onOpen.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → StoriesList/ActorsList/
// PerspectivesList in `embedded` mode.

const ALL = '__ALL__';
const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type Props = {
  lens: Lens;
  selectedId: string | null;
  onOpen: (id: string) => void;
};

export function FNTabletListPane({ lens, selectedId, onOpen }: Props) {
  switch (lens) {
    case 'stories':
      return <StoriesPane selectedId={selectedId} onOpen={onOpen} />;
    case 'perspectives':
      return <PerspectivesPane selectedId={selectedId} onOpen={onOpen} />;
    case 'actors':
      return <ActorsPane selectedId={selectedId} onOpen={onOpen} />;
  }
}

// --- Shared chrome ---------------------------------------------------------

function PaneMasthead({ title, onSearch }: { title: string; onSearch?: () => void }) {
  return (
    <>
      <View style={styles.masthead}>
        <Text style={styles.lens} accessibilityRole="header">
          {title}
        </Text>
        {onSearch ? (
          <Pressable
            onPress={onSearch}
            accessibilityRole="button"
            accessibilityLabel={`Search ${title}`}
            hitSlop={12}
          >
            <FNSearchGlyph size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <FNRuleSoft style={styles.rule} />
    </>
  );
}

function SelectableRow({
  selected,
  onPress,
  label,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.rowWrap, selected && styles.rowSelected]}
    >
      {children}
      {/* Accent spine renders LAST so it sits above the card's sources-block
          background (RN paints later siblings on top); zIndex guards the order
          on Android too. */}
      {selected ? <View style={styles.rowAccent} /> : null}
    </Pressable>
  );
}

const Separator = () => <View style={styles.separator} />;

// --- Stories ---------------------------------------------------------------

function StoriesPane({ selectedId, onOpen }: { selectedId: string | null; onOpen: (id: string) => void }) {
  const ui = useStoriesUI();
  const manifest = useManifestQuery();
  const stale = useStaleManifest();
  const filter = useStoryFilter(ui);
  const railRef = useRef<StoryFilterRailHandle>(null);
  const [searching, setSearching] = useState(false);
  const search = useStorySearch();
  const { onPull, refreshing } = usePullToast(usePullRefresh('stories'));

  if (searching && ui.kind === 'data') {
    return (
      <View style={styles.pane}>
        <FNSearch
          lens="stories"
          search={search}
          keyExtractor={(s) => s.id}
          getHref={(s) => ({ pathname: '/story/[id]', params: { id: s.id } })}
          onOpen={(s) => {
            onOpen(s.id);
            setSearching(false);
          }}
          renderRow={(s) => <StorySearchRow entry={s} />}
          placeholder="Search stories…"
          noun={['story', 'stories']}
          onClose={() => setSearching(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      <PaneMasthead title="Stories" onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined} />
      {ui.kind === 'loading' && <FNSkeletonList />}
      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="stories"
          diagnostic={diagnosticFromError(ui.error, { surface: 'stories-index' })}
          onRetry={onPull}
        />
      )}
      {ui.kind === 'empty' && <EmptyScroll refreshing={refreshing} onRefresh={onPull} lens="stories" />}
      {ui.kind === 'data' && (
        <>
          <View style={styles.pills}>
            <StoryFilterRail ref={railRef} filter={filter} stories={ui.items} />
          </View>
          <FlatList
            showsVerticalScrollIndicator={false}
            data={filter.items}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <SelectableRow
                selected={item.id === selectedId}
                onPress={() => onOpen(item.id)}
                label={item.title}
              >
                <StoryListItem story={item} />
              </SelectableRow>
            )}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={[styles.listContent, stale.stale && styles.staleList]}
            ListEmptyComponent={
              <StoryFilterEmpty filter={filter} onEditPill={(pill) => railRef.current?.editPill(pill)} />
            }
            ListFooterComponent={manifest.data ? <FNColophon generatedAt={manifest.data.generated_at} /> : null}
            refreshControl={<PaneRefresh refreshing={refreshing} onRefresh={onPull} />}
          />
        </>
      )}
    </View>
  );
}

// --- Perspectives ----------------------------------------------------------

function PerspectivesPane({ selectedId, onOpen }: { selectedId: string | null; onOpen: (id: string) => void }) {
  const ui = usePerspectivesUI();
  const manifest = useManifestQuery();
  const stale = useStaleManifest();
  const [activeFilter, setActiveFilter] = useState<string>(ALL);
  const [searching, setSearching] = useState(false);
  const search = useLocalSearch(ui.kind === 'data' ? ui.items : undefined, perspectiveFields);
  const { onPull, refreshing } = usePullToast(usePullRefresh('perspectives'));

  const filtered = useMemo(() => {
    if (ui.kind !== 'data') return [];
    return activeFilter === ALL ? ui.items : ui.items.filter((p) => p.topic === activeFilter);
  }, [ui, activeFilter]);

  if (searching && ui.kind === 'data') {
    return (
      <View style={styles.pane}>
        <FNSearch
          lens="perspectives"
          search={search}
          keyExtractor={(p) => p.id}
          getHref={(p) => `/perspective/${p.id}`}
          onOpen={(p) => {
            onOpen(p.id);
            setSearching(false);
          }}
          renderRow={(p) => <PerspectiveListItem perspective={p} variant="condensed" />}
          placeholder="Search perspectives…"
          noun={['perspective', 'perspectives']}
          onClose={() => setSearching(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      <PaneMasthead title="Perspectives" onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined} />
      {ui.kind === 'loading' && <FNSkeletonList />}
      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="perspectives"
          diagnostic={diagnosticFromError(ui.error, { surface: 'perspectives-index' })}
          onRetry={onPull}
        />
      )}
      {ui.kind === 'empty' && <EmptyScroll refreshing={refreshing} onRefresh={onPull} lens="perspectives" />}
      {ui.kind === 'data' && (
        <>
          {ui.categories.length > 0 && (
            <View style={styles.pills}>
              <FNPills
                items={[{ key: ALL, label: 'All' }, ...ui.categories.map((c) => ({ key: c.key, label: c.label }))]}
                active={activeFilter}
                onSelect={setActiveFilter}
              />
            </View>
          )}
          <FlatList
            showsVerticalScrollIndicator={false}
            data={filtered}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <SelectableRow selected={item.id === selectedId} onPress={() => onOpen(item.id)} label={item.title}>
                <PerspectiveListItem perspective={item} />
              </SelectableRow>
            )}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={[styles.listContent, stale.stale && styles.staleList]}
            ListEmptyComponent={
              activeFilter !== ALL ? (
                <FNEmptyToday kicker="Filter result" title={`No ${capitalize(activeFilter)} perspectives today.`} body={undefined} />
              ) : null
            }
            ListFooterComponent={manifest.data ? <FNColophon generatedAt={manifest.data.generated_at} /> : null}
            refreshControl={<PaneRefresh refreshing={refreshing} onRefresh={onPull} />}
          />
        </>
      )}
    </View>
  );
}

// --- Actors ----------------------------------------------------------------

function ActorsPane({ selectedId, onOpen }: { selectedId: string | null; onOpen: (id: string) => void }) {
  const ui = useActorsUI();
  const manifest = useManifestQuery();
  const stale = useStaleManifest();
  const [searching, setSearching] = useState(false);
  const search = useLocalSearch(ui.kind === 'data' ? ui.items : undefined, actorFields);
  const { onPull, refreshing } = usePullToast(usePullRefresh('actors'));

  if (searching && ui.kind === 'data') {
    return (
      <View style={styles.pane}>
        <FNSearch
          lens="actors"
          search={search}
          keyExtractor={(a) => String(a.id)}
          getHref={(a) => `/actor/${a.id}`}
          onOpen={(a) => {
            onOpen(String(a.id));
            setSearching(false);
          }}
          renderRow={(a) => <ActorListItem actor={a} variant="condensed" />}
          placeholder="Search actors…"
          noun={['actor', 'actors']}
          onClose={() => setSearching(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      <PaneMasthead title="Actors" onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined} />
      {ui.kind === 'loading' && <FNSkeletonList />}
      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="actors"
          diagnostic={diagnosticFromError(ui.error, { surface: 'actors-index' })}
          onRetry={onPull}
        />
      )}
      {ui.kind === 'empty' && <EmptyScroll refreshing={refreshing} onRefresh={onPull} lens="actors" />}
      {ui.kind === 'data' && (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={ui.items}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => (
            <SelectableRow selected={String(item.id) === selectedId} onPress={() => onOpen(String(item.id))} label={item.name}>
              <ActorListItem actor={item} />
            </SelectableRow>
          )}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={[styles.listContent, stale.stale && styles.staleList]}
          ListFooterComponent={manifest.data ? <FNColophon generatedAt={manifest.data.generated_at} /> : null}
          refreshControl={<PaneRefresh refreshing={refreshing} onRefresh={onPull} />}
        />
      )}
    </View>
  );
}

// --- Small shared bits -----------------------------------------------------

function PaneRefresh({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} colors={[colors.ink]} />;
}

function EmptyScroll({ refreshing, onRefresh, lens }: { refreshing: boolean; onRefresh: () => void; lens: 'stories' | 'perspectives' | 'actors' }) {
  return (
    <ScrollView contentContainerStyle={styles.emptyShell} refreshControl={<PaneRefresh refreshing={refreshing} onRefresh={onRefresh} />}>
      <FNEmptyToday lens={lens} />
    </ScrollView>
  );
}

const CARD_DIVIDER = 'rgba(31, 26, 20, 0.14)';

const styles = StyleSheet.create({
  pane: { flex: 1, backgroundColor: colors.paper },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  // Breathing room above the topic pills — the rule sits flush under the title,
  // so the gap to the pills lives here.
  pills: { paddingTop: spacing.md },
  lens: {
    fontFamily: fontFamily.displayWonky,
    fontSize: fontSize.head, // 30
    letterSpacing: -0.54,
    color: colors.ink,
  },
  rule: { marginHorizontal: spacing.gutter },
  listContent: { paddingBottom: spacing.xxl },
  staleList: { opacity: 0.78 },
  emptyShell: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: CARD_DIVIDER, marginHorizontal: spacing.gutter },
  rowWrap: { paddingHorizontal: spacing.gutter, position: 'relative' },
  // Selected row — soft paper tint + a 3px ochre spine on the left, the pane
  // analogue of the "you are here" cue in the rail.
  rowSelected: { backgroundColor: colors.paper2 },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent, zIndex: 1 },
});
