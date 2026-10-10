import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import {
  selectDetail,
  setLens,
  showList,
  useTabletSelection,
  type Lens,
} from '@/lib/tabletSelection';
import { FNStaleBrief } from './FNStaleBrief';
import { FNTabletDetailPane } from './FNTabletDetailPane';
import { FNTabletListPane } from './FNTabletListPane';
import { FNTabletRail } from './FNTabletRail';

// The tablet layout. Two modes off one set of parts (rail + list pane + detail
// pane), all reading one selection store so every entry point — a list tap, a
// search result, a notification, a deep link — lands in the same detail pane:
//
//   split  (13" iPad): rail + list (392pt) + detail (flex), both always shown.
//   single (smaller tablets): rail + ONE centred reading column (max 560pt,
//          ruled), showing the browse list or the reading detail one-at-a-time.
//
// Compact width never renders this: app/(tabs)/_layout.tsx keeps the phone tabs
// + stack there. Source: design/ThinkPattern → TabletShell (mode split|single).
export function FNTabletShell({ mode }: { mode: 'split' | 'single' }) {
  const sel = useTabletSelection();
  const { stale, lastFetchedAt } = useStaleManifest();

  // Rail tap: a different lens browses that lens from the top; re-tapping the
  // active lens returns to its browse column (single view). Split view shows
  // both panes, so the pane flip is a harmless no-op there.
  const onNav = useCallback(
    (lens: Lens) => (lens === sel.lens ? showList() : setLens(lens)),
    [sel.lens],
  );
  const onOpen = useCallback((id: string) => selectDetail(sel.lens, id), [sel.lens]);

  const list = (
    <FNTabletListPane
      lens={sel.lens}
      // Row highlight only in split view, where list + detail are both visible
      // so it marks the open item. Single view replaces the list with the
      // detail on tap, so there's nothing to keep highlighted.
      selectedId={mode === 'split' ? sel[sel.lens] : null}
      onOpen={onOpen}
    />
  );
  const detail = (
    <FNTabletDetailPane
      lens={sel.lens}
      storyId={sel.stories}
      perspectiveId={sel.perspectives}
      actorId={sel.actors}
      onBack={mode === 'single' ? showList : undefined}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {stale ? <FNStaleBrief lastFetchedAt={lastFetchedAt!} /> : null}
      <View style={styles.body}>
        <FNTabletRail active={sel.lens} onNav={onNav} />
        {mode === 'single' ? (
          <View style={styles.singleOuter}>
            <View style={styles.singleColumn}>{sel.pane === 'detail' ? detail : list}</View>
          </View>
        ) : (
          <>
            <View style={styles.listCol}>{list}</View>
            <View style={styles.detailCol}>{detail}</View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, flexDirection: 'row', minHeight: 0 },
  // split
  listCol: {
    width: 392,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: colors.ink,
  },
  detailCol: { flex: 1, minWidth: 0 },
  // single — centre a max-width reading column, ruled both sides.
  singleOuter: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: colors.paper },
  singleColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.rule,
  },
});
