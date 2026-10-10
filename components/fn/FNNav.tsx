import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { FNWordmark } from './FNWordmark';
import { FNCap } from './FNCap';
import { FNRuleSoft } from './FNRule';
import { FNSaveButton } from './FNSaveButton';
import { FNShareGlyph } from './FNShareGlyph';
import { colors } from '@/constants/Colors';
import type { ContentRef } from '@/lib/content';
import { fontFamily } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';

type Props = {
  // Centered kicker text. If omitted, derives from `title · lens`.
  kicker?: string;
  title?: string;
  lens?: string;
  // Back arrow visibility. Default true; uses router.back() on press.
  back?: boolean;
  // Right-edge text action. Optional; pass with onActionPress to wire it.
  action?: string;
  onActionPress?: () => void;
  // Right-edge share affordance (the design's nav share icon). When set, renders
  // the share glyph and calls this on tap; takes precedence over `action`.
  onShare?: () => void;
  // Save ribbon, left of share. Set once the detail's data has loaded (it
  // carries the title). Absent during skeleton/error, like onShare.
  saveRef?: ContentRef;
};

// Detail-screen masthead. Wordmark + back on the left, kicker centered,
// action on the right. Below: 1px faint divider. Source:
// design/design_handoff_perspectives/hifi-fieldnotebook.jsx FNNav.
export function FNNav({
  kicker,
  title,
  lens,
  back = true,
  action,
  onActionPress,
  onShare,
  saveRef,
}: Props) {
  const router = useRouter();
  const k = kicker ?? (title && lens ? `${title} · ${lens}` : title);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          {back ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.back}>←</Text>
            </Pressable>
          ) : null}
          <FNWordmark />
        </View>
        {k ? <FNCap style={styles.kicker}>{k}</FNCap> : <View style={styles.kicker} />}
        <View style={styles.rightGroup}>
          {saveRef ? <FNSaveButton item={saveRef} /> : null}
          {onShare ? (
            <Pressable
              onPress={onShare}
              hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Share"
              style={styles.shareBtn}
            >
              <FNShareGlyph size={20} />
            </Pressable>
          ) : action ? (
            onActionPress ? (
              <Pressable
                onPress={onActionPress}
                hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
                accessibilityRole="button"
              >
                <FNCap>{action}</FNCap>
              </Pressable>
            ) : (
              <FNCap>{action}</FNCap>
            )
          ) : null}
        </View>
      </View>
      {/* Soft hairline, inset by the gutter (design: margin 0 SP.s5). */}
      <FNRuleSoft style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 8,
    paddingHorizontal: spacing.gutter,
    paddingBottom: 8, // design: padding sp(SP.s2, SP.s5, SP.s2)
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // SP.s2
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 17, // design TS.lead
    lineHeight: 17,
    color: colors.ink,
  },
  kicker: {
    flex: 1,
    textAlign: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // SP.s2 — matches the design's nav action group
    flexShrink: 0,
  },
  shareBtn: { flexShrink: 0, padding: 4 },
  rule: { marginHorizontal: spacing.gutter }, // inset to match the design's margin 0 SP.s5
});
