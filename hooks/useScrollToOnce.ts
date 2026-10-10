import { useCallback, useRef } from 'react';
import type { ScrollView } from 'react-native';

// Scrolls a ScrollView to a section's y the first time that section lays out,
// when `enabled` (e.g. opened from a card's comment button).
export function useScrollToOnce(enabled: boolean | undefined) {
  const ref = useRef<ScrollView>(null);
  const done = useRef(false);
  const scrollTo = useCallback(
    (y: number) => {
      if (!enabled || done.current) return;
      done.current = true;
      requestAnimationFrame(() => ref.current?.scrollTo({ y, animated: true }));
    },
    [enabled],
  );
  return Object.assign(scrollTo, { ref });
}
