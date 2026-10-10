import { FNRibbon } from './FNRibbon';
import { useIsSaved } from '@/lib/saved';

// Inline saved marker for feed cards — the ochre ribbon appears only when the
// item is already saved. Reactive, so a save/unsave anywhere lights it up (or
// clears it) instantly. Non-interactive: the whole card is the tap target.
// Source: design/ThinkPattern SavedMark.
export function FNSavedMark({ id, size = 13 }: { id: string; size?: number }) {
  if (!useIsSaved(id)) return null;
  return <FNRibbon saved size={size} />;
}
