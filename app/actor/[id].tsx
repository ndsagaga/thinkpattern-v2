import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { DetailScreen, originFromParam } from '@/components/fn/DetailScreen';
import { TabletDetailRedirect } from '@/components/fn/TabletDetailRedirect';
import { ActorDetail } from '@/components/ActorDetail';
import { useSizeClass } from '@/hooks/useSizeClass';
import { useActorDetailQuery } from '@/data/queries';
import { NotifPrimingHost } from '@/components/fn/NotifPrimingHost';
import type { ContentRef } from '@/lib/content';
import { emit } from '@/lib/events';
import { shareContent } from '@/lib/share';
import { showToast } from '@/lib/toast';
import type { ActorDetail as ActorDetailData } from '@/types/contract';

// Share the profile as name + bio summary; lib/share adds the web URL.
function shareActor(a: ActorDetailData) {
  void shareContent({
    surface: 'actor',
    id: a.id,
    title: a.name,
    message: `${a.name}\n\n${a.bio_summary}`,
  });
}

// Actor id is numeric per the contract; coerce to the string the store keys by
// and the /actor/[id] route expects.
const actorSavedRef = (a: ActorDetailData): ContentRef => ({
  id: String(a.id),
  surface: 'actor',
  title: a.name,
});

// Actor IDs are positive integers per the contract; the URL param is
// a string. Number.parseInt on a missing or non-numeric value returns NaN
// silently, which would otherwise propagate into an `actors/NaN.json`
// fetch. Validate at the route boundary. Inner components hold the hooks so
// the validation branch doesn't violate Rules of Hooks.
export default function ActorRoute() {
  const { id: raw, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const sizeClass = useSizeClass();
  const id = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(id) || id <= 0) {
    return <ActorNotFound raw={raw} from={from} />;
  }

  // Tablets: select into the shell's detail pane (the selection store keys
  // actors by the string id) instead of a standalone screen.
  if (sizeClass !== 'compact') {
    return <TabletDetailRedirect lens="actors" id={String(id)} />;
  }

  return <ActorScreen id={id} from={from} />;
}

// A malformed actor link (the id isn't a positive integer). This used to drop
// the user on the bare +not-found screen — a dead end, and silent, so we could
// never see which link produced it. Mirror the gone-object path in
// DetailScreen instead: log it with the offending id, toast, and fall back to
// the actors list.
function ActorNotFound({ raw, from }: { raw?: string; from?: string }) {
  const router = useRouter();
  const origin = originFromParam(from);

  useEffect(() => {
    emit('not_found_redirect', { surface: 'actor', id: raw ?? '(missing)', from: origin });
    showToast({ kind: 'gone', surface: 'actor' });
    router.replace('/actors');
  }, [raw, origin, router]);

  return null;
}

function ActorScreen({ id, from }: { id: number; from?: string }) {
  const detail = useActorDetailQuery(id);
  const origin = originFromParam(from);

  return (
    <DetailScreen
      surface="actor"
      id={id}
      detail={detail}
      origin={origin}
      listHref="/actors"
      errorCopy={{
        kicker: "Couldn't load this actor",
        body: "We couldn't fetch this profile right now. The rest of the brief still works — try again, or step back to the list.",
      }}
      onShare={shareActor}
      savedRefFor={actorSavedRef}
    >
      {(data) => (
        <>
          <ActorDetail actor={data} />
          {/* First value moment → one-time push opt-in. Push opens skip it —
              the user demonstrably has pushes. */}
          {origin !== 'notification' ? <NotifPrimingHost /> : null}
        </>
      )}
    </DetailScreen>
  );
}
