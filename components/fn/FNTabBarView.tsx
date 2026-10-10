import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';

// One tab as the view understands it — free of navigation concepts. `renderIcon`
// receives the resolved glyph colour (ochre when focused, muted when parked) so
// the caller stays agnostic about the active-state palette.
export type FNTabBarItem = {
  key: string;
  label: string;
  focused: boolean;
  renderIcon: (color: string) => ReactNode;
  showBadge?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

// Presentational bottom tab bar — the single source of the design's "gold seat"
// styling (ochre glyph + 3px accent bar + `link` label when focused; 0.55-opacity
// recede when parked). Both the live navigation bar (FNTabBar) and the onboarding
// tour render through this, so the two never drift.
//
//   inactive → glyph + label muted (Inter Tight 500), whole tab at 0.55 opacity
//   active   → ochre glyph + 3px top bar; label in `link` gold, Inter Tight 700
export function FNTabBarView({
  items,
  insetsBottom,
}: {
  items: FNTabBarItem[];
  insetsBottom: number;
}) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(0, insetsBottom - 8) }]}>
      {items.map((item) => {
        // Active glyph + top bar use ochre `accent` (the "now" semantic); the
        // active label uses `link` (the AA-safe gold) per the design SSOT.
        const glyphColor = item.focused ? colors.accent : colors.muted;
        const labelColor = item.focused ? colors.link : colors.muted;
        const labelFont = item.focused ? fontFamily.uiBold : fontFamily.uiMedium;
        return (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            onLongPress={item.onLongPress}
            style={[styles.tab, item.focused ? null : styles.tabParked]}
            accessibilityRole="button"
            accessibilityState={item.focused ? { selected: true } : {}}
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            testID={item.testID}
          >
            {item.focused ? <View style={styles.accentBar} /> : null}
            <View style={styles.glyphSlot}>
              {item.renderIcon(glyphColor)}
              {item.showBadge ? (
                <View style={styles.badge} accessibilityLabel="Unread" />
              ) : null}
            </View>
            <Text style={[styles.label, { color: labelColor, fontFamily: labelFont }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderTopColor: colors.ink,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    // Per design: padding sp(SP.s6, 0, SP.s2) — 24px top / 8px bottom; the
    // safe-area inset is reserved below via the bar's paddingBottom. gap 8px
    // (SP.s2) between glyph slot and label.
    paddingTop: 24,
    paddingBottom: 8,
    gap: 8,
    position: 'relative',
  },
  // Parked (unfocused) lenses recede to 55% opacity — the fade carries the
  // unfocus, no fill/underline needed.
  tabParked: {
    opacity: 0.55,
  },
  // 3px ochre line at the very top of the active tab — the strongest "you are
  // here" cue. Absolute so it sits flush against the bar's top border.
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
  },
  glyphSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Unread mark — a single ochre dot, no count (design NotifBadgeSpec). RN has
  // no box-shadow ring, so the ring is a 2px paper border and the disc grows to
  // 11px to keep the ochre core ~7px. Sits at the glyph's top-right.
  badge: {
    position: 'absolute',
    top: -2,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  label: {
    fontSize: fontSize.detail, // 13 — design TS.detail
  },
});
