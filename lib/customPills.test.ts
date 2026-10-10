jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PILL_LIMITS,
  addPill,
  canAddPill,
  customPillsReady,
  defaultPillName,
  isValidDraft,
  normalizeKeyword,
  removePill,
  updatePill,
  type CustomPill,
} from './customPills';

const flush = () => new Promise((r) => setImmediate(r));
const draft = (name: string, ...keywords: string[]) => ({ name, keywords });

describe('normalizeKeyword', () => {
  test('trims, collapses whitespace and lowercases', () => {
    expect(normalizeKeyword('  Trade   War ')).toBe('trade war');
  });

  test('rejects keywords that can never match', () => {
    expect(normalizeKeyword('   ')).toBeNull();
    expect(normalizeKeyword('—')).toBeNull();
    expect(normalizeKeyword('北京')).toBeNull();
  });

  test('keeps accented Latin keywords', () => {
    expect(normalizeKeyword('São Paulo')).toBe('são paulo');
  });

  test('enforces the per-keyword length limit', () => {
    expect(normalizeKeyword('a'.repeat(PILL_LIMITS.keywordChars))).not.toBeNull();
    expect(normalizeKeyword('a'.repeat(PILL_LIMITS.keywordChars + 1))).toBeNull();
  });
});

describe('defaultPillName', () => {
  test('is the first keyword when it fits', () => {
    expect(defaultPillName(['tariff', 'trade war'])).toBe('tariff');
  });

  test('shortens at a word boundary when the keyword is too long', () => {
    expect(defaultPillName(['federal reserve'])).toBe('federal');
  });

  test('hard-cuts a single long word', () => {
    expect(defaultPillName(['decarbonisation'])).toBe('decarbonisat');
  });
});

describe('isValidDraft', () => {
  test('accepts a normal draft', () => {
    expect(isValidDraft(draft('Tariffs', 'tariff', 'trade war'))).toBe(true);
  });

  test('rejects no keywords, too many, duplicates, and unnormalized ones', () => {
    expect(isValidDraft(draft('X'))).toBe(false);
    expect(isValidDraft(draft('X', 'a', 'b', 'c', 'd', 'e', 'f'))).toBe(false);
    expect(isValidDraft(draft('X', 'tariff', 'tariff'))).toBe(false);
    expect(isValidDraft(draft('X', 'Tariff'))).toBe(false);
  });

  test('rejects a blank or over-long name', () => {
    expect(isValidDraft(draft('  ', 'tariff'))).toBe(false);
    expect(isValidDraft(draft('x'.repeat(PILL_LIMITS.nameChars + 1), 'tariff'))).toBe(false);
  });
});

describe('custom pills store', () => {
  // Observed through what the store writes to disk — the same data a relaunch
  // hydrates from.
  const saved = async (): Promise<CustomPill[]> => {
    await flush();
    return JSON.parse((await AsyncStorage.getItem('customPills.v1')) ?? '[]');
  };

  beforeEach(async () => {
    await customPillsReady;
    for (const p of await saved()) removePill(p.id);
  });

  test('adds pills in creation order', async () => {
    addPill(draft('Tariffs', 'tariff'));
    addPill(draft('India', 'india'));
    expect((await saved()).map((p) => p.name)).toEqual(['Tariffs', 'India']);
  });

  test('refuses a pill past the limit', async () => {
    for (let i = 0; i < PILL_LIMITS.pills; i++) addPill(draft(`P${i}`, `k${i}`));
    expect(canAddPill()).toBe(false);
    expect(addPill(draft('Extra', 'extra'))).toBeNull();
    expect(await saved()).toHaveLength(PILL_LIMITS.pills);
  });

  test('updates in place, keeping id and position', async () => {
    const first = addPill(draft('Tariffs', 'tariff'))!;
    addPill(draft('India', 'india'));
    updatePill(first.id, draft('Trade', 'tariff', 'customs'));
    const pills = await saved();
    expect(pills[0]).toMatchObject({ id: first.id, name: 'Trade', keywords: ['tariff', 'customs'] });
    expect(pills[1].name).toBe('India');
  });

  test('removes by id', async () => {
    const pill = addPill(draft('Tariffs', 'tariff'))!;
    removePill(pill.id);
    expect(await saved()).toEqual([]);
  });
});
