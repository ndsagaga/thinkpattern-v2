import { useMemo, useState } from 'react';

import type { FNPillItem } from '@/components/fn/FNPills';
import { PILL_LIMITS, useCustomPills, type CustomPill } from '@/lib/customPills';
import { emit } from '@/lib/events';
import { compilePill, storyMatches } from '@/lib/pillMatch';
import type { StoryIndexEntry } from '@/types/contract';
import type { StoriesUI } from './useStoriesUI';

const ALL = '__ALL__';

export type StoryFilter = {
  // The pill rail: "All", the reader's custom pills, then the topics. Empty
  // outside the 'data' state, so callers render the rail only when non-empty.
  pills: FNPillItem[];
  active: string;
  select: (key: string) => void;
  // The feed narrowed to the active pill ([] outside the 'data' state).
  items: StoryIndexEntry[];
  // Display label of the active topic pill, or null — drives the topic
  // filter-result empty state.
  activeTopicLabel: string | null;
  // The active custom pill, or null — drives the custom-pill empty state.
  activeCustomPill: CustomPill | null;
  customPills: CustomPill[];
  atPillLimit: boolean;
};

// The Stories feed filter, shared by the phone tab and the tablet list pane so
// both render the same rail, narrow the feed the same way, and report the same
// `filter_selected` event.
export function useStoryFilter(ui: StoriesUI): StoryFilter {
  const [selected, setSelected] = useState(ALL);
  const customPills = useCustomPills();

  const categories = ui.kind === 'data' ? ui.categories : undefined;
  const pills = useMemo<FNPillItem[]>(
    () =>
      categories
        ? [
            { key: ALL, label: 'All' },
            ...customPills.map((p) => ({ key: p.id, label: p.name, custom: true })),
            ...categories.map(({ key, label }) => ({ key, label })),
          ]
        : [],
    [categories, customPills],
  );

  // A selection that no longer exists (its custom pill was removed, or its
  // topic dropped out of the manifest) falls back to "All".
  const active = pills.some((p) => p.key === selected) ? selected : ALL;
  const activeCustomPill = customPills.find((p) => p.id === active) ?? null;

  const pattern = useMemo(
    () => (activeCustomPill ? compilePill(activeCustomPill.keywords) : null),
    [activeCustomPill],
  );

  const items = useMemo(() => {
    if (ui.kind !== 'data') return [];
    if (activeCustomPill) return pattern ? ui.items.filter((s) => storyMatches(pattern, s)) : [];
    if (active === ALL) return ui.items;
    return ui.items.filter((s) => s.topic === active);
  }, [ui, active, activeCustomPill, pattern]);

  const select = (key: string) => {
    setSelected(key);
    const custom = customPills.find((p) => p.id === key);
    emit(
      'filter_selected',
      custom
        ? { screen: 'stories', filter: 'custom', name: custom.name, keywords: custom.keywords }
        : { screen: 'stories', filter: key === ALL ? 'all' : key },
    );
  };

  const activeTopicLabel =
    active === ALL || activeCustomPill ? null : (pills.find((p) => p.key === active)?.label ?? null);

  return {
    pills,
    active,
    select,
    items,
    activeTopicLabel,
    activeCustomPill,
    customPills,
    atPillLimit: customPills.length >= PILL_LIMITS.pills,
  };
}
