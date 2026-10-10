import { useLocalSearchParams } from 'expo-router';

import { DetailScreen, originFromParam } from '@/components/fn/DetailScreen';
import { TabletDetailRedirect } from '@/components/fn/TabletDetailRedirect';
import { StoryDetail } from '@/components/StoryDetail';
import { useSizeClass } from '@/hooks/useSizeClass';
import { useStoryDetailQuery } from '@/data/queries';
import { NotifPrimingHost } from '@/components/fn/NotifPrimingHost';
import type { ContentRef } from '@/lib/content';
import { shareContent } from '@/lib/share';
import type { StoryDetail as StoryDetailData } from '@/types/contract';

// Share the story as title + short summary; lib/share adds the web URL.
function shareStory(s: StoryDetailData) {
  void shareContent({
    surface: 'story',
    id: s.id,
    title: s.title,
    message: `${s.title}\n\n${s.short_summary}`,
  });
}

const storySavedRef = (s: StoryDetailData): ContentRef => ({
  id: s.id,
  surface: 'story',
  title: s.title,
});

export default function StoryRoute() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const sizeClass = useSizeClass();

  // Tablets have no standalone detail — select into the shell's detail pane and
  // return to it (covers notification taps + deep links, split and single).
  if (sizeClass !== 'compact') {
    return <TabletDetailRedirect lens="stories" id={id} />;
  }

  return <StoryScreen id={id} from={from} />;
}

function StoryScreen({ id, from }: { id: string; from?: string }) {
  const detail = useStoryDetailQuery(id);
  const origin = originFromParam(from);

  return (
    <DetailScreen
      surface="story"
      id={id}
      detail={detail}
      origin={origin}
      listHref="/"
      errorCopy={{
        kicker: "Couldn't load this story",
        body: "We couldn't fetch this story right now. The rest of the brief still works — try again, or step back to the list.",
      }}
      onShare={shareStory}
      savedRefFor={storySavedRef}
    >
      {(data) => (
        <>
          <StoryDetail story={data} />
          {/* First value moment → one-time push opt-in (editorial priming →
              OS ask). Push opens skip it — the user demonstrably has pushes. */}
          {origin !== 'notification' ? <NotifPrimingHost /> : null}
        </>
      )}
    </DetailScreen>
  );
}
