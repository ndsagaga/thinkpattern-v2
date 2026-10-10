// Typed JSON persistence over AsyncStorage with graceful degradation: a failed
// read returns the fallback, a failed write is dropped — both captured to
// Sentry so a storage-full / permissions issue surfaces rather than failing
// silently. Centralises the read/write pattern lib/searchHistory.ts first
// established, so the saved + history stores don't each re-implement it.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Sentry } from './sentry';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn('[kv] read failed', { key, err });
    Sentry.captureException(err, { tags: { surface: 'kv-read', key } });
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[kv] write failed', { key, err });
    Sentry.captureException(err, { tags: { surface: 'kv-write', key } });
  }
}
