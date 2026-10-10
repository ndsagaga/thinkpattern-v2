import { forwardRef, useImperativeHandle, useRef } from 'react';

import { FNEmptyToday } from '@/components/fn/FNEmptyToday';
import { FNPills } from '@/components/fn/FNPills';
import { FNPillSheet, type FNPillSheetHandle } from '@/components/fn/FNPillSheet';
import type { StoryFilter } from '@/hooks/useStoryFilter';
import { PILL_LIMITS, type CustomPill } from '@/lib/customPills';
import { emit } from '@/lib/events';
import { showToast } from '@/lib/toast';
import type { StoryIndexEntry } from '@/types/contract';

export type StoryFilterRailHandle = { editPill: (pill: CustomPill) => void };

type Props = {
  filter: StoryFilter;
  // The unfiltered feed — what a pill being edited previews against.
  stories: StoryIndexEntry[];
};

// The Stories pill rail plus the custom-pill editor it opens. Shared by the
// phone tab and the tablet list pane. The handle lets the filter's empty state
// open the editor too ("Edit pill").
export const StoryFilterRail = forwardRef<StoryFilterRailHandle, Props>(function StoryFilterRail(
  { filter, stories },
  ref,
) {
  const sheetRef = useRef<FNPillSheetHandle>(null);

  useImperativeHandle(ref, () => ({ editPill: (pill) => sheetRef.current?.openEdit(pill) }));

  const onAdd = () => {
    if (filter.atPillLimit) {
      emit('pill_limit_hit');
      showToast({ kind: 'notice', message: `${PILL_LIMITS.pills} pills max. Remove one to add another.` });
      return;
    }
    sheetRef.current?.openCreate();
  };

  const onEdit = (key: string) => {
    const pill = filter.customPills.find((p) => p.id === key);
    if (pill) sheetRef.current?.openEdit(pill);
  };

  return (
    <>
      <FNPills
        items={filter.pills}
        active={filter.active}
        onSelect={filter.select}
        onEdit={onEdit}
        onAdd={onAdd}
        atLimit={filter.atPillLimit}
      />
      <FNPillSheet ref={sheetRef} stories={stories} onCreated={(pill) => filter.select(pill.id)} />
    </>
  );
});

// The feed's empty state under an active pill; null when no pill narrows it.
export function StoryFilterEmpty({ filter, onEditPill }: { filter: StoryFilter; onEditPill: (pill: CustomPill) => void }) {
  const pill = filter.activeCustomPill;
  if (pill) {
    return (
      <FNEmptyToday
        kicker="Filter result"
        title={`Nothing matches ${pill.name} right now.`}
        body="Pills filter the stories ThinkPattern covers: world, politics, business and technology. Broader words catch more."
        action={{ label: 'Edit pill', onPress: () => onEditPill(pill) }}
      />
    );
  }
  if (filter.activeTopicLabel) {
    return <FNEmptyToday kicker="Filter result" title={`No ${filter.activeTopicLabel} stories today.`} body={undefined} />;
  }
  return null;
}
