jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./events', () => ({ emit: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentRef } from './content';
import { emit } from './events';
import { clearSaved, isSaved, savedReady, toggleSaved } from './saved';

const story: ContentRef = { id: 'sy_1', surface: 'story', title: 'A Story' };
const flush = () => new Promise((r) => setImmediate(r));

describe('saved store', () => {
  beforeEach(async () => {
    await savedReady;
    clearSaved();
    (emit as jest.Mock).mockClear();
  });

  it('toggles membership on and off', () => {
    expect(isSaved('sy_1')).toBe(false);
    toggleSaved(story);
    expect(isSaved('sy_1')).toBe(true);
    toggleSaved(story);
    expect(isSaved('sy_1')).toBe(false);
  });

  it('emits content_saved then content_unsaved with surface + id', () => {
    toggleSaved(story);
    expect(emit).toHaveBeenCalledWith('content_saved', { surface: 'story', id: 'sy_1' });
    toggleSaved(story);
    expect(emit).toHaveBeenCalledWith('content_unsaved', { surface: 'story', id: 'sy_1' });
  });

  it('clearSaved removes everything', () => {
    toggleSaved(story);
    toggleSaved({ id: 'pp_2', surface: 'perspective', title: 'B' });
    clearSaved();
    expect(isSaved('sy_1')).toBe(false);
    expect(isSaved('pp_2')).toBe(false);
  });

  it('persists the saved map to disk', async () => {
    toggleSaved(story);
    await flush();
    const raw = await AsyncStorage.getItem('saved.v1');
    expect(JSON.parse(raw!).sy_1).toMatchObject({
      id: 'sy_1',
      surface: 'story',
      title: 'A Story',
    });
  });
});
