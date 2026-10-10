import { useLocalSearchParams } from 'expo-router';

import { DetailScreen, originFromParam } from '@/components/fn/DetailScreen';
import { TabletDetailRedirect } from '@/components/fn/TabletDetailRedirect';
import { PerspectiveDetail } from '@/components/PerspectiveDetail';
import { useSizeClass } from '@/hooks/useSizeClass';
import { usePerspectiveDetailQuery } from '@/data/queries';
import { NotifPrimingHost } from '@/components/fn/NotifPrimingHost';
import type { ContentRef } from '@/lib/content';
import { shareContent } from '@/lib/share';
import type { PerspectiveDetail as PerspectiveDetailData } from '@/types/contract';

// Share the column as title + thesis (no public web URL for content yet).
function sharePerspective(p: PerspectiveDetailData) {
  void shareContent({
    surface: 'perspective',
    id: p.id,
    title: p.title,
    message: `${p.title}\n\n${p.thesis}`,
  });
}

const perspectiveSavedRef = (p: PerspectiveDetailData): ContentRef => ({
  id: p.id,
  surface: 'perspective',
  title: p.title,
});

export default function PerspectiveRoute() {
  const { id, from, focus } = useLocalSearchParams<{ id: string; from?: string; focus?: string }>();
  const sizeClass = useSizeClass();

  // Tablets: select into the shell's detail pane instead of rendering a
  // standalone screen (notification taps + deep links, split and single).
  if (sizeClass !== 'compact') {
    return <TabletDetailRedirect lens="perspectives" id={id} />;
  }

  return <PerspectiveScreen id={id} from={from} focus={focus} />;
}

function PerspectiveScreen({ id, from, focus }: { id: string; from?: string; focus?: string }) {
  const detail = usePerspectiveDetailQuery(id);
  const origin = originFromParam(from);

  return (
    <DetailScreen
      surface="perspective"
      id={id}
      detail={detail}
      origin={origin}
      listHref="/perspectives"
      errorCopy={{
        kicker: "Couldn't load this perspective",
        body: "We couldn't fetch this column right now. Try again, or step back to the list.",
      }}
      onShare={sharePerspective}
      savedRefFor={perspectiveSavedRef}
    >
      {(data) => (
        <>
          <PerspectiveDetail perspective={data} focusComments={focus === 'comments'} />
          {/* First value moment → one-time push opt-in. Push opens skip it —
              the user demonstrably has pushes. */}
          {origin !== 'notification' ? <NotifPrimingHost /> : null}
        </>
      )}
    </DetailScreen>
  );
}
