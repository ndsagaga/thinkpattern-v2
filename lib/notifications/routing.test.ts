import { resolveNotificationRoute } from './routing';
import { parsePushData } from './types';

describe('parsePushData', () => {
  test('parses a full, valid push → ok', () => {
    expect(
      parsePushData({
        kind: 'story',
        object_id: 'sy_abc',
        notification_id: '42',
        detail_url: 'stories/sy_abc.json',
      }),
    ).toEqual({
      status: 'ok',
      data: {
        kind: 'story',
        object_id: 'sy_abc',
        notification_id: '42',
        detail_url: 'stories/sy_abc.json',
      },
    });
  });

  test('missing notification_id defaults to "" on an otherwise-valid push', () => {
    expect(
      parsePushData({
        kind: 'actor',
        object_id: '12345',
        detail_url: 'actors/12345.json',
      }),
    ).toEqual({
      status: 'ok',
      data: {
        kind: 'actor',
        object_id: '12345',
        notification_id: '',
        detail_url: 'actors/12345.json',
      },
    });
  });

  test('missing detail_url → malformed (carries raw kind/objectId)', () => {
    expect(
      parsePushData({ kind: 'story', object_id: 'sy_abc', notification_id: '42' }),
    ).toEqual({ status: 'malformed', kind: 'story', objectId: 'sy_abc' });
  });

  test('missing object_id → malformed', () => {
    expect(
      parsePushData({ kind: 'story', detail_url: 'stories/sy_abc.json' }),
    ).toEqual({ status: 'malformed', kind: 'story', objectId: '' });
  });

  test('unknown / forward-compat kind → malformed (keeps the raw kind)', () => {
    expect(
      parsePushData({ kind: 'briefing', object_id: 'br_1', detail_url: 'x.json' }),
    ).toEqual({ status: 'malformed', kind: 'briefing', objectId: 'br_1' });
  });

  test('no kind → null (non-routing / diagnostic message)', () => {
    expect(parsePushData({ object_id: 'sy_x' })).toBeNull();
  });

  test('null / undefined data → null', () => {
    expect(parsePushData(null)).toBeNull();
    expect(parsePushData(undefined)).toBeNull();
  });
});

describe('resolveNotificationRoute', () => {
  const route = (kind: 'story' | 'actor' | 'perspective', object_id: string) =>
    resolveNotificationRoute({ kind, object_id, notification_id: '', detail_url: '' });

  test('story → /story/{id}', () => expect(route('story', 'sy_abc')).toBe('/story/sy_abc'));
  test('actor → /actor/{id}', () => expect(route('actor', '12345')).toBe('/actor/12345'));
  test('perspective → /perspective/{id}', () =>
    expect(route('perspective', 'pp_abc')).toBe('/perspective/pp_abc'));
});
