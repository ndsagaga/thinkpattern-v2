import * as Sentry from '@sentry/react-native';

import { track, screen } from './analytics';

// Typed user-action events. Single emit() call fires both:
//   - PostHog `track()` for product analytics (funnel, engagement, outcome rates)
//   - Sentry breadcrumb for crash context (the trail of actions leading to an error)
//
// Naming convention: snake_case, present tense, action_object form. Keep the
// enum closed so typos are caught at compile time. Add new events here first;
// every site that wants to track something imports from this file.
//
// Privacy: declared in app.json NSPrivacyCollectedDataTypes (ProductInteraction
// + UserID + SearchHistory, all unlinked). The only free text a user types that
// may ride in props is search queries and custom-pill names/keywords — both
// declared as SearchHistory. Nothing else typed, and no PII, belongs here.

export type EventName =
  // Onboarding funnel
  | 'onboarding_completed'
  | 'onboarding_skipped' // { step } — Skip pressed before the last step
  // Card-level feed impressions
  | 'card_impression' // { surface, id, position } — feed row ≥50% visible for 500ms, once per id per screen mount
  // Search
  | 'search_submitted' // { surface, query, query_length, result_count }
  | 'recent_search_selected' // { surface, query } — tapped a term from search history
  // Topic/category filter rail
  | 'filter_selected' // { screen, filter } — filter 'custom' adds { name, keywords }
  // Custom story pills. `name` and `keywords` are reader-typed text (declared
  // as SearchHistory); `match_count` is the feed stories the pill caught on save.
  | 'pill_created' // { name, keywords, keyword_count, match_count }
  | 'pill_edited' // { name, keywords, keyword_count, match_count }
  | 'pill_removed' // { name, keywords }
  | 'pill_limit_hit' // tapped "+" with the rail full
  // Saved / History "Clear" action
  | 'content_cleared' // { surface: saved | history }
  // Perspective audio ("Listen")
  | 'audio_play_started' // { id } — cold start of a track (not resume-from-pause)
  | 'audio_playback_completed' // { id } — reached the end naturally
  | 'audio_speed_changed' // { id, rate }
  // Pull-to-refresh lifecycle
  | 'pull_initiated'
  | 'pull_settled'
  // Notification opt-in funnel (fired once, at the first detail "value moment")
  | 'notification_prompt_shown'
  // { granted, via } — `via` separates the two ways a "no" happens, because
  // they have very different recovery paths: 'skip' ("Not now") never invokes
  // the OS, so the user remains askable later; 'os_prompt' with granted:false
  // means iOS has spent its one-shot dialog and only a trip to system Settings
  // can recover. Without this they are indistinguishable in the funnel.
  | 'notification_permission_settled'
  | 'push_subscribe_settled' // { outcome: subscribed | skipped | failed, error_label? }
  | 'notification_setting_changed' // { on } — Settings toggle flipped
  // Engagement
  | 'detail_opened' // { surface, id, from: notification | search | direct }
  | 'external_link_opened'
  | 'content_shared' // { surface, id } — completed OS share-sheet action
  | 'content_saved' // { surface, id } — user bookmarked an item
  | 'content_unsaved' // { surface, id } — user removed a bookmark
  | 'notification_opened'
  // A notification tap that couldn't reach its target. Two detectable cases:
  //   - malformed_payload: caught here-ish — emitted from NotificationBridge
  //     when the kind/object_id can't resolve to a real route.
  //   - dead_object: the object was demoted/deleted between send and tap; only
  //     discovered at the detail screen, so it surfaces as `not_found_redirect`
  //     with `from: 'notification'` rather than this event.
  | 'notification_open_failed' // { reason: malformed_payload, kind?, object_id? }
  // Reliability surface
  | 'cold_offline_shown'
  | 'error_placeholder_shown'
  | 'not_found_redirect' // { surface, id, from: notification | search | direct }
  | 'stale_brief_shown' // { age_bucket }
  | 'update_required_shown'; // { schema_version }

type EventProps = Record<string, string | string[] | number | boolean | null | undefined>;

export function emit(name: EventName, props?: EventProps): void {
  track(name, props);
  Sentry.addBreadcrumb({
    category: 'app',
    message: name,
    data: props,
    level: 'info',
  });
}

// Screen view — separate from the typed action events. Feeds PostHog's native
// `$screen` analytics (navigation funnels, time-on-screen) plus a Sentry
// navigation breadcrumb so crash reports show the screen the user was on.
// `name` is a route pattern (e.g. 'story_detail'), never a concrete path.
export function trackScreen(name: string): void {
  screen(name);
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: name,
    level: 'info',
  });
}
