import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { typography, fontFamily, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { emit } from '@/lib/events';
import { invalidateAll } from '@/data/queries';
import { FNWordmark } from './FNWordmark';
import { FNRetryButton } from './FNRetryButton';

// Cold-offline page per design hifi-states.jsx FNColdOffline. Takes over the
// entire app surface when there's no usable manifest AND we can't fetch one —
// first install + offline (query paused, no cache), or bootstrap failed after
// retries with nothing cached. The route stack has nothing to show below this.
//
// (v3.0 rendered a per-attempt "What we tried" diagnostic fed by the hand-rolled
// pointer-poll retry loop. TanStack owns retries now and doesn't expose a
// per-attempt timeline; the failure detail goes to Sentry via the query cache's
// onError. Retry re-runs the whole data graph from the manifest down.)
export function FNColdOffline() {
  useEffect(() => {
    emit('cold_offline_shown');
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.wordmarkRow}>
        <FNWordmark />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // Disable bounce so the screen doesn't rubber-band — pull is not a
        // wired gesture here and the bounce makes it look interactive.
        bounces={false}
        alwaysBounceVertical={false}
      >
        <View style={styles.body}>
          <Text style={[typography.cap, styles.kicker]}>Offline · no cached brief</Text>
          <Text style={styles.title}>Can't reach the brief.</Text>
          <Text style={styles.lede}>
            We need a connection to fetch today's brief, and there's nothing
            cached on this device yet.
          </Text>
        </View>

        <View style={styles.footer}>
          <FNRetryButton
            onPress={() => {
              void invalidateAll();
            }}
            label="Try again"
            variant="footer"
          />
        </View>
      </ScrollView>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
  },
  body: {
    flex: 1,
  },
  kicker: {
    color: colors.accent,
  },
  title: {
    fontFamily: fontFamily.displayWonky,
    fontSize: 30,
    lineHeight: 30 * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -0.54, // -0.018em at 30px
    color: colors.ink,
    marginTop: 14,
  },
  lede: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 23, // 1.55
    color: colors.ink2,
    marginTop: 14,
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
});
