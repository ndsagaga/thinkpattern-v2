import { useSyncExternalStore } from 'react';

// Selection state for the tablet layouts (FNTabletShell). Single source of truth
// for "which lens is active, which item is open in each lens, and — in single
// view — whether we're browsing or reading". Module-level, not component state,
// so that:
//
//   1. A list tap and an external open (notification tap / universal link) drive
//      the same detail column. On a tablet those external entry points write
//      here instead of pushing a route (see NotificationBridge / the [id]
//      routes); the shell renders whatever is selected.
//   2. Cold launch from a notification comes up already reading the target —
//      the launch handler writes here before the shell mounts, and the shell
//      reads the current value on its first render.
//
// `pane` only matters in single view (11"/mini iPad, 7"/10" Android tablets),
// where the rail sits beside ONE reading column shown one-at-a-time: 'list' to
// browse, 'detail' to read. The split view (13") shows both panes at once and
// ignores it. Ids are stored as strings (actor ids are numeric on the wire;
// callers String() them and the actor pane Number()s back).

export type Lens = 'stories' | 'perspectives' | 'actors';
export type Pane = 'list' | 'detail';

export interface TabletSelection {
  lens: Lens;
  pane: Pane;
  stories: string | null;
  perspectives: string | null;
  actors: string | null;
}

let state: TabletSelection = {
  lens: 'stories',
  pane: 'list',
  stories: null,
  perspectives: null,
  actors: null,
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getTabletSelection(): TabletSelection {
  return state;
}

// Open an item in its lens's detail pane and, in single view, switch to the
// reading column. Makes that lens active.
export function selectDetail(lens: Lens, id: string | null): void {
  if (state.lens === lens && state[lens] === id && state.pane === 'detail') return;
  state = { ...state, lens, pane: 'detail', [lens]: id };
  notify();
}

// Switch the active lens (rail tap on a different lens): browse it from the top.
export function setLens(lens: Lens): void {
  if (state.lens === lens && state.pane === 'list') return;
  state = { ...state, lens, pane: 'list' };
  notify();
}

// Single view: return from the reading column to the browse column (the back
// affordance, and a re-tap of the active rail lens). No-op in split view.
export function showList(): void {
  if (state.pane === 'list') return;
  state = { ...state, pane: 'list' };
  notify();
}

export function useTabletSelection(): TabletSelection {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getTabletSelection,
    getTabletSelection,
  );
}
