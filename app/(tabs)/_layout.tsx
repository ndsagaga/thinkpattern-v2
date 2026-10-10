import { Tabs } from 'expo-router';

import { FNTabBar } from '@/components/fn/FNTabBar';
import { FNTabletShell } from '@/components/fn/FNTabletShell';
import { ONB_ANCHORS } from '@/components/fn/onboardingAnchors';
import { SpotlightAnchor } from '@/components/fn/spotlight';
import {
  StoriesGlyph,
  PerspectivesGlyph,
  ActorsGlyph,
} from '@/components/fn/TabGlyphs';
import { useSizeClass } from '@/hooks/useSizeClass';

// Custom tab bar handles all of the active-state styling (ochre accent
// line, ochre glyph, weight-600 label) — design needs more visual
// differentiation between active and inactive than the framework's
// tabBarActiveTintColor / tabBarLabelStyle slots can express. See
// components/fn/FNTabBar.tsx.
export default function TabLayout() {
  // Tablets swap the whole tab UI for the rail-based shell — split (13") or
  // single (smaller tablets); phones (and narrow multitasking tiles) keep the
  // tabs. The swap is live — rotating or resizing a Split View reflows between
  // tiers. The [id] detail routes still live on the root Stack in every case.
  const sizeClass = useSizeClass();
  if (sizeClass !== 'compact') {
    return <FNTabletShell mode={sizeClass} />;
  }

  return (
    <Tabs
      tabBar={(props) => (
        <SpotlightAnchor id={ONB_ANCHORS.tabBar}>
          <FNTabBar {...props} />
        </SpotlightAnchor>
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stories',
          tabBarIcon: ({ color, size }) => <StoriesGlyph color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perspectives"
        options={{
          title: 'Perspectives',
          tabBarIcon: ({ color, focused, size }) => (
            <PerspectivesGlyph color={color} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="actors"
        options={{
          title: 'Actors',
          tabBarIcon: ({ color, focused, size }) => (
            <ActorsGlyph color={color} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
