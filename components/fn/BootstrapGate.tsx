import { type ReactNode } from 'react';

import { useManifestQuery, UnsupportedSchemaError } from '@/data/queries';
import { FNColdOffline } from './FNColdOffline';
import { FNUpdateRequired } from './FNUpdateRequired';

type Props = {
  children: ReactNode;
};

// Gates the route stack on manifest bootstrap status. The manifest is the
// root of the data graph (data/queries.ts); everything else follows its
// `_url` fields, so "can we render the app?" reduces to "do we have a usable
// manifest?".
//
//   - schema mismatch (UnsupportedSchemaError): a breaking export-format change
//     shipped; refuse to render and prompt update. Checked first — it wins even
//     if a stale, compatible-looking manifest is cached.
//
//   - no manifest data AND (errored after retries OR paused offline): nothing
//     to bootstrap from and we're not mid-first-load. Either first-install +
//     offline (paused, no cache) or the fetch failed with no cache. The route
//     stack has nothing to show, so FNColdOffline takes over.
//
//   - otherwise (have data, OR still loading first paint): render children.
//     Each route owns its own skeleton; a global spinner here would double up.
//     Stale-but-cached data is signalled by FNScreen's banner, not here.
export function BootstrapGate({ children }: Props) {
  const manifest = useManifestQuery();

  if (manifest.error instanceof UnsupportedSchemaError) {
    return <FNUpdateRequired schemaVersion={manifest.error.version} />;
  }

  if (!manifest.data && (manifest.isError || manifest.isPaused)) {
    return <FNColdOffline />;
  }

  return <>{children}</>;
}
