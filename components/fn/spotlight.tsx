import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

// Spotlight registry — lets a coach-mark ring an element that lives in a
// different part of the tree (e.g. a row inside a routed tab screen) without
// prop-drilling a ref up to it. A target registers a `measure` fn under an id;
// the coach-mark asks the registry to measure that id on demand (so geometry is
// always live — it survives scroll, layout, and tab switches). Generic and
// reusable for any future tooltip/coach-mark, not onboarding-specific.

export type SpotlightRect = { x: number; y: number; width: number; height: number };
type MeasureFn = () => Promise<SpotlightRect | null>;

type SpotlightApi = {
  register: (id: string, measure: MeasureFn) => () => void;
  measure: (id: string) => Promise<SpotlightRect | null>;
};

const SpotlightContext = createContext<SpotlightApi | null>(null);

export function SpotlightProvider({ children }: { children: ReactNode }) {
  const anchors = useRef(new Map<string, MeasureFn>());
  const api = useMemo<SpotlightApi>(
    () => ({
      register: (id, measure) => {
        anchors.current.set(id, measure);
        // Only delete if still ours — guards against a remount's cleanup
        // clobbering the new mount's registration.
        return () => {
          if (anchors.current.get(id) === measure) anchors.current.delete(id);
        };
      },
      measure: (id) => {
        const fn = anchors.current.get(id);
        return fn ? fn() : Promise.resolve(null);
      },
    }),
    [],
  );
  return <SpotlightContext.Provider value={api}>{children}</SpotlightContext.Provider>;
}

export function useSpotlight(): SpotlightApi {
  const ctx = useContext(SpotlightContext);
  if (!ctx) throw new Error('useSpotlight must be used within a SpotlightProvider');
  return ctx;
}

// measureInWindow → window coordinates. The coach-mark overlay fills the screen
// from the top, so window-Y is directly usable as the ring's Y.
function measureNode(node: View | null): Promise<SpotlightRect | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) =>
      resolve(height > 0 ? { x, y, width, height } : null),
    );
  });
}

// Ref-callback that registers whatever View it's attached to under `id`. Use
// when a target already exposes a ref slot (e.g. StoryListItem's sourcesRef).
export function useSpotlightRef(id: string) {
  const { register } = useSpotlight();
  const node = useRef<View | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback(
    (n: View | null) => {
      node.current = n;
      cleanup.current?.();
      cleanup.current = n ? register(id, () => measureNode(node.current)) : null;
    },
    [id, register],
  );
}

// Wrapper that registers its subtree's outer View under `id`. Use to tag an
// element inline (a list row, the tab bar) without a manual ref.
export function SpotlightAnchor({
  id,
  children,
  style,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useSpotlightRef(id);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
