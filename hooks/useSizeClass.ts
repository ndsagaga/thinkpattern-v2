import { Dimensions, useWindowDimensions } from 'react-native';

// Layout size class, three tiers (design: App Store tablet frames):
//   split   — 13"-class iPad: rail + list + detail side by side.
//   single  — smaller tablets (11"/mini iPad, 7"/10" Android): rail + ONE
//             centred reading column, one-at-a-time (browse → read).
//   compact — phones: bottom tab bar + stack push.
//
// Tiers key off the device's SHORTEST screen edge (orientation-invariant, so a
// device stays the same tier when rotated), gated by the current WINDOW width so
// a narrow Split View / Stage Manager tile degrades a 13" gracefully split →
// single → compact as the tile shrinks. Reactive via useWindowDimensions.
//
// Edges (pt): 13" iPad 1024×1366 · 11" iPad 834×1194 · iPad mini 744×1133 ·
// 7" Android ~600 · phones ≤ ~440. So ≥1000 is the 13" class and ≥600 is "a
// tablet"; the window floors keep each layout from being cramped.
export type SizeClass = 'split' | 'single' | 'compact';

export const LARGE_DEVICE_MIN_EDGE = 1000; // 13"-class device (iPad 12.9")
export const TABLET_MIN_EDGE = 600; // 7" tablet / iPad mini and up
export const SPLIT_MIN_WIDTH = 1024; // window needs this to run two panes
export const SINGLE_MIN_WIDTH = 600; // window needs this for rail + a column

export function useSizeClass(): SizeClass {
  const { width } = useWindowDimensions();
  const screen = Dimensions.get('screen');
  const minEdge = Math.min(screen.width, screen.height);
  if (minEdge >= LARGE_DEVICE_MIN_EDGE && width >= SPLIT_MIN_WIDTH) return 'split';
  if (minEdge >= TABLET_MIN_EDGE && width >= SINGLE_MIN_WIDTH) return 'single';
  return 'compact';
}
