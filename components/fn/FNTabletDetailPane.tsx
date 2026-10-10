import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import {
  useStoryDetailQuery,
  usePerspectiveDetailQuery,
  useActorDetailQuery,
} from '@/data/queries';
import { StoryDetail } from '@/components/StoryDetail';
import { PerspectiveDetail } from '@/components/PerspectiveDetail';
import { ActorDetail } from '@/components/ActorDetail';
import type { ContentRef } from '@/lib/content';
import { useLogHistory } from '@/lib/history';
import { shareContent } from '@/lib/share';
import type { Lens } from '@/lib/tabletSelection';
import { FNErrorPlaceholder } from './FNErrorPlaceholder';
import { FNRuleSoft } from './FNRule';
import { FNSaveButton } from './FNSaveButton';
import { FNShareGlyph } from './FNShareGlyph';
import { FNTabletEmptyDetail } from './FNTabletEmptyDetail';

// The detail column of the tablet layouts. Renders the SAME detail component and
// runs the SAME query the phone [id] route does — only the chrome differs: no
// phone masthead, and save/share sit in a light toolbar the shell owns. In
// single view the toolbar also carries a back arrow (onBack) to return to the
// browse column; in split view the pane is persistent, so onBack is omitted.
// Selection comes from lib/tabletSelection, so a list tap, a search result, a
// notification, and a deep link all land here.
//
// One pane component per lens (each owns one detail hook, so the Rules of Hooks
// hold as the shell switches lenses); the shared PaneScaffold carries the
// toolbar + rule + scrolling content.

type Props = {
  lens: Lens;
  storyId: string | null;
  perspectiveId: string | null;
  actorId: string | null;
  // Single view only: return to the browse column. Absent in split view.
  onBack?: () => void;
};

export function FNTabletDetailPane({ lens, storyId, perspectiveId, actorId, onBack }: Props) {
  switch (lens) {
    case 'stories':
      return <StoryPane id={storyId} onBack={onBack} />;
    case 'perspectives':
      return <PerspectivePane id={perspectiveId} onBack={onBack} />;
    case 'actors':
      return <ActorPane id={actorId} onBack={onBack} />;
  }
}

function PaneScaffold({
  onBack,
  saveRef,
  onShare,
  children,
}: {
  onBack?: () => void;
  saveRef?: ContentRef;
  onShare: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.pane}>
      <View style={[styles.toolbar, onBack ? styles.toolbarSpread : styles.toolbarEnd]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Back to list"
          >
            <Text style={styles.back}>←</Text>
          </Pressable>
        ) : null}
        <View style={styles.actions}>
          {saveRef ? <FNSaveButton item={saveRef} /> : null}
          <Pressable
            onPress={onShare}
            hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Share"
            style={styles.shareBtn}
          >
            <FNShareGlyph size={20} />
          </Pressable>
        </View>
      </View>
      <FNRuleSoft style={styles.rule} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// --- Stories ---------------------------------------------------------------

function StoryPane({ id, onBack }: { id: string | null; onBack?: () => void }) {
  if (!id) return <FNTabletEmptyDetail lens="stories" />;
  return <StoryPaneInner id={id} onBack={onBack} />;
}

function StoryPaneInner({ id, onBack }: { id: string; onBack?: () => void }) {
  const story = useStoryDetailQuery(id);
  const ref: ContentRef | null = story.data
    ? { id: story.data.id, surface: 'story', title: story.data.title }
    : null;
  useLogHistory(ref);

  if (!story.data && story.loading) return <FNTabletEmptyDetail lens="stories" loading />;
  if (!story.data) {
    if (story.error) {
      return (
        <FNErrorPlaceholder
          kicker="Couldn't load this story"
          body="We couldn't fetch this story right now. Try again, or pick another from the list."
          onRetry={story.refetch}
        />
      );
    }
    return <FNTabletEmptyDetail lens="stories" />;
  }
  const data = story.data;
  return (
    <PaneScaffold
      onBack={onBack}
      saveRef={ref ?? undefined}
      onShare={() =>
        void shareContent({
          surface: 'story',
          id: data.id,
          title: data.title,
          message: `${data.title}\n\n${data.short_summary}`,
        })
      }
    >
      <StoryDetail story={data} />
    </PaneScaffold>
  );
}

// --- Perspectives ----------------------------------------------------------

function PerspectivePane({ id, onBack }: { id: string | null; onBack?: () => void }) {
  if (!id) return <FNTabletEmptyDetail lens="perspectives" />;
  return <PerspectivePaneInner id={id} onBack={onBack} />;
}

function PerspectivePaneInner({ id, onBack }: { id: string; onBack?: () => void }) {
  const perspective = usePerspectiveDetailQuery(id);
  const ref: ContentRef | null = perspective.data
    ? { id: perspective.data.id, surface: 'perspective', title: perspective.data.title }
    : null;
  useLogHistory(ref);

  if (!perspective.data && perspective.loading)
    return <FNTabletEmptyDetail lens="perspectives" loading />;
  if (!perspective.data) {
    if (perspective.error) {
      return (
        <FNErrorPlaceholder
          kicker="Couldn't load this perspective"
          body="We couldn't fetch this column right now. Try again, or pick another from the list."
          onRetry={perspective.refetch}
        />
      );
    }
    return <FNTabletEmptyDetail lens="perspectives" />;
  }
  const data = perspective.data;
  return (
    <PaneScaffold
      onBack={onBack}
      saveRef={ref ?? undefined}
      onShare={() =>
        void shareContent({
          surface: 'perspective',
          id: data.id,
          title: data.title,
          message: `${data.title}\n\n${data.thesis}`,
        })
      }
    >
      <PerspectiveDetail perspective={data} />
    </PaneScaffold>
  );
}

// --- Actors ----------------------------------------------------------------

function ActorPane({ id, onBack }: { id: string | null; onBack?: () => void }) {
  const numId = id != null ? Number.parseInt(id, 10) : NaN;
  if (!Number.isFinite(numId) || numId <= 0) return <FNTabletEmptyDetail lens="actors" />;
  return <ActorPaneInner id={numId} onBack={onBack} />;
}

function ActorPaneInner({ id, onBack }: { id: number; onBack?: () => void }) {
  const actor = useActorDetailQuery(id);
  const ref: ContentRef | null = actor.data
    ? { id: String(actor.data.id), surface: 'actor', title: actor.data.name }
    : null;
  useLogHistory(ref);

  if (!actor.data && actor.loading) return <FNTabletEmptyDetail lens="actors" loading />;
  if (!actor.data) {
    if (actor.error) {
      return (
        <FNErrorPlaceholder
          kicker="Couldn't load this actor"
          body="We couldn't fetch this profile right now. Try again, or pick another from the list."
          onRetry={actor.refetch}
        />
      );
    }
    return <FNTabletEmptyDetail lens="actors" />;
  }
  const data = actor.data;
  return (
    <PaneScaffold
      onBack={onBack}
      saveRef={ref ?? undefined}
      onShare={() =>
        void shareContent({
          surface: 'actor',
          id: data.id,
          title: data.name,
          message: `${data.name}\n\n${data.bio_summary}`,
        })
      }
    >
      <ActorDetail actor={data} />
    </PaneScaffold>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 1, backgroundColor: colors.paper },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // Back on the left + actions on the right (single view) vs actions-only right
  // (split view — the pane is persistent, so no back).
  toolbarSpread: { justifyContent: 'space-between' },
  toolbarEnd: { justifyContent: 'flex-end' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 19,
    lineHeight: 22,
    color: colors.ink,
  },
  shareBtn: { flexShrink: 0, padding: 4 },
  rule: { marginHorizontal: spacing.gutter },
  content: { flex: 1 },
});
