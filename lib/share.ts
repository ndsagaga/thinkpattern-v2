import { Share } from 'react-native';

import { emit } from '@/lib/events';
import { Sentry } from '@/lib/sentry';

// One share entry point for detail screens. Opens the OS share sheet with the
// object's title + a text body, plus the public web link for the object
// (thinkpattern.ai/{surface}/{id}). Emits `content_shared` on a
// completed share for the engagement funnel; a user dismiss is a no-op; a real
// failure goes to Sentry (tagged surface=share) rather than surfacing.

const SHARE_BASE = 'https://thinkpattern.ai';

// The surface (singular) is BOTH the public path segment and the in-app route:
// /story/{id} · /perspective/{id} · /actor/{id} — the canonical universal-link
// form (verified by the AASA on thinkpattern.ai). The web share page hands off
// to the app from this same URL.
const SHARE_SURFACES = new Set(['story', 'perspective', 'actor']);

function shareUrl(surface: string, id: string | number): string | undefined {
  return SHARE_SURFACES.has(surface) ? `${SHARE_BASE}/${surface}/${id}` : undefined;
}

type ShareInput = {
  surface: 'story' | 'perspective' | 'actor';
  id: string | number;
  title: string;
  message: string;
};

export async function shareContent({ surface, id, title, message }: ShareInput): Promise<void> {
  const url = shareUrl(surface, id);
  try {
    const result = await Share.share(
      url ? { title, message, url } : { title, message },
      { subject: title },
    );
    if (result.action === Share.sharedAction) {
      emit('content_shared', { surface, id });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { surface: 'share' } });
  }
}
