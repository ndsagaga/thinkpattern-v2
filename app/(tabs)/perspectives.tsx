import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';

import { FNScreen } from '@/components/fn/FNScreen';
import { FNHeader } from '@/components/fn/FNHeader';
import { FNSearch } from '@/components/fn/FNSearch';
import { FNPills } from '@/components/fn/FNPills';
import { FNErrorPlaceholder } from '@/components/fn/FNErrorPlaceholder';
import { FNSkeletonList } from '@/components/fn/FNSkeletonList';
import { FNEmptyToday } from '@/components/fn/FNEmptyToday';
import { FNColophon } from '@/components/fn/FNColophon';
import { FNRefreshToast } from '@/components/fn/FNRefreshToast';
import { PerspectiveListItem } from '@/components/PerspectiveListItem';
import { perspectiveFields } from '@/lib/search';
import { useLocalSearch } from '@/hooks/useLensSearch';
import { useManifestQuery } from '@/data/queries';
import { diagnosticFromError } from '@/utils/errors';
import { useCardImpressions } from '@/hooks/useCardImpressions';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { usePullToast } from '@/hooks/usePullToast';
import { usePerspectivesUI } from '@/hooks/usePerspectivesUI';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { emit } from '@/lib/events';
import { ONB_ANCHORS } from '@/components/fn/onboardingAnchors';
import { SpotlightAnchor } from '@/components/fn/spotlight';

const ALL = '__ALL__';

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const CardSeparator = () => <View style={styles.separator} />;

// The Perspectives feed: a recency-ordered reading room (published_at DESC,
// straight from the index — no client sort). Topic pills filter; tapping a
// card opens the columnist read. Mirrors the Stories/Actors list scaffold.
export default function PerspectivesScreen() {
  const ui = usePerspectivesUI();
  const stale = useStaleManifest();
  const manifest = useManifestQuery();
  const [activeFilter, setActiveFilter] = useState<string>(ALL);
  const [searching, setSearching] = useState(false);
  const search = useLocalSearch(ui.kind === 'data' ? ui.items : undefined, perspectiveFields);

  // Re-tapping the active tab scrolls this list back to the top.
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const pullFn = usePullRefresh('perspectives');
  const { onPull: onUserRefresh, toastProps, refreshing } = usePullToast(pullFn);


  const filteredItems = useMemo(() => {
    if (ui.kind !== 'data') return [];
    if (activeFilter === ALL) return ui.items;
    return ui.items.filter((p) => p.topic === activeFilter);
  }, [ui, activeFilter]);
  const impressions = useCardImpressions<(typeof filteredItems)[number]>(
    'perspective',
    (p) => p.id,
  );

  const isFiltered = activeFilter !== ALL;
  const filterEmpty = ui.kind === 'data' && filteredItems.length === 0;

  if (searching && ui.kind === 'data') {
    return (
      <FNScreen>
        <FNSearch
          lens="perspectives"
          search={search}
          keyExtractor={(p) => p.id}
          getHref={(p) => ({ pathname: '/perspective/[id]', params: { id: p.id, from: 'search' } })}
          renderRow={(p) => <PerspectiveListItem perspective={p} variant="condensed" />}
          placeholder="Search perspectives…"
          noun={['perspective', 'perspectives']}
          onClose={() => setSearching(false)}
        />
      </FNScreen>
    );
  }

  return (
    <FNScreen>
      <FNHeader
        lens="Perspectives"
        onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined}
      />

      {ui.kind === 'loading' && <FNSkeletonList />}

      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="perspectives"
          diagnostic={diagnosticFromError(ui.error, { surface: 'perspectives-index' })}
          onRetry={onUserRefresh}
        />
      )}

      {ui.kind === 'empty' && (
        <ScrollView
          contentContainerStyle={styles.emptyShell}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onUserRefresh}
              tintColor={colors.ink}
              colors={[colors.ink]}
            />
          }
        >
          <FNEmptyToday lens="perspectives" />
        </ScrollView>
      )}

      {ui.kind === 'data' && (
        <>
          {ui.categories.length > 0 && (
            <FNPills
              items={[
                { key: ALL, label: 'All' },
                ...ui.categories.map((c) => ({ key: c.key, label: c.label })),
              ]}
              active={activeFilter}
              onSelect={(key) => {
                setActiveFilter(key);
                emit('filter_selected', {
                  screen: 'perspectives',
                  filter: key === ALL ? 'all' : key,
                });
              }}
            />
          )}
          <FlatList
            ref={listRef}
            showsVerticalScrollIndicator={false}
            data={filteredItems}
            keyExtractor={(p) => p.id}
            onViewableItemsChanged={impressions.onViewableItemsChanged}
            viewabilityConfig={impressions.viewabilityConfig}
            renderItem={({ item, index }) => {
              const row = (
                <Link href={`/perspective/${item.id}`} asChild>
                  <Pressable accessibilityRole="link">
                    <PerspectiveListItem perspective={item} />
                  </Pressable>
                </Link>
              );
              return index === 0 ? (
                <SpotlightAnchor id={ONB_ANCHORS.perspectiveRow}>{row}</SpotlightAnchor>
              ) : (
                row
              );
            }}
            ItemSeparatorComponent={CardSeparator}
            // Stale brief dims the cached list to 0.78 (design StaleBrief); the
            // FNStaleBrief banner + masthead "STALE · Nh" carry the explanation.
            contentContainerStyle={[
              filterEmpty ? styles.emptyContent : styles.listContent,
              stale.stale && styles.staleList,
            ]}
            ListEmptyComponent={
              filterEmpty && isFiltered ? (
                <FNEmptyToday
                  kicker="Filter result"
                  title={`No ${capitalize(activeFilter)} perspectives today.`}
                  body={undefined}
                />
              ) : null
            }
            ListFooterComponent={
              !filterEmpty && manifest.data ? (
                <FNColophon generatedAt={manifest.data.generated_at} />
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onUserRefresh}
                tintColor={colors.ink}
                colors={[colors.ink]}
              />
            }
          />
        </>
      )}

      {toastProps ? <FNRefreshToast {...toastProps} /> : null}
    </FNScreen>
  );
}

const CARD_DIVIDER = 'rgba(31, 26, 20, 0.14)';

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  emptyContent: { flexGrow: 1 },
  emptyShell: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: CARD_DIVIDER },
  // Cached-but-stale dim — design StaleBrief scroll opacity.
  staleList: { opacity: 0.78 },
});
