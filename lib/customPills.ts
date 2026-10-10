// Custom story pills — reader-defined keyword filters for the Stories feed.
// Local-only, on-device, in creation order (the order they sit in the rail).
//
// This module owns the pill model and its limits; matching lives in
// lib/pillMatch.ts. The editor validates input with these helpers before
// saving, so the store trusts what it is given.

import { fold } from './pillMatch';
import { createPersistentStore, usePersistentStore } from './persistentStore';

export interface CustomPill {
  id: string;
  name: string;
  keywords: string[];
  createdAt: number; // epoch ms
}

export type PillDraft = Pick<CustomPill, 'name' | 'keywords'>;

export const PILL_LIMITS = {
  pills: 5,
  keywords: 5,
  keywordChars: 16,
  nameChars: 12,
} as const;

const PILLS_KEY = 'customPills.v1';

const store = createPersistentStore<CustomPill[]>(PILLS_KEY, []);

export const customPillsReady = store.ready;

// A keyword as stored and shown: trimmed, inner whitespace collapsed,
// lowercased. Null if it can never match (no Latin letter or digit once
// folded — the feed is English) or is over the length limit.
export function normalizeKeyword(raw: string): string | null {
  const keyword = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (keyword.length > PILL_LIMITS.keywordChars) return null;
  return /[a-z0-9]/.test(fold(keyword)) ? keyword : null;
}

// The name a pill gets when the reader leaves it blank: its first keyword,
// shortened at a word boundary to fit the pill ("federal reserve" → "federal").
export function defaultPillName(keywords: readonly string[]): string {
  const first = keywords[0] ?? '';
  if (first.length <= PILL_LIMITS.nameChars) return first;
  const cut = first.slice(0, PILL_LIMITS.nameChars + 1).lastIndexOf(' ');
  return (cut > 0 ? first.slice(0, cut) : first.slice(0, PILL_LIMITS.nameChars)).trimEnd();
}

export function isValidDraft({ name, keywords }: PillDraft): boolean {
  return (
    keywords.length > 0 &&
    keywords.length <= PILL_LIMITS.keywords &&
    keywords.every((k) => normalizeKeyword(k) === k) &&
    new Set(keywords).size === keywords.length &&
    name.trim().length > 0 &&
    name.length <= PILL_LIMITS.nameChars
  );
}

export function canAddPill(): boolean {
  return store.get().length < PILL_LIMITS.pills;
}

const newId = () => `cp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Returns the new pill, or null when the rail is already full (e.g. a second
// Save tap racing the first).
export function addPill(draft: PillDraft): CustomPill | null {
  if (!canAddPill()) return null;
  const pill: CustomPill = { ...draft, id: newId(), createdAt: Date.now() };
  // Re-checked inside the updater so a write landing before hydration still
  // can't push the merged list past the limit.
  store.set((prev) => (prev.length < PILL_LIMITS.pills ? [...prev, pill] : prev));
  return pill;
}

export function updatePill(id: string, draft: PillDraft): void {
  store.set((prev) => prev.map((p) => (p.id === id ? { ...p, ...draft } : p)));
}

export function removePill(id: string): void {
  store.set((prev) => prev.filter((p) => p.id !== id));
}

// Reactive list in rail order. The store's array reference is stable between
// writes, so it is safe to return directly.
export function useCustomPills(): CustomPill[] {
  return usePersistentStore(store, (pills) => pills);
}
