import { useRef, useState } from 'react';
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
import { FNErrorPlaceholder } from '@/components/fn/FNErrorPlaceholder';
import { FNSkeletonList } from '@/components/fn/FNSkeletonList';
import { FNEmptyToday } from '@/components/fn/FNEmptyToday';
import { FNColophon } from '@/components/fn/FNColophon';
import { FNRefreshToast } from '@/components/fn/FNRefreshToast';
import { useManifestQuery } from '@/data/queries';
import { diagnosticFromError } from '@/utils/errors';
import { StoryListItem, StorySearchRow } from '@/components/StoryListItem';
import { StoryFilterEmpty, StoryFilterRail, type StoryFilterRailHandle } from '@/components/StoryFilterRail';
import { useCardImpressions } from '@/hooks/useCardImpressions';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { usePullToast } from '@/hooks/usePullToast';
import { useStoriesUI } from '@/hooks/useStoriesUI';
import { useStorySearch } from '@/hooks/useLensSearch';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import { useStoryFilter } from '@/hooks/useStoryFilter';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { ONB_ANCHORS } from '@/components/fn/onboardingAnchors';
import { SpotlightAnchor, useSpotlightRef } from '@/components/fn/spotlight';

const CardSeparator = () => <View style={styles.separator} />;

export default function StoriesScreen() {
  const ui = useStoriesUI();
  // Onboarding spotlight: the first card's sources block is a coach-mark target.
  const firstSourcesRef = useSpotlightRef(ONB_ANCHORS.storySources);
  const stale = useStaleManifest();
  const manifest = useManifestQuery();
  const filter = useStoryFilter(ui);
  const railRef = useRef<StoryFilterRailHandle>(null);
  const [searching, setSearching] = useState(false);

  // Archive search runs server-side, per query (see hooks/useLensSearch).
  // Independent of the feed above, which stays the ≤14d browse index.
  const search = useStorySearch();

  // Re-tapping the active tab scrolls this list back to the top.
  // useScrollToTop hooks the tab navigator's tabPress event.
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const pullFn = usePullRefresh('stories');
  const {
    onPull: onUserRefresh,
    toastProps,
    refreshing,
  } = usePullToast(pullFn);

  const impressions = useCardImpressions<(typeof filter.items)[number]>('story', (s) => s.id);
  const filterEmpty = ui.kind === 'data' && filter.items.length === 0;

  if (searching && ui.kind === 'data') {
    return (
      <FNScreen>
        <FNSearch
          lens="stories"
          search={search}
          keyExtractor={(s) => s.id}
          // The story route hydrates any id ever published (frozen detail
          // path), archive or fresh; from=search only tags the open for the
          // search → detail funnel.
          getHref={(s) => ({
            pathname: '/story/[id]',
            params: { id: s.id, from: 'search' },
          })}
          renderRow={(s) => <StorySearchRow entry={s} />}
          placeholder="Search stories…"
          noun={['story', 'stories']}
          onClose={() => setSearching(false)}
        />
      </FNScreen>
    );
  }

  return (
    <FNScreen>
      <FNHeader
        lens="Stories"
        onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined}
      />

      {ui.kind === 'loading' && <FNSkeletonList />}

      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="stories"
          diagnostic={diagnosticFromError(ui.error, { surface: 'stories-index' })}
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
          <FNEmptyToday />
        </ScrollView>
      )}

      {ui.kind === 'data' && (
        <>
          <StoryFilterRail ref={railRef} filter={filter} stories={ui.items} />
          <FlatList
            ref={listRef}
            showsVerticalScrollIndicator={false}
            data={filter.items}
            keyExtractor={(s) => s.id}
            onViewableItemsChanged={impressions.onViewableItemsChanged}
            viewabilityConfig={impressions.viewabilityConfig}
            renderItem={({ item, index }) => {
              const row = (
                <Link href={`/story/${item.id}`} asChild>
                  <Pressable accessibilityRole="link">
                    <StoryListItem
                      story={item}
                      sourcesRef={index === 0 ? firstSourcesRef : undefined}
                    />
                  </Pressable>
                </Link>
              );
              // First row is the onboarding spotlight target for "one story".
              return index === 0 ? (
                <SpotlightAnchor id={ONB_ANCHORS.storyRow}>{row}</SpotlightAnchor>
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
              <StoryFilterEmpty filter={filter} onEditPill={(pill) => railRef.current?.editPill(pill)} />
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

// Between-row divider. design/ThinkPattern StoriesList separates story rows with
// `color-mix(in oklch, ink 14%, transparent)` — ink (#1f1a14) at 14% alpha. No
// named token carries ink-at-14%, so it's composed here (the one sanctioned
// exception); keep in lockstep with the design's row borderTop.
const CARD_DIVIDER = 'rgba(31, 26, 20, 0.14)';

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  // Centers FNEmptyToday vertically when filter returns empty.
  emptyContent: { flexGrow: 1 },
  // ScrollView contentContainerStyle for the truly-empty state. flexGrow:1
  // lets FNEmptyToday center vertically; the ScrollView itself enables
  // pull-to-refresh so users can manually re-check for a new brief
  // without backgrounding the app.
  emptyShell: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: CARD_DIVIDER },
  // Cached-but-stale dim — design StaleBrief scroll opacity.
  staleList: { opacity: 0.78 },
});
