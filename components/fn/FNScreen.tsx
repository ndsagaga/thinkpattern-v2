import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useStaleManifest } from '@/hooks/useStaleManifest';
import { FNStaleBrief } from './FNStaleBrief';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Paper-background screen with top safe-area inset. Bottom is omitted because
// the tab bar handles that.
//
// Shows FNStaleBrief at the top when we're displaying cached manifest data we
// couldn't refresh: the manifest query has data but its latest fetch errored
// or is paused offline (isError / isPaused). `dataUpdatedAt` gives the "last
// fetched X ago" timestamp. When the manifest is fresh, no banner.
//
// (v3.0 also hosted the FNFreshNew "new content available" banner here, driven
// by snapshot rotation. Per-object delivery has no rotation boundary, so the
// banner is gone — freshness is communicated by this stale line + the
// colophon's compile time.)
//
// The "first-install + offline + no cache" case lands on FNColdOffline at the
// route level via BootstrapGate, not here.
export function FNScreen({ children, style }: Props) {
  const { stale, lastFetchedAt } = useStaleManifest();

  return (
    <SafeAreaView edges={['top']} style={[styles.container, style]}>
      {stale ? <FNStaleBrief lastFetchedAt={lastFetchedAt!} /> : null}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
});
