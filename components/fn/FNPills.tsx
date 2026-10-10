import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';
import { typography } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

// `custom` marks a reader-made pill: rendered split, with an edit target.
export type FNPillItem = { key: string; label: string; custom?: boolean };

type Props = {
  items: FNPillItem[];
  active: string;
  onSelect: (key: string) => void;
  // Custom pills' edit target. Required for `custom` items to be editable.
  onEdit?: (key: string) => void;
  // When set, a "+" is pinned outside the scroll, behind a hairline. At the
  // limit it recedes but stays tappable, so the tap can explain the limit.
  onAdd?: () => void;
  atLimit?: boolean;
};

// Horizontal-scrolling category chips. Right-edge 28px fade hints at scroll.
// Visual pill is ~24pt tall; tap target extended to 44pt via hitSlop per a11y §2.1.
// Source: design/ThinkPattern lib/thinkpattern.jsx `Pills` / `CustomPill` / `AddPill`.
export function FNPills({ items, active, onSelect, onEdit, onAdd, atLimit = false }: Props) {
  const rail = (
    <View style={[styles.railArea, onAdd && styles.railAreaBeforeAdd]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, onAdd && styles.rowBeforeAdd]}
      >
        {items.map((item) =>
          item.custom && onEdit ? (
            <CustomPill
              key={item.key}
              item={item}
              isActive={item.key === active}
              onSelect={onSelect}
              onEdit={onEdit}
            />
          ) : (
            <TopicPill key={item.key} item={item} isActive={item.key === active} onSelect={onSelect} />
          ),
        )}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(239,235,222,0)', colors.paper]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fade, !onAdd && styles.fadeAtScreenEdge]}
      />
    </View>
  );

  if (!onAdd) return <View style={styles.wrap}>{rail}</View>;

  return (
    <View style={[styles.wrap, styles.wrapWithAdd]}>
      {rail}
      <View style={styles.addDivider} />
      <Pressable
        onPress={onAdd}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
        style={({ pressed }) => [styles.pill, styles.addPill, atLimit && styles.addAtLimit, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="New pill"
        accessibilityHint={atLimit ? 'Pill limit reached' : undefined}
      >
        <PlusGlyph />
      </Pressable>
    </View>
  );
}

type PillProps = { item: FNPillItem; isActive: boolean; onSelect: (key: string) => void };

function TopicPill({ item, isActive, onSelect }: PillProps) {
  return (
    <Pressable
      onPress={() => onSelect(item.key)}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      style={[styles.pill, styles.pillPadding, isActive && styles.pillActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
    </Pressable>
  );
}

// A reader-made pill: the topic pill's exact face split by a hairline into two
// targets — the name selects, the pencil edits (selected or not). The pencil is
// the only mark of a custom pill.
function CustomPill({ item, isActive, onSelect, onEdit }: PillProps & { onEdit: (key: string) => void }) {
  const ink = isActive ? colors.paper : colors.ink2;
  return (
    <View style={[styles.pill, styles.split, isActive && styles.pillActive]}>
      <Pressable
        onPress={() => onSelect(item.key)}
        hitSlop={{ top: 10, bottom: 10, left: 4 }}
        style={styles.splitName}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}
      >
        <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
      </Pressable>
      <View style={[styles.splitDivider, isActive && styles.splitDividerActive]} />
      <Pressable
        onPress={() => onEdit(item.key)}
        // Glyph is 10pt; the target spans the pill's full 44pt band and ~32pt wide.
        hitSlop={{ top: 10, bottom: 10, left: 0, right: 4 }}
        style={({ pressed }) => [styles.splitEdit, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label}`}
      >
        <PencilGlyph color={ink} />
      </Pressable>
    </View>
  );
}

function PencilGlyph({ color }: { color: string }) {
  return (
    <Svg width={GLYPH} height={GLYPH} viewBox="0 0 10 10" fill="none">
      <Path
        d="M1.2 8.8l0.5-2.2 5-5a1 1 0 0 1 1.4 0l0.3 0.3a1 1 0 0 1 0 1.4l-5 5z"
        stroke={color}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusGlyph() {
  return (
    <Svg width={GLYPH} height={GLYPH} viewBox="0 0 10 10" fill="none">
      <Path d="M5 0.5v9M0.5 5h9" stroke={colors.ink2} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

const GLYPH = 10;
const PILL_BORDER = 'rgba(31, 26, 20, 0.18)'; // ink @ 18% — matches design's color-mix
const PILL_DIVIDER_ON_INK = 'rgba(239, 235, 222, 0.35)'; // paper @ 35% — design CustomPill

const styles = StyleSheet.create({
  // Full-bleed rail (design: wrap margin -SP.s5). The -gutter bleed under the
  // SP.s8 (32) content padding nets the first pill to ~12 from the screen edge,
  // and lets the rail scroll to both edges.
  // No top pad — the masthead (FNHeader) owns the gap below its divider so
  // the line-to-pills spacing stays uniform with the no-pills (Actors) tab.
  wrap: { marginHorizontal: -spacing.gutter, paddingBottom: 12 },
  // With the pinned "+", the right edge stops bleeding: the "+" sits on the
  // screen gutter like any other trailing control.
  wrapWithAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: 0,
    paddingRight: spacing.gutter,
  },
  railArea: { position: 'relative' },
  railAreaBeforeAdd: { flex: 1, minWidth: 0 },
  row: {
    gap: 8, // SP.s2
    // (design: padding sp(0, SP.s5, SP.s1, SP.s8) over the -gutter bleed)
    paddingLeft: spacing.xxxl, // 32 → nets to ~12 over the bleed
    paddingRight: spacing.gutter, // 20
  },
  // With the pinned "+", the scroll ends at the hairline, not the screen edge.
  rowBeforeAdd: { paddingRight: spacing.sm },
  pill: {
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  pillPadding: {
    paddingHorizontal: 16, // SP.s4
    paddingVertical: 8, // SP.s2 (design: padding sp(SP.s2, SP.s4, SP.s2))
  },
  // Active pill: solid ink backing — monochrome, no brand color. Same padding
  // as inactive; only the fill + border change.
  pillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  split: { flexDirection: 'row', alignItems: 'center' },
  splitName: { paddingLeft: 16, paddingRight: 12, paddingVertical: 8 }, // SP.s4 / s3 / s2
  splitDivider: { width: 1, height: 14, backgroundColor: PILL_BORDER },
  splitDividerActive: { backgroundColor: PILL_DIVIDER_ON_INK },
  splitEdit: { paddingHorizontal: 12, paddingVertical: 9.5 }, // s3; 9.5 centres the 10pt glyph on the 13pt label line
  addPill: { paddingHorizontal: 12, paddingVertical: 9.5 },
  // At the limit the "+" recedes to the parked-tab opacity (FNTabBarView).
  addAtLimit: { opacity: 0.55 },
  addDivider: { width: 1, height: 20, backgroundColor: colors.faint },
  pressed: { opacity: 0.52 }, // design .tp-btn:active
  label: {
    ...typography.cap,
    fontSize: 10, // TS.micro
    letterSpacing: 1.2, // 0.12em at 10px (slightly less than the cap's 0.14em)
    color: colors.ink2,
  },
  labelActive: { color: colors.paper },
  fade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  // Full-bleed rail: the wrap overhangs the screen by the gutter, so the fade
  // is pulled back to sit at the screen edge.
  fadeAtScreenEdge: { right: spacing.gutter },
});
