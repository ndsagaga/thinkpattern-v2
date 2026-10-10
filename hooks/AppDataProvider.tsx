import { type ReactNode } from 'react';

import {
  useActorsIndexQuery,
  usePerspectivesIndexQuery,
  useStoriesIndexQuery,
} from '@/data/queries';

// One mount-point for the global data layer. There's no provider to mount
// anymore — TanStack Query handles cross-component cache natively, and the
// manifest is just the root query (no snapshot/pointer machine). This stays
// as the logical "data layer entry point" and hosts DataPrewarm.
//
// DataPrewarm keeps all three index queries subscribed at the app root so
// they fire as soon as their `enabled` gate flips true (manifest loaded),
// regardless of which tab is mounted. The manifest is pre-warmed transitively
// because every index query calls useManifestQuery.
export function AppDataProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <DataPrewarm />
      {children}
    </>
  );
}

// Subscribes to every index query at the root so they fetch as soon as the
// manifest provides their URL. Renders nothing; being mounted is the effect.
function DataPrewarm() {
  useStoriesIndexQuery();
  usePerspectivesIndexQuery();
  useActorsIndexQuery();
  return null;
}
