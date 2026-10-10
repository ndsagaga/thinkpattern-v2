import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, type Href } from 'expo-router';

import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontFamily, fontSize, typography, FRAUNCES_LEADING } from '@/constants/Typography';
import {
  useActorsIndexQuery,
  usePerspectivesIndexQuery,
  useStoriesIndexQuery,
} from '@/data/queries';
import { emit } from '@/lib/events';
import { FNMark } from './FNMark';
import { ONB_ANCHORS } from './onboardingAnchors';
import { useSpotlight, type SpotlightRect } from './spotlight';
import { whenSpotlightReady } from './spotlightReady';

type Props = {
  // Called on Begin/Skip — marks onboarding complete and dismisses the
  // overlay. `step` is the 0-indexed step the user was on when they left.
  onDone: (outcome: 'completed' | 'skipped', step: number) => void;
};

// ── Coach-mark onboarding tour (over the live app) ─────────────────────────
// Walks first-run users through the three lenses by spotlighting the REAL list
// screens: each step routes to the lens's tab, measures a registered anchor
// (SpotlightAnchor in the live screens), dims the app, and rings that element
// with a callout. Because it rings live content, it only runs once every lens
// has rows (gated below) — on a fresh/offline install the app shows its own
// cold-offline/loading states and the tour simply waits for the next launch.

type Lens = 'stories' | 'perspectives' | 'actors';
const TAB_ROUTE: Record<Lens, Href> = {
  stories: '/',
  perspectives: '/perspectives',
  actors: '/actors',
};

type Step = {
  lens: Lens;
  // Which anchor to ring. 'story-identity' is derived (the story row minus its
  // sources block) so step 1 highlights the story, and step 2 the sources.
  // Absent on a `center` step (no ring — a full-dim card).
  target?: { kind: 'anchor'; id: string } | { kind: 'story-identity' };
  // Centered full-dim card with no spotlight (the closing "how it's written"
  // screen). No ring, no arrow, no measurement.
  center?: boolean;
  title: string;
  body?: string;
  // Rendered between title and body (the closing step's diagram).
  media?: ReactNode;
  place?: 'above' | 'below';
  last?: boolean;
  // Wait for the anchor's image to decode before measuring (the Actors row
  // portrait changes the row height as it loads). See spotlightReady.
  waitImage?: boolean;
};

const STEPS: Step[] = [
  {
    lens: 'stories',
    target: { kind: 'story-identity' },
    title: 'One story at a time',
    body: 'Each card gathers a single event the whole press is covering, so you follow the story instead of scrolling a feed.',
  },
  {
    lens: 'stories',
    target: { kind: 'anchor', id: ONB_ANCHORS.storySources },
    title: 'See who’s covering it',
    body: 'Top sources shows which outlets are reporting the story, and when each one published.',
  },
  {
    lens: 'perspectives',
    target: { kind: 'anchor', id: ONB_ANCHORS.perspectiveRow },
    title: 'Columns worth your time',
    body: 'Perspectives are original columns that connect several stories and explain what they add up to.',
  },
  {
    lens: 'actors',
    target: { kind: 'anchor', id: ONB_ANCHORS.actorRow },
    title: 'Follow the key people',
    body: 'Actors tracks where each major figure stands on an issue, and when their position changes.',
    waitImage: true,
  },
  {
    lens: 'stories',
    target: { kind: 'anchor', id: ONB_ANCHORS.tabBar },
    title: 'Three ways to read the day',
    body: 'Switch between Stories, Perspectives and Actors whenever you like.',
    place: 'above',
  },
  {
    lens: 'stories',
    center: true,
    title: 'Written with AI, anchored to facts',
    media: <TourManifesto />,
    last: true,
  },
];

// Spotlight geometry (design values).
const PAD = 6; // vertical padding around the ringed element
const GAP = 14; // callout ↔ spotlight gap
const MARGIN = 16; // callout side margin
const ARROW = 9;
const POLL_TRIES = 30; // ~1.5s at 50ms — enough for a tab to mount + lay out
const POLL_DELAY = 50;
// Upper bound on waiting for an image-dependent anchor to settle (see waitImage
// steps). If the portrait never loads (un-backfilled actor, dead network) the
// poll runs anyway rather than hanging the tour.
const IMAGE_WAIT_TIMEOUT = 1500;

// ink token → rgba, so the scrim tint stays token-driven.
function inkDim(alpha: number): string {
  const h = colors.ink.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
const DIM = inkDim(0.67);
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// Gate: the tour rings live rows, so it only runs once all three lenses have
// content. Until then (first fetch, empty day, offline) it renders nothing and
// the user re-onboards next launch. Kept above the runner so its hooks (which
// drive navigation + measurement) only mount when there's something to show.
export function FNOnboardingTour({ onDone }: Props) {
  const stories = useStoriesIndexQuery();
  const perspectives = usePerspectivesIndexQuery();
  const actors = useActorsIndexQuery();
  const ready = !!(
    stories.data?.length &&
    perspectives.data?.length &&
    actors.data?.length
  );
  if (!ready) return null;
  return <TourRunner onDone={onDone} />;
}

function TourRunner({ onDone }: Props) {
  const { height } = useWindowDimensions();
  const { measure } = useSpotlight();

  // Anchors are measured in window coordinates (measureInWindow) because they
  // live in a different subtree (the tab screens). To ring them, we need those
  // coordinates relative to THIS overlay, so we measure the overlay's own window
  // origin and subtract it. Platform-agnostic by construction: it absorbs the
  // Android edge-to-edge status-bar offset (overlay top sits behind the bar)
  // without a per-OS branch, and is a no-op where origin is (0,0).
  const rootRef = useRef<View>(null);
  const [origin, setOrigin] = useState<{ y: number; h: number } | null>(null);
  const measureOrigin = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0) setOrigin({ y, h });
    });
  }, []);

  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cur = STEPS[i];
  const N = STEPS.length;

  // Route to the step's lens, then poll the anchor until its geometry is STABLE
  // (two consecutive equal reads) before ringing it. Committing on the first
  // read would catch a transient mid-transition / pre-image-layout position (as
  // the Actors portrait did) and never correct. A stale run (user advanced)
  // bails via the cancelled flag.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const step = STEPS[i];
      router.navigate(TAB_ROUTE[step.lens]);
      setRect(null);
      if (!step.target) return; // centered card (closing step): full dim, no ring
      // Image-dependent anchor (Actors portrait): wait for the image to decode
      // so we measure the settled row height, not the pre-image one. Bounded by
      // IMAGE_WAIT_TIMEOUT so a missing/slow image never stalls the tour.
      if (step.waitImage && step.target.kind === 'anchor') {
        await whenSpotlightReady(step.target.id, IMAGE_WAIT_TIMEOUT);
        if (cancelled) return;
      }
      let last: Rect | null = null;
      for (let t = 0; t < POLL_TRIES && !cancelled; t++) {
        const r = await resolveRect(step, measure);
        if (cancelled) return;
        if (r) {
          if (last && Math.abs(last.y - r.y) < 1 && Math.abs(last.h - r.h) < 1) {
            setRect(r); // settled
            return;
          }
          last = r;
        }
        await delay(POLL_DELAY);
      }
      // Never fully settled within budget — show the last read rather than nothing.
      if (last && !cancelled) setRect(last);
    })();
    return () => {
      cancelled = true;
    };
  }, [i, measure]);

  const go = (n: number) => setI(Math.max(0, Math.min(N - 1, n)));
  const next = () => (cur.last ? onDone('completed', i) : go(i + 1));

  // Place the callout on whichever side has more room (a tall element near the
  // top crosses mid-screen but still has more space below — flipping it above
  // would push it off the top). Explicit `place` wins.
  const originY = origin?.y ?? 0;
  const viewH = origin?.h ?? height;
  const spot = rect ? { y: rect.y - originY - PAD, h: rect.h + PAD * 2 } : null;
  const spaceAbove = spot ? spot.y : 0;
  const spaceBelow = spot ? viewH - (spot.y + spot.h) : 0;
  const below = spot
    ? cur.place === 'below' || (cur.place !== 'above' && spaceBelow >= spaceAbove)
    : true;
  const calloutTop = spot ? (below ? spot.y + spot.h + GAP : undefined) : viewH / 2;
  const calloutBottom = spot && !below ? viewH - spot.y + GAP : undefined;

  return (
    // Modal to assistive tech — keep focus within the tour, not the dimmed app.
    <View
      ref={rootRef}
      onLayout={measureOrigin}
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
    >
      {/* Scrim — dim above + below a clear band; tap anywhere to advance. Decor
          to a screen reader; the labelled buttons below are the real controls. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={next} accessible={false}>
        {spot ? (
          <>
            <View style={[styles.dim, { top: 0, height: spot.y }]} />
            <View style={[styles.dim, { top: spot.y + spot.h, bottom: 0 }]} />
            <View style={[styles.ring, { top: spot.y, height: spot.h }]} pointerEvents="none" />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFillObject]} />
        )}
      </Pressable>

      {/* Callout — positioned against the spotlight, or vertically centered on a
          `center` step (flexbox, so no callout-height math). */}
      <View
        style={[
          styles.callout,
          cur.center
            ? styles.calloutCenter
            : [
                calloutTop != null ? { top: calloutTop } : null,
                calloutBottom != null ? { bottom: calloutBottom } : null,
              ],
        ]}
        pointerEvents="box-none"
      >
        {spot ? (
          <View
            style={[
              styles.arrow,
              below ? { top: -ARROW } : { bottom: -ARROW },
              below ? styles.arrowUp : styles.arrowDown,
            ]}
            pointerEvents="none"
          />
        ) : null}
        {/* No-op press swallows taps on the card so they don't advance the scrim. */}
        <Pressable style={styles.card} onPress={() => {}} accessible={false}>
          <Text style={styles.title}>{cur.title}</Text>
          {cur.media}
          {cur.body ? <Text style={styles.body}>{cur.body}</Text> : null}
          <View style={styles.footer}>
            <View style={styles.progress}>
              <Text style={styles.counter}>
                {i + 1}/{N}
              </Text>
              <View style={styles.ticks}>
                {STEPS.map((_, k) => (
                  <View
                    key={k}
                    style={[styles.tick, k === i && styles.tickActive, k < i && styles.tickDone]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.actions}>
              {!cur.last ? (
                <Pressable
                  onPress={() => onDone('skipped', i)}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.textBtn}>Skip</Text>
                </Pressable>
              ) : null}
              {i > 0 ? (
                <Pressable onPress={() => go(i - 1)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.textBtn}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={next}
                style={styles.nextBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={cur.last ? 'Begin' : 'Next'}
              >
                <Text style={styles.nextText}>
                  {cur.last ? 'Begin' : 'Next'} <Text style={styles.nextArrow}>→</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

type Rect = { y: number; h: number };

// Resolve a step to a ring rect via the spotlight registry. 'story-identity' is
// the story row minus its sources block (card top → sources top), so step 1
// rings the story and step 2 the sources — and the tall source list never
// forces the callout off-screen.
async function resolveRect(
  step: Step,
  measure: (id: string) => Promise<SpotlightRect | null>,
): Promise<Rect | null> {
  const { target } = step;
  if (!target) return null; // only called for non-center steps; guards the type
  if (target.kind === 'story-identity') {
    const [card, sources] = await Promise.all([
      measure(ONB_ANCHORS.storyRow),
      measure(ONB_ANCHORS.storySources),
    ]);
    if (!card) return null;
    const bottom = sources ? sources.y : card.y + card.height;
    return { y: card.y, h: bottom - card.y };
  }
  const m = await measure(target.id);
  return m ? { y: m.y, h: m.height } : null;
}

// ── Closing "how it's written" diagram (design Onboarding final step) ────────
// A three-beat storyboard the diagram carries, not prose: real article cards →
// the brief, tested against them → a way to reach us. Small, decorative figures.
function openFeedbackEmail() {
  emit('external_link_opened', { domain: 'mailto' });
  Linking.openURL('mailto:hello@thinkpattern.ai').catch(() => {});
}

function TourManifesto() {
  return (
    <View style={styles.manifesto}>
      <FigRow
        first
        fig={
          <View style={styles.articleStack}>
            <FigArticle tag="AFP" tilt="-3deg" />
            <FigArticle tag="AP" tilt="2deg" overlap />
            <FigArticle tag="BBC" tilt="-1deg" overlap />
          </View>
        }
      >
        Everything you read here is written with AI, grounded in real articles from real outlets.
      </FigRow>
      <FigRow fig={<FigBrief />}>
        Each brief is checked against those sources, so it stays true to what they reported.
      </FigRow>
      <FigRow
        fig={
          <View style={styles.atCircle}>
            <Text style={styles.atGlyph}>@</Text>
          </View>
        }
      >
        <Text style={styles.figText}>
          Spot something off? Tell us —{' '}
          <Text style={styles.email} onPress={openFeedbackEmail}>
            hello@thinkpattern.ai
          </Text>
        </Text>
      </FigRow>
    </View>
  );
}

function FigRow({
  fig,
  children,
  first,
}: {
  fig: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <View style={[styles.figRow, !first && styles.figRowBorder]}>
      <View style={styles.figCol}>{fig}</View>
      {typeof children === 'string' ? <Text style={styles.figText}>{children}</Text> : children}
    </View>
  );
}

function FigArticle({ tag, tilt, overlap }: { tag: string; tilt: string; overlap?: boolean }) {
  return (
    <View
      style={[styles.figArticle, { transform: [{ rotate: tilt }] }, overlap && styles.figArticleOverlap]}
    >
      <Text style={styles.figTag} numberOfLines={1}>
        {tag}
      </Text>
      {(['100%', '72%', '84%'] as const).map((w, k) => (
        <View key={k} style={[styles.figLine, { width: w }]} />
      ))}
    </View>
  );
}

function FigBrief() {
  return (
    <View style={styles.figBrief}>
      <View style={styles.figBriefHead}>
        <FNMark size={8} />
        <View style={styles.figBriefBar} />
      </View>
      {(['100%', '80%', '90%'] as const).map((w, k) => (
        <View key={k} style={[styles.figBriefLine, { width: w }]} />
      ))}
      <View style={styles.figBriefCheck}>
        <Text style={styles.figCheckMark}>✓</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', left: 0, right: 0, backgroundColor: DIM },
  ring: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 2,
    borderColor: colors.accent,
  },

  callout: { position: 'absolute', left: MARGIN, right: MARGIN },
  calloutCenter: { top: 0, bottom: 0, justifyContent: 'center' },

  // Closing-step diagram.
  manifesto: { marginTop: spacing.md },
  figRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  figRowBorder: { borderTopWidth: 1, borderTopColor: colors.faint },
  figCol: { width: 76, alignItems: 'center', justifyContent: 'center' },
  figText: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail,
    lineHeight: 19,
    color: colors.ink2,
  },
  email: { fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.link },
  articleStack: { flexDirection: 'row', alignItems: 'center' },
  figArticle: {
    width: 34,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  figArticleOverlap: { marginLeft: -20 },
  figTag: { fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: colors.muted },
  figLine: { height: 2, backgroundColor: colors.faint, marginTop: 3 },
  figBrief: {
    width: 44,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.ink,
    padding: 4,
  },
  figBriefHead: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  figBriefBar: { height: 3, width: 18, backgroundColor: colors.ink },
  figBriefLine: { height: 2, backgroundColor: inkDim(0.3), marginTop: 3 },
  figBriefCheck: {
    position: 'absolute',
    right: -7,
    top: -7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figCheckMark: { fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: colors.paper },
  atCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atGlyph: { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.ink },
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -ARROW,
    width: ARROW * 2,
    height: ARROW * 2,
    backgroundColor: colors.paper,
    transform: [{ rotate: '45deg' }],
    borderColor: colors.ink,
  },
  arrowUp: { borderTopWidth: 1, borderLeftWidth: 1 },
  arrowDown: { borderBottomWidth: 1, borderRightWidth: 1 },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    // Editorial drop shadow lifting the callout off the dimmed screen.
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.title,
    // FRAUNCES_LEADING clears Fraunces' descender floor (device-verified on
    // Android, the harsher of the two platforms); titles also wrap to two
    // lines here ("Columns worth your time").
    lineHeight: fontSize.title * FRAUNCES_LEADING,
    color: colors.ink,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail,
    lineHeight: 20,
    color: colors.ink2,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counter: {
    ...typography.num,
    fontSize: fontSize.micro,
    color: colors.muted,
  },
  ticks: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tick: { width: 6, height: 4, backgroundColor: colors.faint },
  tickActive: { width: 16, backgroundColor: colors.accent },
  tickDone: { backgroundColor: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  textBtn: {
    fontFamily: fontFamily.uiMedium,
    fontSize: fontSize.detail,
    color: colors.muted,
  },
  nextBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  nextText: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.detail,
    color: colors.paper,
    letterSpacing: 0.13,
  },
  nextArrow: { color: colors.accent },
});
