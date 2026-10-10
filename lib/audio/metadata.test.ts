import type { PerspectiveDetail } from '@/types/contract';

import { toMetadata, toSource } from './metadata';

// These maps read only a few fields; cast a minimal fixture rather than spell
// out the whole detail shape.
function persp(over: Partial<PerspectiveDetail>): PerspectiveDetail {
  return {
    id: 'pp_1',
    shape: 'arc',
    title: 'A Column',
    thesis: 'A thesis.',
    topic: 'POLITICS',
    published_at: '2026-07-14T00:00:00Z',
    audio_url: 'audio/perspectives/pp_1.v1.mp3',
    audio_duration_sec: 300,
    ...over,
  } as PerspectiveDetail;
}

describe('toSource', () => {
  it('returns null when the perspective has no audio', () => {
    expect(toSource(persp({ audio_url: null }))).toBeNull();
  });

  it('resolves a bucket-relative audio path against the CDN base', () => {
    // jest.setup defaults EXPO_PUBLIC_CDN_BASE_URL to https://test.cdn.example
    expect(toSource(persp({}))).toBe('https://test.cdn.example/audio/perspectives/pp_1.v1.mp3');
  });

  it('passes a fully-qualified URL through unchanged', () => {
    expect(toSource(persp({ audio_url: 'https://cdn/x.mp3' }))).toBe('https://cdn/x.mp3');
  });
});

describe('toMetadata', () => {
  it('uses the title, a title-cased topic, and the app logo as artwork', () => {
    expect(toMetadata(persp({ topic: 'TECHNOLOGY' }))).toEqual({
      title: 'A Column',
      artist: 'Technology',
      artworkUrl: 'https://thinkpattern.ai/assets/apple-touch-icon.png',
    });
  });

  it('falls back to the app name when there is no topic', () => {
    expect(toMetadata(persp({ topic: null })).artist).toBe('ThinkPattern');
  });
});
