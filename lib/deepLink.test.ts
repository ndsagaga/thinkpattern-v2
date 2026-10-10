import { shareUrlToRoute } from './deepLink';

describe('shareUrlToRoute', () => {
  test('story link → /story/{id}', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/story/sy_abc')).toBe('/story/sy_abc'));

  test('perspective link → /perspective/{id}', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/perspective/pp_abc')).toBe(
      '/perspective/pp_abc',
    ));

  test('actor link → /actor/{id}', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/actor/123')).toBe('/actor/123'));

  test('short form /s/{id} → /story/{id}', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/s/sy_z')).toBe('/story/sy_z'));

  test('query params are ignored', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/story/sy_z?utm=x')).toBe('/story/sy_z'));

  test('bare path (no scheme/host) still maps', () =>
    expect(shareUrlToRoute('/story/sy_q')).toBe('/story/sy_q'));

  test('legacy /share/{plural}.html?id= still maps', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/share/perspectives.html?id=pp_abc')).toBe(
      '/perspective/pp_abc',
    ));

  test('non-matching link → null (left untouched)', () =>
    expect(shareUrlToRoute('https://thinkpattern.ai/about')).toBeNull());
});
