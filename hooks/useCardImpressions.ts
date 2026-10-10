import { useRef } from 'react';
import type { ViewToken } from 'react-native';

import type { ContentSurface } from '@/lib/content';
import { emit } from '@/lib/events';

// FlatList requires viewabilityConfig/onViewableItemsChanged to keep a stable
// identity across renders (RN warns and can drop callbacks otherwise), so both
// are built once via useRef rather than useCallback/useMemo.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50, minimumViewTime: 500 };

// Fires `card_impression` the first time a feed row crosses 50% visible for
// 500ms, once per id for the lifetime of the screen (a re-scroll past an
// already-seen card doesn't re-fire). `getId` is read from a ref so callers
// don't need to memoize it.
export function useCardImpressions<T>(surface: ContentSurface, getId: (item: T) => string) {
  const seen = useRef(new Set<string>());
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
      for (const token of viewableItems) {
        if (token.item == null) continue;
        const id = getIdRef.current(token.item);
        if (seen.current.has(id)) continue;
        seen.current.add(id);
        emit('card_impression', { surface, id, position: token.index ?? undefined });
      }
    },
  ).current;

  const viewabilityConfig = useRef(VIEWABILITY_CONFIG).current;

  return { onViewableItemsChanged, viewabilityConfig };
}
