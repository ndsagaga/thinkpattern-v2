import { useEffect, useState } from 'react';

import { subscribeToast, type ToastMessage } from '@/lib/toast';
import { FNRefreshToast } from './FNRefreshToast';

// App-global toast outlet. Mounted once at the root (app/_layout.tsx) so a
// notice shows wherever the user lands — e.g. the 'gone' toast after a
// dead-object notification tap drops them back to a list. Subscribes to the
// lib/toast pub-sub; renders nothing until something fires.

const VISIBLE_MS = 4000;

const SURFACE_META: Record<Extract<ToastMessage, { kind: 'gone' }>['surface'], string> = {
  story: 'STORY',
  actor: 'ACTOR',
  perspective: 'PERSPECTIVE',
};

export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  // Auto-dismiss; resets the timer whenever a new toast replaces the current.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  switch (toast.kind) {
    case 'gone':
      return <FNRefreshToast kind="gone" metaLabel={SURFACE_META[toast.surface]} />;
    case 'notice':
      return <FNRefreshToast kind="notice" label={toast.message} />;
  }
}
