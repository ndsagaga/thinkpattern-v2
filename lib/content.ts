// The three content types the app navigates, and the minimal reference the
// user's local collections (saved items, reading history) keep for each.
//
// `surface` matches the vocabulary already used by analytics events, deep
// links, and the detail routes — one word for "which of the three" — so a ref
// drops straight into emit('…', { surface, id }) with no mapping.
export type ContentSurface = 'story' | 'perspective' | 'actor';

export interface ContentRef {
  id: string;
  surface: ContentSurface;
  // Denormalised so a collection row (Saved / History) renders without
  // re-fetching the detail: the title is captured at save/open time.
  title: string;
}

// Human label for a surface — the row eyebrow in Saved / History.
export const SURFACE_LABEL: Record<ContentSurface, string> = {
  story: 'Story',
  perspective: 'Perspective',
  actor: 'Actor',
};
