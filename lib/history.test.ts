jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentRef } from './content';
import { clearHistory, getHistory, historyReady, logHistory } from './history';

const story: ContentRef = { id: 'sy_1', surface: 'story', title: 'S' };
const persp: ContentRef = { id: 'pp_2', surface: 'perspective', title: 'P' };
const flush = () => new Promise((r) => setImmediate(r));

describe('history store', () => {
  beforeEach(async () => {
    await historyReady;
    clearHistory();
  });

  it('logs newest-first', () => {
    logHistory(story);
    logHistory(persp);
    expect(getHistory().map((r) => r.id)).toEqual(['pp_2', 'sy_1']);
  });

  it('re-opening moves an item to the top without duplicating', () => {
    logHistory(story);
    logHistory(persp);
    logHistory(story);
    expect(getHistory().map((r) => r.id)).toEqual(['sy_1', 'pp_2']);
  });

  it('caps the list at 200, dropping the oldest', () => {
    for (let i = 0; i < 210; i += 1) {
      logHistory({ id: `id_${i}`, surface: 'story', title: `T${i}` });
    }
    const h = getHistory();
    expect(h).toHaveLength(200);
    expect(h[0].id).toBe('id_209'); // newest kept
    expect(h.some((r) => r.id === 'id_0')).toBe(false); // oldest dropped
  });

  it('clearHistory empties the list', () => {
    logHistory(story);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('persists to disk', async () => {
    logHistory(story);
    await flush();
    const raw = await AsyncStorage.getItem('history.v1');
    expect(JSON.parse(raw!)[0]).toMatchObject({ id: 'sy_1', surface: 'story', title: 'S' });
  });
});
