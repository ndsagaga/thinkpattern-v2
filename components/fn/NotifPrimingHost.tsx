import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { useNotificationOptIn } from '@/hooks/useNotificationOptIn';
import { FNNotifPriming } from './FNNotifPriming';

// Self-gating push opt-in. Mount inside a detail screen once its content has
// loaded (the "value moment" — the user has opened something worth reading). It
// drives useNotificationOptIn and overlays the editorial priming screen when the
// one-time ask is due; otherwise it renders nothing. The OS permission dialog
// fires only from the priming "Turn on notifications" tap (never on mount/skip).
// The opaque paper backing guarantees the overlay covers the detail beneath.
export function NotifPrimingHost() {
  const { showPriming, enable, skip } = useNotificationOptIn();
  if (!showPriming) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <FNNotifPriming onEnable={enable} onSkip={skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.paper },
});
