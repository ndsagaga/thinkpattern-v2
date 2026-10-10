import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

import { FNCap } from './FNCap';
import { FNSearchGlyph } from './FNSearchGlyph';
import { FNSkeletonList } from './FNSkeletonList';
import { colors } from '@/constants/Colors';
import { fontFamily, fontSize, typography, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { emit } from '@/lib/events';
import type { LensSearch } from '@/hooks/useLensSearch';
import type { SearchLens } from '@/lib/searchHistory';
import { useSearchHistory } from '@/hooks/useSearchHistory';

// Queries ride analytics as typed, lowercased and capped so a pasted paragraph
// can't bloat an event. `query_length` keeps the untruncated length.
const ANALYTICS_QUERY_MAX = 64;
const analyticsQuery = (q: string) => q.trim().toLowerCase().slice(0, ANALYTICS_QUERY_MAX);

type Props<T> = {
  lens: SearchLens;
  // Where this lens's results come from — on-device ranking for actors and
  // perspectives, the server for stories. See hooks/useLensSearch.
  search: LensSearch<T>;
  // Identity + destination + bare row renderer.
  keyExtractor: (item: T) => string;
  getHref: (item: T) => Href;
  // Tablet split view: when set, a result taps to `onOpen(item)` (selecting it
  // into the detail pane) instead of navigating via `getHref`. Phone screens
  // omit it and keep the Link. `getHref` stays required so the same call site
  // works in both modes.
  onOpen?: (item: T) => void;
  renderRow: (item: T) => ReactNode;
  placeholder: string;
  // [singular, plural] for the result count, e.g. ['story', 'stories'].
  noun: [string, string];
  // Returns to the lens list (the ← affordance).
  onClose: () => void;
  // Force the offline state regardless of connectivity. Default: derive from
  // NetInfo. For the in-memory lenses (actors/perspectives) being offline
  // doesn't actually block a search — the state is design parity there; for
  // stories it's load-bearing, since every query is a live request. Exposed as
  // a prop so a host can override (or test) the derivation.
  offline?: boolean;
};

// Lens-scoped search, rendered IN PLACE of the list inside the tab's FNScreen
// (so the bottom tab bar stays). Generic over the index entry type T: the
// caller supplies the result source, destination, and the condensed row.
// FNSearch owns the field, history, and the body states (offline / recent /
// loading / error / no-findings / results) — plus the Link + remember-on-open
// wrap. It does NOT rank: `search` decides what matches (hooks/useLensSearch).
export function FNSearch<T>({
  lens,
  search,
  keyExtractor,
  getHref,
  onOpen,
  renderRow,
  placeholder,
  noun,
  onClose,
  offline,
}: Props<T>) {
  const { results, status, capped, onQueryChange, onRetry } = search;
  const [query, setQuery] = useState('');
  const { recent, remember, clear } = useSearchHistory(lens);

  // The field is the only writer of `query`; every write also notifies the
  // result source. Routed through one callback so no edit path (typing, ✕,
  // picking a recent) can update the field without re-running the search.
  const setSearchQuery = useCallback(
    (next: string) => {
      setQuery(next);
      onQueryChange(next);
    },
    [onQueryChange],
  );

  // The result source is owned by the SCREEN, which stays mounted when search
  // closes — so clear it on the way out. Without this, reopening search shows
  // the previous term's results under an empty field until the first keystroke
  // settles. `onQueryChange` is a stable setter, so this runs only on unmount.
  useEffect(() => () => onQueryChange(''), [onQueryChange]);

  // Offline signal. `isInternetReachable === false` is the only definitive
  // "no connection" verdict (null = still probing → treat as online, matching
  // lib/network.ts). The `offline` prop overrides when supplied.
  const net = useNetInfo();
  const isOffline =
    offline ?? (net.isConnected === false || net.isInternetReachable === false);

  // Android hardware back closes search (mirrors the ← button) rather than
  // popping the tab/exiting the app. useFocusEffect scopes the intercept to
  // when this tab is focused — so once a result pushes a detail on top, the
  // detail owns back, and this handler re-arms only when we return here.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }, [onClose]),
  );

  const typed = query.trim() !== '';

  return (
    <View style={styles.root}>
      {/* Search field — back ←, magnifier, input, clear ✕, ruled underline. */}
      <View style={styles.fieldRow}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.field}>
          <FNSearchGlyph size={17} />
          <TextInput
            value={query}
            onChangeText={setSearchQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => {
              remember(query);
              emit('search_submitted', {
                surface: lens,
                query: analyticsQuery(query),
                query_length: query.trim().length,
                result_count: results.length,
              });
            }}
            style={styles.input}
            // Tapping a result while the keyboard is up must register on the
            // first touch, not just dismiss the keyboard.
            // (keyboardShouldPersistTaps lives on the result list below.)
          />
          {query ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              hitSlop={10}
            >
              <Text style={styles.clearX}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Body: offline (search attempted, no connection) / recent (pre-query) /
          in flight / failed / no findings / results. Offline and the failure
          states keep the typed term in the field; offline wins over a failed
          search because no-connection is its likeliest cause and the reconnect
          refetch recovers it. Both only gate once the user has typed — before
          that, recents render regardless of what the source is doing. */}
      {typed && isOffline ? (
        <SearchOffline />
      ) : !typed ? (
        <RecentList
          recent={recent}
          onPick={(term) => {
            emit('recent_search_selected', { surface: lens, query: analyticsQuery(term) });
            setSearchQuery(term);
          }}
          onClear={clear}
        />
      ) : status === 'loading' ? (
        <FNSkeletonList />
      ) : status === 'error' ? (
        <SearchFailed onRetry={onRetry} />
      ) : results.length === 0 ? (
        <NoFindings query={query.trim()} onClear={() => setSearchQuery('')} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <FNCap style={styles.count}>
              {capped ? 'Top ' : ''}
              <Text style={typography.num}>{results.length}</Text>{' '}
              {results.length === 1 ? noun[0] : noun[1]}
            </FNCap>
          }
          renderItem={({ item }) =>
            // remember-on-open: live filtering means many users never press
            // return, so the query is recorded when a result is opened. In the
            // tablet pane `onOpen` selects the result in place; on phone the
            // Link pushes the detail route.
            onOpen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  remember(query);
                  onOpen(item);
                }}
              >
                {renderRow(item)}
              </Pressable>
            ) : (
              <Link href={getHref(item)} asChild>
                <Pressable accessibilityRole="link" onPress={() => remember(query)}>
                  {renderRow(item)}
                </Pressable>
              </Link>
            )
          }
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

function RecentList({
  recent,
  onPick,
  onClear,
}: {
  recent: string[];
  onPick: (term: string) => void;
  onClear: () => void;
}) {
  if (recent.length === 0) {
    return <Text style={styles.recentEmpty}>No recent searches yet.</Text>;
  }
  return (
    <View style={styles.recentWrap}>
      <View style={styles.recentHead}>
        <FNCap>Recent</FNCap>
        <Pressable onPress={onClear} accessibilityRole="button" hitSlop={8}>
          <FNCap color={colors.muted}>Clear</FNCap>
        </Pressable>
      </View>
      {recent.map((term, i) => (
        <Pressable
          key={term}
          onPress={() => onPick(term)}
          accessibilityRole="button"
          style={[styles.recentRow, i === 0 ? null : styles.recentRowBordered]}
        >
          <Text style={styles.recentTerm} numberOfLines={1}>
            {term}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function NoFindings({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <View style={styles.noFindings}>
      <Text style={styles.noFindingsTitle}>No findings.</Text>
      <Text style={styles.noFindingsBody}>
        Nothing in this lens matches “{query}”. Try a broader term.
      </Text>
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        style={styles.clearBtn}
      >
        <FNCap color={colors.ink}>Clear</FNCap>
      </Pressable>
    </View>
  );
}

// Offline state: a search was attempted with no connection. The typed term is
// preserved in the field above; this body explains why and offers Retry. Mirrors
// the design's SearchOffline (accent kicker, headline, lede, outline CTA).
// Source: design/ThinkPattern/lib/thinkpattern.jsx → SearchOffline.
function SearchOffline() {
  // Retry re-probes connectivity. NetInfo is the live source (useNetInfo above),
  // so a successful refresh flips isOffline and the body swaps back to results.
  // (No data fetch to retry — search is local; see the `offline` prop note.)
  const onRetry = useCallback(() => {
    void NetInfo.refresh();
  }, []);
  return (
    <View style={styles.offline}>
      <FNCap color={colors.accent}>Offline</FNCap>
      <Text style={styles.offlineTitle}>Search needs a connection.</Text>
      <Text style={styles.offlineBody}>
        Search looks across the full archive, which isn’t kept on the device.
        Reconnect to search — your cached edition is still readable in the lens.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={styles.offlineRetry}
      >
        <FNCap color={colors.ink}>Retry</FNCap>
      </Pressable>
    </View>
  );
}

// The search request failed while connected (worker error, timeout). Same block
// anatomy as SearchOffline — accent kicker, headline, lede, outline CTA — but
// Retry refires the query itself rather than re-probing connectivity.
function SearchFailed({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.offline}>
      <FNCap color={colors.accent}>Search unavailable</FNCap>
      <Text style={styles.offlineTitle}>Couldn’t reach the archive.</Text>
      <Text style={styles.offlineBody}>
        The archive didn’t answer. Your cached edition is still readable in the
        lens — try the search again in a moment.
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={styles.offlineRetry}
        >
          <FNCap color={colors.ink}>Retry</FNCap>
        </Pressable>
      ) : null}
    </View>
  );
}

const SEPARATOR = 'rgba(31, 26, 20, 0.14)';

const styles = StyleSheet.create({
  root: { flex: 1 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
  },
  backBtn: { paddingVertical: 4, marginLeft: -4 },
  backArrow: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 19,
    color: colors.ink,
    lineHeight: 22,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontFamily: fontFamily.uiMedium,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.17,
  },
  clearX: {
    fontFamily: fontFamily.uiMedium,
    fontSize: 15,
    color: colors.muted,
  },
  count: { paddingTop: 16, paddingBottom: 2 },
  listContent: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
  },
  separator: { height: 1, backgroundColor: SEPARATOR },
  recentWrap: { paddingHorizontal: spacing.gutter, marginTop: 18 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recentRow: { paddingVertical: 12 },
  recentRowBordered: {
    borderTopWidth: 1,
    borderTopColor: colors.faint,
  },
  recentTerm: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    color: colors.ink,
  },
  recentEmpty: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 40,
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: colors.muted,
  },
  // Offline state — design SearchOffline. Accent kicker, 24pt title, ink2 lede,
  // outline Retry. Top pad mirrors noFindings; gaps follow the design rungs.
  offline: { paddingHorizontal: spacing.gutter, paddingTop: 40 },
  offlineTitle: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.title, // 24 (design TS.title)
    lineHeight: fontSize.title * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    marginTop: spacing.md, // 12 (design SP.s3)
  },
  offlineBody: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base, // 15 (design TS.base)
    lineHeight: 23, // ~1.55
    color: colors.ink2,
    marginTop: spacing.sm, // 8 (design SP.s2)
  },
  offlineRetry: {
    marginTop: spacing.lg, // 16 (design SP.s4)
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  noFindings: { paddingHorizontal: spacing.gutter, paddingTop: 40 },
  noFindingsTitle: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 22,
    lineHeight: 22 * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
  },
  noFindingsBody: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    marginTop: 8,
  },
  clearBtn: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
