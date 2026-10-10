import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { typography, fontFamily, fontSize, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { emit } from '@/lib/events';
import { FNWordmark } from './FNWordmark';

type Props = {
  // The unsupported schema_version off the manifest (UnsupportedSchemaError.
  // version), for the analytics impression. May be undefined if the field was
  // missing entirely.
  schemaVersion?: string;
};

// Shown when the manifest's `schema_version` isn't one this build understands
// (UnsupportedSchemaError from data/queries.ts). The backend has shipped a
// breaking export-format change; this client can't safely render it. There's
// no retry — the fix is a newer build — so this is a terminal, informational
// take-over rather than an error-with-action surface.
export function FNUpdateRequired({ schemaVersion }: Props) {
  // One impression per mount (mirrors FNColdOffline / FNErrorPlaceholder).
  useEffect(() => {
    emit('update_required_shown', { schema_version: schemaVersion });
  }, [schemaVersion]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.wordmarkRow}>
        <FNWordmark />
      </View>
      <View style={styles.body}>
        <Text style={[typography.cap, styles.kicker]}>Update required</Text>
        <Text style={styles.title}>Time to update.</Text>
        <Text style={styles.lede}>
          The brief moved to a newer format that this version of the app can't
          read. Update to the latest build to keep reading.
        </Text>

        {/* Spacer pushes the closing line to the foot of the page, per design
            UpdateRequired (flex:1 between the lede and the footer). */}
        <View style={styles.spacer} />
        <Text style={styles.footer}>Update from the App Store to continue.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  wordmarkRow: {
    paddingTop: 8,
    paddingHorizontal: spacing.gutter,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  kicker: {
    color: colors.accent,
  },
  title: {
    fontFamily: fontFamily.displayWonky,
    fontSize: 30,
    lineHeight: 30 * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.54,
    color: colors.ink,
    marginTop: 14,
  },
  lede: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink2,
    marginTop: 14,
  },
  spacer: {
    flex: 1,
  },
  // Closing line per design UpdateRequired: muted sans, top-bordered (faint),
  // SP.s6 above + SP.s4 padding to the rule.
  footer: {
    marginTop: spacing.xxl, // SP.s6 (24)
    paddingTop: spacing.lg, // SP.s4 (16)
    borderTopWidth: 1,
    borderTopColor: colors.faint,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // TS.detail (13)
    lineHeight: fontSize.detail * 1.5,
    color: colors.muted,
  },
});
