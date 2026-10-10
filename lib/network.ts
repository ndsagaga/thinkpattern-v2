import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// Bridges device connectivity (NetInfo) into TanStack Query's onlineManager.
// This is the single piece of network plumbing the per-object model needs:
//   - `networkMode: 'online'` (queryClient.ts) uses it to PAUSE queries while
//     offline instead of erroring.
//   - `refetchOnReconnect: true` uses the offline→online transition to refetch
//     stale queries when the connection returns.
//
// v3.0 had a custom poll-trigger pub/sub here feeding SnapshotProvider's
// `current.json` poll (system/user sources, AppState foreground, etc.). The
// per-object model has no version machine, so connectivity flows straight into
// Query's native online tracking. We deliberately do NOT wire focusManager:
// lists stay frozen on app-foreground and refresh only on pull / tab-mount /
// reconnect (see per_object_export_plan.md §IX.8 — "frozen until pull").

function isOnline(state: NetInfoState): boolean {
  // isInternetReachable is null while NetInfo is still probing — treat unknown
  // as online so we don't spuriously pause on a real connection. Only an
  // explicit `false` (probe failed) counts as offline.
  return state.isConnected === true && state.isInternetReachable !== false;
}

let installed = false;

// Call once at app startup (before the first query runs). Idempotent.
export function startNetworkBridge(): void {
  if (installed) return;
  installed = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnline(state))),
  );
}
