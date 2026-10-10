jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPersistentStore } from './persistentStore';

const flush = () => new Promise((r) => setImmediate(r));

describe('createPersistentStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('hydrates from disk and notifies subscribers', async () => {
    await AsyncStorage.setItem('k', JSON.stringify({ n: 7 }));
    const store = createPersistentStore('k', { n: 0 });
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.get().n));
    await store.ready;
    expect(store.get().n).toBe(7);
    expect(seen).toContain(7);
  });

  it('persists writes through to disk', async () => {
    const store = createPersistentStore<number>('k', 0);
    await store.ready;
    store.set(42);
    await flush();
    const reloaded = createPersistentStore<number>('k', 0);
    await reloaded.ready;
    expect(reloaded.get()).toBe(42);
  });

  it('supports updater functions', async () => {
    const store = createPersistentStore<number>('k', 1);
    await store.ready;
    store.set((prev) => prev + 1);
    expect(store.get()).toBe(2);
  });

  it('replays a pre-hydration updater on top of the disk value (merge, not clobber)', async () => {
    await AsyncStorage.setItem('k', JSON.stringify([1, 2]));
    const store = createPersistentStore<number[]>('k', []);
    store.set((prev) => [0, ...prev]); // updater, before the disk read resolves
    await store.ready;
    expect(store.get()).toEqual([0, 1, 2]); // folded onto disk, not [0] and not [1, 2]
  });

  it('a plain value set before hydration replaces the disk value', async () => {
    await AsyncStorage.setItem('k', JSON.stringify(5));
    const store = createPersistentStore<number>('k', 0);
    store.set(99); // value → replays as "replace"
    await store.ready;
    expect(store.get()).toBe(99);
  });

  it('persists the merged result of a pre-hydration write', async () => {
    await AsyncStorage.setItem('k', JSON.stringify([1, 2]));
    const store = createPersistentStore<number[]>('k', []);
    store.set((prev) => [0, ...prev]);
    await store.ready;
    await flush();
    const reloaded = createPersistentStore<number[]>('k', []);
    await reloaded.ready;
    expect(reloaded.get()).toEqual([0, 1, 2]);
  });

  it('stops notifying after unsubscribe', async () => {
    const store = createPersistentStore<number>('k', 0);
    await store.ready;
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.set(1);
    off();
    store.set(2);
    expect(calls).toBe(1);
  });
});
