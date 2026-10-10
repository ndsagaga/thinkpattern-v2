// Map a thinkpattern.ai link to its in-app route. Used by the expo-router
// native-intent hook (app/+native-intent.ts) so a Universal Link (iOS) / App
// Link (Android) opens the matching detail screen. Handles the canonical form
// https://thinkpattern.ai/{story|perspective|actor}/{id}, the short
// /s/ · /p/ · /a/ forms, and the legacy /share/{plural}.html?id={id} pages.
// Returns null for anything else, so the caller leaves other deep links (e.g.
// the thinkpattern:// scheme) untouched. Mirrors the kind→route map in
// lib/notifications/routing.ts.

const SURFACE_ROUTE: Record<string, 'story' | 'perspective' | 'actor'> = {
  story: 'story',
  s: 'story',
  perspective: 'perspective',
  p: 'perspective',
  actor: 'actor',
  a: 'actor',
};

const LEGACY_ROUTE: Record<string, 'story' | 'perspective' | 'actor'> = {
  stories: 'story',
  perspectives: 'perspective',
  actors: 'actor',
};

export function shareUrlToRoute(path: string): string | null {
  // `path` may arrive as a full URL or a bare path; match the segment directly
  // rather than lean on RN's incomplete URL/searchParams parsing.

  // Canonical: /{surface}/{id} (+ short /s|p|a/{id}). `story` is tried before
  // `s` by the ordered alternation, so /story/… never falls through to /s/.
  const m = path.match(/(?:^|\/)(story|perspective|actor|s|p|a)\/([^/?#]+)/);
  if (m) {
    const surface = SURFACE_ROUTE[m[1]];
    if (surface) return `/${surface}/${decodeURIComponent(m[2])}`;
  }

  // Legacy in-app share pages: /share/{plural}.html?id={id}.
  const leg = path.match(/\/share\/(stories|perspectives|actors)\.html\?(?:[^#]*&)?id=([^&#]+)/);
  if (leg) {
    const surface = LEGACY_ROUTE[leg[1]];
    if (surface) return `/${surface}/${decodeURIComponent(leg[2])}`;
  }

  return null;
}
