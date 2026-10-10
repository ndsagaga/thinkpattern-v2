import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import type { Lens } from '@/lib/tabletSelection';
import { FNMark } from './FNMark';
import { FNGearGlyph } from './FNGearGlyph';
import { StoriesGlyph, PerspectivesGlyph, ActorsGlyph } from './TabGlyphs';

// The phone's bottom tab bar, stood up on the left edge for the wide canvas
// (design: TabletRail). Same three lenses, same "gold seat" for the active one
// — but the 3px accent bar runs down the left instead of across the top. Search
// does not live here; it stays a per-lens masthead affordance in the list pane.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → TabletRail.

const LENS_TABS: { id: Lens; label: string }[] = [
  { id: 'stories', label: 'Stories' },
  { id: 'perspectives', label: 'Perspectives' },
  { id: 'actors', label: 'Actors' },
];

function LensGlyph({ id, color, on }: { id: Lens; color: string; on: boolean }) {
  switch (id) {
    case 'stories':
      return <StoriesGlyph color={color} size={20} />;
    case 'perspectives':
      return <PerspectivesGlyph color={color} focused={on} size={20} />;
    case 'actors':
      return <ActorsGlyph color={color} focused={on} size={20} />;
  }
}

export function FNTabletRail({
  active,
  onNav,
}: {
  active: Lens;
  onNav: (lens: Lens) => void;
}) {
  return (
    <View style={styles.rail}>
      <FNMark size={30} />
      <View style={styles.divider} />
      <View style={styles.tabs}>
        {LENS_TABS.map((t) => {
          const on = active === t.id;
          const glyphColor = on ? colors.accent : colors.muted;
          return (
            <Pressable
              key={t.id}
              onPress={() => onNav(t.id)}
              style={[styles.tab, on ? null : styles.tabParked]}
              accessibilityRole="button"
              accessibilityState={on ? { selected: true } : {}}
              accessibilityLabel={t.label}
            >
              {on ? <View style={styles.accentBar} /> : null}
              <View style={styles.glyphSlot}>
                <LensGlyph id={t.id} color={glyphColor} on={on} />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: on ? colors.link : colors.muted,
                    fontFamily: on ? fontFamily.uiBold : fontFamily.uiMedium,
                  },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Link href="/settings" asChild>
        <Pressable
          style={styles.gear}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <FNGearGlyph size={22} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 96,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: colors.ink,
    backgroundColor: colors.paper,
    alignItems: 'center',
    paddingVertical: spacing.xl, // SP.s5 (20)
  },
  divider: {
    height: 1,
    width: 40,
    backgroundColor: colors.rule,
    marginVertical: spacing.xl, // SP.s5 (20)
  },
  tabs: {
    alignSelf: 'stretch',
    gap: spacing.sm, // SP.s2 (8)
  },
  tab: {
    alignItems: 'center',
    gap: spacing.xs, // SP.s1 (4)
    paddingVertical: spacing.md, // SP.s3 (12)
    position: 'relative',
  },
  tabParked: { opacity: 0.6 },
  // 3px ochre bar down the left edge of the active tab (rail analogue of the
  // bottom bar's top accent bar). Spans the full tab button — icon AND label —
  // not just the glyph.
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.accent,
  },
  glyphSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.micro,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gear: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
