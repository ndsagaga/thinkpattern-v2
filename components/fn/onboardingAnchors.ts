// Spotlight anchor ids shared between the live list screens (which register the
// targets) and the onboarding tour (which rings them). One source of truth so
// the two sides never drift on a raw string.
export const ONB_ANCHORS = {
  storyRow: 'onb.story',
  storySources: 'onb.storySources',
  perspectiveRow: 'onb.perspective',
  actorRow: 'onb.actor',
  tabBar: 'onb.tabbar',
} as const;
