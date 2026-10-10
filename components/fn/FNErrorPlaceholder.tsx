import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { colors } from '@/constants/Colors';
import { typography, fontFamily, FRAUNCES_LEADING } from '@/constants/Typography';
import { emit } from '@/lib/events';
import type { DiagnosticEntry } from '@/utils/errors';
import { FNRetryButton } from './FNRetryButton';
import { FNRuleSoft } from './FNRule';

type Lens = 'stories' | 'perspectives' | 'actors';

type Props = {
  // 'detail' (default) — a single object failed to fetch (design ErrorDetail:
  //   "Something on our side is misbehaving." + a "← Back to list" companion
  //   supplied by the host). 'list' — the whole lens index came back
  //   unreadable (design ErrorLens: "The brief didn't come through." + a
  //   "Use cached" companion). The variant supplies the per-case default
  //   copy + secondary label; explicit props below still override.
  variant?: 'detail' | 'list';
  // Which lens failed — folds into the 'list' kicker ("Couldn't load stories")
  // and body. Only consulted for the 'list' variant's defaults. Defaults to
  // 'stories'.
  lens?: Lens;
  // Accent-ochre eyebrow caps. e.g. "Couldn't load stories" /
  // "Couldn't load this story". Per design, this is the user-facing
  // identifier for what failed. Optional — the variant + lens supply a
  // default; pass to override.
  kicker?: string;
  // Display heading — the editorial framing. Defaults to the variant's
  // copy. Override with a context-specific heading if the failure has a
  // distinct character.
  title?: string;
  // Serif explanation paragraph. What happened and what the user can
  // do about it. Defaults to the variant's copy; pass surface-specific
  // copy where relevant.
  body?: string;
  // Structured diagnostic key:value pairs rendered in a "For the bug
  // report" block. Build via diagnosticFromError() so the format stays
  // consistent across surfaces.
  diagnostic?: DiagnosticEntry[];
  // Primary action — defaults to "Try again".
  onRetry: () => void;
  retryLabel?: string;
  // Secondary action. The 'detail' variant's companion is the host's
  // router.back() ("← Back to list"); the 'list' variant's is "Use cached"
  // (the host's drop-to-cache handler). Omit to render retry alone.
  onSecondary?: () => void;
  // Defaults to the variant's secondary label ("Use cached" for 'list').
  secondaryLabel?: string;
};

const DETAIL_TITLE = 'Something on our side is misbehaving.';
const DETAIL_BODY =
  "The story is in today's index but we couldn't fetch its source list. The rest of the brief still works — try again, or step back to the list.";

// List-level failure copy per design ErrorLens — the whole lens index came
// back malformed; the other lenses' cached editions still read.
const LIST_TITLE = 'The brief didn’t come through.';
const listKicker = (lens: Lens) => `Couldn’t load ${lens}`;
const listBody = (lens: Lens) =>
  `We reached the server but the ${lens} index came back malformed. Your last cached edition still reads on the other lenses.`;
const LIST_SECONDARY = 'Use cached';

// Editorial error placeholder per design/ThinkPattern ErrorDetail (single
// object) / ErrorLens (whole-lens index). Used when we're online but the
// resource the screen needs failed to fetch. NOT used for offline conditions —
// those route to FNStaleBrief (offline + cached) or FNColdOffline (offline +
// no cache).
//
// Layout (top → bottom):
//   accent kicker · display heading · serif body
//   soft rule
//   "For the bug report" cap + lowercase mono key:value diagnostic
//   spacer
//   primary button (+ optional secondary button on the same row)
export function FNErrorPlaceholder({
  variant = 'detail',
  lens = 'stories',
  kicker,
  title,
  body,
  diagnostic,
  onRetry,
  retryLabel = 'Try again',
  onSecondary,
  secondaryLabel,
}: Props) {
  const isList = variant === 'list';
  const resolvedKicker = kicker ?? (isList ? listKicker(lens) : 'Couldn’t load this story');
  const resolvedTitle = title ?? (isList ? LIST_TITLE : DETAIL_TITLE);
  const resolvedBody = body ?? (isList ? listBody(lens) : DETAIL_BODY);
  const resolvedSecondaryLabel = secondaryLabel ?? (isList ? LIST_SECONDARY : undefined);
  // Surface is the most stable identifier — pull from the diagnostic block
  // (built via diagnosticFromError, which always includes a `surface` entry).
  // Falls back to the kicker text if not present.
  const surface =
    diagnostic?.find((d) => d.label === 'surface')?.value ?? resolvedKicker;
  useEffect(() => {
    emit('error_placeholder_shown', { surface });
  }, [surface]);

  return (
    <ScrollView
      style={styles.scrollFill}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      // Keep ScrollView for accessibility (large Dynamic Type may push
      // content past one screen). Disable bounce so the screen doesn't
      // rubber-band when content fits — pull is not a wired gesture
      // here and the bounce makes it look interactive.
      bounces={false}
      alwaysBounceVertical={false}
    >
      <View style={styles.body}>
        <Text style={[typography.cap, styles.kicker]}>{resolvedKicker}</Text>
        <Text style={styles.title}>{resolvedTitle}</Text>
        <Text style={styles.lede}>{resolvedBody}</Text>

        {diagnostic && diagnostic.length > 0 ? (
          <>
            <FNRuleSoft style={styles.rule} />
            <Text style={[typography.cap, styles.diagKicker]}>For the bug report</Text>
            <View style={styles.diagBlock}>
              {diagnostic.map((entry, i) => (
                <View key={`${entry.label}-${i}`} style={styles.diagRow}>
                  <Text style={styles.diagLabel}>{entry.label}</Text>
                  <Text style={styles.diagValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.actions}>
        {onSecondary && resolvedSecondaryLabel ? (
          <View style={styles.actionsRow}>
            <FNRetryButton
              onPress={onRetry}
              label={retryLabel}
              variant="primary"
              style={styles.actionFlex}
            />
            <FNRetryButton
              onPress={onSecondary}
              label={resolvedSecondaryLabel}
              variant="secondary"
              style={styles.actionFlex}
            />
          </View>
        ) : (
          <FNRetryButton onPress={onRetry} label={retryLabel} variant="primary" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ScrollView itself fills the parent; without flex:1 it'd auto-size to
  // content and the button could float instead of sitting at the bottom.
  scrollFill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
  },
  body: {
    flex: 1,
  },
  kicker: {
    color: colors.accent,
  },
  // 24pt display per design FNErrorDetail. Smaller than FNColdOffline's
  // 30pt — list/detail errors are less catastrophic than "can't reach the
  // brief at all" so the headline is right-sized.
  title: {
    fontFamily: fontFamily.displayPlain,
    fontSize: 24,
    lineHeight: 24 * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.43, // -0.018em at 24px
    color: colors.ink,
    marginTop: 10,
  },
  lede: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14.5,
    lineHeight: 22, // 1.55
    color: colors.ink2,
    marginTop: 12,
  },
  rule: {
    marginTop: 22,
  },
  diagKicker: {
    marginTop: 14,
    color: colors.muted,
  },
  diagBlock: {
    marginTop: 8,
  },
  // Two-column row: label gets a fixed width so values line up.
  // Mono throughout, lowercase per design (no textTransform).
  diagRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  diagLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 11.5,
    lineHeight: 20,
    color: colors.muted,
    width: 90,
  },
  diagValue: {
    flex: 1,
    fontFamily: fontFamily.mono,
    fontSize: 11.5,
    lineHeight: 20,
    color: colors.ink2,
  },
  actions: {
    marginTop: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionFlex: {
    flex: 1,
  },
});
