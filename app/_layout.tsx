import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
  runOnJS,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { BootstrapGate } from '@/components/fn/BootstrapGate';
import { FNOnboardingTour } from '@/components/fn/FNOnboardingTour';
import { FNSplash } from '@/components/fn/FNSplash';
import { SpotlightProvider } from '@/components/fn/spotlight';
import { NotificationBridge } from '@/components/NotificationBridge';
import { ScreenTracker } from '@/components/ScreenTracker';
import { ToastHost } from '@/components/fn/ToastHost';
import { AppDataProvider } from '@/hooks/AppDataProvider';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSizeClass } from '@/hooks/useSizeClass';
import { Sentry, initSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { startNetworkBridge } from '@/lib/network';
import { queryClient, queryPersistOptions } from '@/lib/queryClient';
import { motion } from '@/constants/theme';

initSentry();
initAnalytics();
// Wire device connectivity → TanStack onlineManager before the first query
// runs, so offline pauses queries and reconnect refetches them.
startNetworkBridge();

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_400Regular,
    FrauncesWonkyDisplay: require('@/assets/fonts/Fraunces-Wonky-Display.ttf'),
  });
  const onboarding = useOnboarding();
  const reducedMotion = useReducedMotion();
  // The first-run tour rings phone chrome (bottom tab bar, list rows) that the
  // iPad split view doesn't have, so it only runs at compact width. iPad users
  // meet the app through the split view's lens-aware no-selection prompts.
  const sizeClass = useSizeClass();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Splash is now staged across two gates:
  //   1. Here — wait for fonts + onboarding hydration before mounting the
  //      provider tree at all. Until onboarding is settled we can't decide
  //      whether the first-run tour should overlay, so we hold rather than
  //      flash the app and then pop the tour. (Native splash stays up —
  //      preventAutoHideAsync — across this null render.)
  //   2. FNSplashGate (below) — inside the provider tree, hides the native
  //      splash (handing off to the paper-ground FNSplash overlay), then holds
  //      FNSplash until the TanStack persister finishes rehydrating from
  //      AsyncStorage and cross-dissolves it out. A returning user with cached
  //      data should never see an empty skeleton flash on cold launch; the
  //      animated splash stays up until queries can paint their cached state.
  if (!loaded || onboarding.status === 'loading') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Light-locked: kraft paper is a light ground, so status-bar glyphs are
            dark on every screen. Platform dark mode is disabled via
            app.json userInterfaceStyle:"light". */}
        <StatusBar style="dark" />
        <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
          <BottomSheetModalProvider>
            <ThemeProvider value={DefaultTheme}>
              <AppDataProvider>
                <SpotlightProvider>
                  <NotificationBridge />
                  <ScreenTracker />
                  <BootstrapGate>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        // Detail push/pop transition. Native-stack can't express
                        // the design's `glide` cubic-bezier — accept the platform
                        // curve (FLAG: glide curve not faithful). Reduced-motion
                        // collapses to a fast opacity fade per the motion contract.
                        animation: reducedMotion ? 'fade' : 'slide_from_right',
                        animationDuration: reducedMotion
                          ? motion.duration.reduced
                          : motion.duration.push,
                        // iOS swipe-back. gestureEnabled is the native-stack
                        // default; stated explicitly to guard against config
                        // drift.
                        gestureEnabled: true,
                        // fullScreenGestureEnabled lets the swipe start from
                        // anywhere across the screen, not just the narrow left
                        // edge — more discoverable, and the simulator's
                        // edge-gesture detection is flaky. None of our pushed
                        // screens have horizontal-scroll content, so there's no
                        // scroll-vs-swipe conflict.
                        fullScreenGestureEnabled: true,
                        // But full-screen activation means any rightward drag —
                        // including sloppy/diagonal ones during a vertical
                        // scroll — fires back. gestureResponseDistance restricts
                        // recognition to a 120px band from the left edge: wide
                        // enough to stay discoverable, narrow enough to stop
                        // accidental backs. RNS designed this to pair with
                        // fullScreenGestureEnabled. Tune `end` on device.
                        gestureResponseDistance: { start: 0, end: 120 },
                      }}
                    />
                  </BootstrapGate>
                  {/* Overlays everything so notices show wherever the user
                      lands — e.g. after a dead-object notification tap. */}
                  <ToastHost />
                  {/* First-run coach-mark over the live app. It rings real rows,
                      so it internally waits until every lens has content before
                      it shows anything; fresh/offline installs re-onboard next
                      launch. Sits above the app + toasts. */}
                  {onboarding.status === 'incomplete' && sizeClass === 'compact' ? (
                    <FNOnboardingTour onDone={onboarding.markComplete} />
                  ) : null}
                </SpotlightProvider>
              </AppDataProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
          {/* Animated splash overlay — sits above the entire tree (last child of
              the Query provider so it can read the persister's restore state) and
              cross-dissolves out once the app is ready. Renders nothing once the
              dissolve completes. */}
          <FNSplashGate />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Animated-splash gate. Two seams it owns:
//
//   1. Native splash → FNSplash handoff. Hides the native splash on first mount
//      (FNSplash, paper-ground, is already painted underneath), so there's no
//      white flash at the seam. FLAG: verify on device that FNSplash has painted
//      its first frame before hideAsync resolves — if a flash appears, defer the
//      hide one frame (requestAnimationFrame). The native splash and FNSplash
//      share the paper ground, so even a 1-frame overlap is invisible.
//   2. FNSplash → app handoff. The persister's `useIsRestoring` is the readiness
//      signal (fonts are already loaded — we're mounted past that gate). Once
//      restore finishes, cross-dissolve the overlay out over motion.duration.dissolve
//      and unmount it. Reduced-motion collapses to a fast opacity fade.
//
// Must live inside PersistQueryClientProvider — useIsRestoring is a Query hook.
function FNSplashGate() {
  const isRestoring = useIsRestoring();
  const reducedMotion = useReducedMotion();
  // Once the dissolve has run we stop rendering the overlay entirely.
  const [mounted, setMounted] = useState(true);
  const opacity = useSharedValue(1);

  // Native splash → FNSplash: hide the native layer as soon as the overlay
  // mounts (FNSplash is painted beneath it; both are paper, so no flash).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // FNSplash → app: dissolve out once the persister has rehydrated.
  useEffect(() => {
    if (isRestoring) return;
    const done = () => setMounted(false);
    opacity.value = withTiming(
      0,
      {
        duration: reducedMotion ? motion.duration.reduced : motion.duration.dissolve,
        easing: Easing.bezier(...motion.curve.dissolveEase),
      },
      (finished) => {
        if (finished) runOnJS(done)();
      },
    );
  }, [isRestoring, reducedMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!mounted) return null;
  return (
    <Animated.View
      pointerEvents={isRestoring ? 'auto' : 'none'}
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        style,
      ]}
    >
      <FNSplash />
    </Animated.View>
  );
}

export default Sentry.wrap(RootLayout);
