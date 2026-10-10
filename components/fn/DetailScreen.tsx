import { type ReactNode, useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';

import { FNScreen } from './FNScreen';
import { FNNav } from './FNNav';
import { FNErrorPlaceholder } from './FNErrorPlaceholder';
import { FNSkeletonDetail } from './FNSkeletonDetail';
import type { DetailQueryResult } from '@/data/queries';
import type { ContentRef, ContentSurface } from '@/lib/content';
import { emit } from '@/lib/events';
import { useLogHistory } from '@/lib/history';
import { showToast } from '@/lib/toast';
import { diagnosticFromError } from '@/utils/errors';

// How the detail was reached, for the detail_opened / not_found_redirect
// funnels: a push tap, a search result, or in-app browsing (incl. deep links).
export type DetailOrigin = 'notification' | 'search' | 'direct';

export function originFromParam(from?: string): DetailOrigin {
  return from === 'notification' || from === 'search' ? from : 'direct';
}

type Props<T> = {
  surface: ContentSurface;
  id: string | number;
  // The route's detail query (data/queries.ts) — hydrates any id ever
  // published, so every origin (list tap, push, search, deep link, old
  // saved/history row) flows through this one scaffold.
  detail: DetailQueryResult<T>;
  origin: DetailOrigin;
  // List tab to fall back to on a gone object.
  listHref: Href;
  errorCopy: { kicker: string; body: string };
  // Share affordance in the masthead, wired once the detail loads.
  onShare: (data: T) => void;
  // Builds the save-ribbon / reading-history ref from the loaded data (which
  // carries the title/name).
  savedRefFor: (data: T) => ContentRef;
  children: (data: T) => ReactNode;
};

// The one detail-screen scaffold: masthead, skeleton/error/content states, and
// the gone-object fallback (toast + drop to the list, never a stranded screen).
export function DetailScreen<T>({
  surface,
  id,
  detail,
  origin,
  listHref,
  errorCopy,
  onShare,
  savedRefFor,
  children,
}: Props<T>) {
  const router = useRouter();

  useEffect(() => {
    emit('detail_opened', { surface, id, from: origin });
  }, [surface, id, origin]);

  // Never published, or deleted (the detail GET 404'd): drop to the list and
  // toast rather than strand the user on a broken detail.
  const gone = detail.notFound;
  useEffect(() => {
    if (!gone) return;
    emit('not_found_redirect', { surface, id, from: origin });
    showToast({ kind: 'gone', surface });
    router.replace(listHref);
  }, [gone, surface, id, origin, listHref, router]);

  // Same ref feeds the save ribbon and the reading-history log; both wait for
  // the title to be in hand.
  const ref = detail.data ? savedRefFor(detail.data) : null;
  useLogHistory(ref);

  return (
    <FNScreen>
      <FNNav
        onShare={detail.data ? () => onShare(detail.data!) : undefined}
        saveRef={ref ?? undefined}
      />
      {detail.data ? (
        children(detail.data)
      ) : detail.error ? (
        <FNErrorPlaceholder
          kicker={errorCopy.kicker}
          body={errorCopy.body}
          diagnostic={diagnosticFromError(detail.error, { surface, id })}
          onRetry={detail.refetch}
          onSecondary={() => router.replace(listHref)}
          secondaryLabel="← Back to list"
        />
      ) : (
        // loading, and the brief gone frame before the redirect effect fires
        <FNSkeletonDetail />
      )}
    </FNScreen>
  );
}
