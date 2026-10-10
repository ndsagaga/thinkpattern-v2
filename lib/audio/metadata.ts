// Pure maps: a published perspective → the audio source the player loads, and
// the metadata the lock screen renders. Kept asset-free and side-effect-free so
// they're trivial to unit-test; the player module wires them into expo-audio.
import type { AudioMetadata } from 'expo-audio';

import { resolveCdnUrl } from '@/lib/config';
import type { PerspectiveDetail } from '@/types/contract';

// Lock-screen cover art = the app logo (hosted; expo-audio loads artwork over
// the network and falls back to title/artist if it can't be fetched). A
// perspective detail carries no image of its own, so the brand mark is the
// stable, on-brand choice.
const APP_ARTWORK_URL = 'https://thinkpattern.ai/assets/apple-touch-icon.png';

// "POLITICS" → "Politics" for the Now-Playing subtitle; falls back to the app
// name when a perspective has no dominant topic.
function topicLabel(topic: string | null | undefined): string {
  if (!topic) return 'ThinkPattern';
  return topic.charAt(0) + topic.slice(1).toLowerCase();
}

// audio_url is a bucket-relative path ("audio/perspectives/pp_….mp3"), like
// every other `_url` field — resolve it against the CDN base. Returns null (no
// playable source) when the perspective has no audio, so callers guard in one
// place.
export function toSource(p: PerspectiveDetail): string | null {
  return resolveCdnUrl(p.audio_url);
}

export function toMetadata(p: PerspectiveDetail): AudioMetadata {
  return { title: p.title, artist: topicLabel(p.topic), artworkUrl: APP_ARTWORK_URL };
}
