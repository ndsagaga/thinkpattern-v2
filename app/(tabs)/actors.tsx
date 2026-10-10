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
import { ActorListItem } from '@/components/ActorListItem';
import { actorFields } from '@/lib/search';
import { useLocalSearch } from '@/hooks/useLensSearch';
import type { ActorIndexEntry } from '@/types/contract';
import { useManifestQuery } from '@/data/queries';
import { diagnosticFromError } from '@/utils/errors';
import { useCardImpressions } from '@/hooks/useCardImpressions';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { usePullToast } from '@/hooks/usePullToast';
import { useActorsUI } from '@/hooks/useActorsUI';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { ONB_ANCHORS } from '@/components/fn/onboardingAnchors';
import { SpotlightAnchor } from '@/components/fn/spotlight';
import { markSpotlightReady } from '@/components/fn/spotlightReady';

const CardSeparator = () => <View style={styles.separator} />;

export default function ActorsScreen() {
  const ui = useActorsUI();
  const stale = useStaleManifest();
  const manifest = useManifestQuery();
  const [searching, setSearching] = useState(false);
  const search = useLocalSearch(ui.kind === 'data' ? ui.items : undefined, actorFields);

  // Re-tapping the active tab scrolls this list back to the top.
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const pullFn = usePullRefresh('actors');
  const {
    onPull: onUserRefresh,
    toastProps,
    refreshing,
  } = usePullToast(pullFn);
  const impressions = useCardImpressions<ActorIndexEntry>('actor', (a) => String(a.id));


  if (searching && ui.kind === 'data') {
    return (
      <FNScreen>
        <FNSearch
          lens="actors"
          search={search}
          keyExtractor={(a) => String(a.id)}
          getHref={(a) => ({ pathname: '/actor/[id]', params: { id: String(a.id), from: 'search' } })}
          renderRow={(a) => <ActorListItem actor={a} variant="condensed" />}
          placeholder="Search actors…"
          noun={['actor', 'actors']}
          onClose={() => setSearching(false)}
        />
      </FNScreen>
    );
  }

  return (
    <FNScreen>
      <FNHeader
        lens="Actors"
        onSearch={ui.kind === 'data' ? () => setSearching(true) : undefined}
      />

      {ui.kind === 'loading' && <FNSkeletonList />}

      {ui.kind === 'error' && (
        <FNErrorPlaceholder
          variant="list"
          lens="actors"
          diagnostic={diagnosticFromError(ui.error, { surface: 'actors-index' })}
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
          <FNEmptyToday lens="actors" />
        </ScrollView>
      )}

      {ui.kind === 'data' && (
        <FlatList
          ref={listRef}
          showsVerticalScrollIndicator={false}
          data={ui.items}
          keyExtractor={(a) => String(a.id)}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          renderItem={({ item, index }) => {
            const row = (
              <Link href={`/actor/${item.id}`} asChild>
                <Pressable accessibilityRole="link">
                  <ActorListItem
                    actor={item}
                    // First row is the onboarding spotlight target: signal once
                    // its portrait has decoded so the tour measures the settled
                    // row height, not the pre-image one.
                    onImageLoad={index === 0 ? () => markSpotlightReady(ONB_ANCHORS.actorRow) : undefined}
                  />
                </Pressable>
              </Link>
            );
            return index === 0 ? (
              <SpotlightAnchor id={ONB_ANCHORS.actorRow}>{row}</SpotlightAnchor>
            ) : (
              row
            );
          }}
          ItemSeparatorComponent={CardSeparator}
          // Stale brief dims the cached list to 0.78 (design StaleBrief); the
          // FNStaleBrief banner + masthead "STALE · Nh" carry the explanation.
          contentContainerStyle={[styles.listContent, stale.stale && styles.staleList]}
          ListFooterComponent={
            manifest.data ? <FNColophon generatedAt={manifest.data.generated_at} /> : null
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
      )}

      {toastProps ? <FNRefreshToast {...toastProps} /> : null}
    </FNScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  emptyShell: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.faint },
  // Cached-but-stale dim — design StaleBrief scroll opacity.
  staleList: { opacity: 0.78 },
});
