import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { selectDetail, type Lens } from '@/lib/tabletSelection';

// On regular-width iPad the split view IS the app — there is no standalone
// detail screen. So when a detail ROUTE is entered from outside the shell (a
// notification tap or a universal link both land on /story|/perspective|/actor
// /[id] via the root Stack), we don't render it: we select the item into the
// shell's detail pane and pop back to the shell (already mounted beneath).
//
// This is the single funnel for every external open — NotificationBridge and
// the deep-link path both route through these [id] screens, so one branch here
// covers both. In-app list taps and in-pane search never reach a route; they
// call selectDetail directly.
export function TabletDetailRedirect({ lens, id }: { lens: Lens; id: string }) {
  const router = useRouter();
  useEffect(() => {
    selectDetail(lens, id);
    // Reveal the shell with the new selection. canGoBack covers the common case
    // (the shell sits below this pushed route); replace('/') is the cold-launch
    // fallback where this is somehow the only entry.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [lens, id, router]);
  return null;
}
