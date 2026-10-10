import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { FNTabBarView, type FNTabBarItem } from './FNTabBarView';

// Live bottom tab bar: adapts react-navigation's tab props to the presentational
// FNTabBarView (the design's "gold seat" styling lives there — the single source
// shared with the onboarding tour, so the two never drift).
//
// `unreadLenses` carries the design's `Tabs badge` prop: the route names of
// lenses with new, unread content. Each rides a single ochre dot on its glyph
// (no count — "something new is in," never "you have 7."). The active lens never
// shows one — entering a lens clears its dot — so an on-tab badge is suppressed
// for the focused route. There is no unread signal in the app yet (backend gap);
// the prop defaults to none, so no dots render until that data is wired.
//
// TODO(B3): no caller passes `unreadLenses`, so `showBadge` is always false and
// the dot never renders. Blocked on the backend exposing a per-lens "new content
// since last visit" signal; once it lands, pass it in from the tabs layout.
type FNTabBarProps = BottomTabBarProps & {
  unreadLenses?: string[];
};

export function FNTabBar({
  state,
  descriptors,
  navigation,
  insets,
  unreadLenses = [],
}: FNTabBarProps) {
  const items: FNTabBarItem[] = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label = (options.tabBarLabel ?? options.title ?? route.name) as string;

    return {
      key: route.key,
      label,
      focused,
      // Unread ochre dot rides this lens's glyph when it has new content AND is
      // not the active tab (entering a lens clears its mark).
      showBadge: !focused && unreadLenses.includes(route.name),
      renderIcon: (color) =>
        options.tabBarIcon
          ? options.tabBarIcon({ focused, color, size: 20 })
          : null,
      accessibilityLabel: options.tabBarAccessibilityLabel ?? label,
      testID: options.tabBarButtonTestID,
      onPress: () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      },
      onLongPress: () => {
        navigation.emit({ type: 'tabLongPress', target: route.key });
      },
    };
  });

  return <FNTabBarView items={items} insetsBottom={insets.bottom} />;
}
