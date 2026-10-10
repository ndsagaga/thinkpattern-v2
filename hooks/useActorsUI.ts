import { useActorsIndexQuery, useManifestQuery } from '@/data/queries';
import type { ActorIndexEntry } from '@/types/contract';

// Actors has no category pills (sorted by salience, no filter chrome),
// so the data variant carries items only — no categories field.

export type ActorsUI =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error }
  | { kind: 'empty' }
  | { kind: 'data'; items: ActorIndexEntry[] };

export function useActorsUI(): ActorsUI {
  const manifest = useManifestQuery();
  const actors = useActorsIndexQuery();

  const error = manifest.error ?? actors.error;
  if (!actors.data && error) return { kind: 'error', error };
  if (!actors.data) return { kind: 'loading' };
  if (actors.data.length === 0) return { kind: 'empty' };

  return { kind: 'data', items: actors.data };
}
