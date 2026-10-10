import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

import { FNWordmark } from './FNWordmark';
import { FNGearGlyph } from './FNGearGlyph';
import { FNRuleSoft } from './FNRule';
import { FNSearchGlyph } from './FNSearchGlyph';
import { typography, fontSize, FRAUNCES_LEADING } from '@/constants/Typography';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';

type Props = {
  lens: string; // "Stories", "Perspectives", "Actors"
  // When set, a magnifier sits on the lens H1 and taps into lens-scoped
  // search. Omitted outside the loaded ('data') state — nothing to search.
  onSearch?: () => void;
};

// List-screen masthead: wordmark + dated, lens title (Fraunces wonky, TS.head 30pt).
// Per design: no count, no updated time — that information lives at the
// colophon, not in the masthead of every list.
// Source: design/ThinkPattern/lib/thinkpattern.jsx → Header.
export function FNHeader({ lens, onSearch }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <FNWordmark />
        {/* Gear sits top-right by the wordmark (design). No date kicker — the
            design masthead carries none, and staleness is already surfaced by
            FNScreen's FNStaleBrief banner. */}
        <Link href="/settings" asChild>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gearBtn}
          >
            <FNGearGlyph size={22} />
          </Pressable>
        </Link>
      </View>
      {/* Soft hairline below the wordmark row, inset by the gutter (design:
          the rule sits inside the masthead's SP.s5 padding). No elevation. */}
      <FNRuleSoft style={styles.rule} />
      <View style={styles.lensRow}>
        <Text style={styles.lens} accessibilityRole="header">
          {lens}
        </Text>
        {onSearch ? (
          <Pressable
            onPress={onSearch}
            accessibilityRole="button"
            accessibilityLabel={`Search ${lens}`}
            hitSlop={12}
            style={styles.searchBtn}
          >
            <FNSearchGlyph size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
  },
  // Break the gutter so the hairline spans edge to edge. It sits between the
  // logo row and the lens title; topRow.paddingBottom and lensRow.marginTop
  // supply the air above and below.
  rule: {
    marginTop: spacing.md, // 12 — air under the wordmark row (design: marginTop SP.s3)
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Lens title + optional search magnifier. Vertical rhythm (previously on
  // `lens`) lives here so the row spaces correctly with or without the glyph.
  lensRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md, // 12 (design: sp(SP.s3, 0, SP.s4))
    marginBottom: spacing.lg, // 16
  },
  lens: {
    ...typography.display1,
    color: colors.ink,
    fontSize: fontSize.head, // 30 — design TS.head (was 36)
    lineHeight: fontSize.head * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.54, // -0.018em at 30px
  },
  searchBtn: {
    // Nudge the glyph onto the title's cap line; the 36pt line box otherwise
    // floats it high. Hit target padded to ≥44pt via hitSlop.
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
});
