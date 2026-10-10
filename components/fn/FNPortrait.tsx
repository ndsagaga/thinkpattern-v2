import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  FeColorMatrix,
  Filter,
  Image as SvgImage,
  Pattern,
  Rect,
} from 'react-native-svg';

import { colors } from '@/constants/Colors';

export type FNPortraitTreatment =
  | 'duotone-halftone'
  | 'duotone'
  | 'halftone'
  | 'plain'
  | 'none';

// Vertical crop anchor. The three named anchors map to the exact SVG slice
// anchors (top=0%, center=50%, bottom=100%). A bare number 0–100 or a
// `'center NN%'` string requests a fractional vertical position — the design's
// actor crops are `center 22%` (list) / `center 18%` (detail), which the named
// anchors can't express.
export type FNPortraitPosition = 'top' | 'center' | 'bottom' | number | string;

type Props = {
  imageUrl?: string | null;
  treatment?: FNPortraitTreatment;
  // Vertical alignment of the cover-fit crop. Portraits typically frame the
  // head — `top` keeps it in shot when the source is taller than the slot.
  // Accepts the named anchors, a 0–100 number, or a `'center NN%'` string.
  position?: FNPortraitPosition;
  // Halftone dot pitch in CSS px. Smaller = denser. Default 3 per design.
  dotScale?: number;
  style?: StyleProp<ViewStyle>;
  // Fires once the portrait image has decoded (or immediately when there's no
  // image to wait for). The onboarding spotlight uses this to measure the first
  // Actors row only after its portrait has settled the row's layout.
  onLoad?: () => void;
};

// Grayscale (luminance-weighted) combined with contrast(1.12) and
// brightness(0.97) — matches the design's CSS filter chain:
// `grayscale(100%) contrast(1.12) brightness(0.97)`.
// V_new = ((L - 0.5) * 1.12 + 0.5) * 0.97 = 1.0864*L - 0.0582
// where L = 0.299R + 0.587G + 0.114B.
// react-native-svg's FeColorMatrix requires a mutable NumberArray, so the
// const cannot be marked readonly.
const GRAYSCALE_MATRIX: number[] = [
  0.3248, 0.6377, 0.1238, 0, -0.0582,
  0.3248, 0.6377, 0.1238, 0, -0.0582,
  0.3248, 0.6377, 0.1238, 0, -0.0582,
  0,      0,      0,      1,  0,
];

const PRESERVE_ASPECT_RATIO: Record<'top' | 'center' | 'bottom', string> = {
  top: 'xMidYMin slice',
  center: 'xMidYMid slice',
  bottom: 'xMidYMax slice',
};

// Over-scan factor for the numeric/percentage crop. The image is cover-fit into
// a rect K× the frame height (top-anchored), then slid up by the requested
// percentage so 0%→top edge, 100%→bottom edge of the over-scan band. K controls
// how much vertical travel a percentage buys: 1.4 ≈ the cover overflow of a
// typical taller-than-slot portrait, so `center 22%` lands the head as designed.
const OVERSCAN = 1.4;

// Resolve a position prop to a vertical percentage (0–100) when it is numeric or
// a `'center NN%'` string; returns null for the named anchors (which use the
// exact SVG slice path instead). Out-of-range / unparseable → null (named path).
function toVerticalPercent(position: FNPortraitPosition): number | null {
  if (typeof position === 'number') {
    return position >= 0 && position <= 100 ? position : null;
  }
  if (typeof position === 'string') {
    // `'center 22%'`, `'22%'`, or `'22'` → 22. Named anchors fall through.
    const m = position.match(/(-?\d+(?:\.\d+)?)\s*%?$/);
    if (m) {
      const v = Number(m[1]);
      if (v >= 0 && v <= 100) return v;
    }
  }
  return null;
}

const GRAYSCALE_FILTER_ID = 'fnportrait-grayscale';
const HALFTONE_PATTERN_ID = 'fnportrait-halftone';

// Kraft fallback when no image is available — matches FNSrcImg's neutral
// "no portrait" placeholder so the two components share one silhouette.
const FALLBACK_FROM = '#d8cfbe';
const FALLBACK_TO = '#c2b8a4';

// Editorial portrait treatment: grayscaled image multiplied onto paper, an
// ink wash lifting shadows, and a fine ink-dot halftone on top. Together
// these make a portrait read as printed onto the page rather than pasted on.
// Each layer is independently switchable via `treatment`.
//
// Source: design/Perspectives/design_handoff_perspectives/hifi-fieldnotebook.jsx FNPortrait.
//
// Why two SVG layers + an RN gradient instead of one SVG with composited
// primitives: react-native-svg's filter pipeline supports a single primitive
// per <Filter> reliably across iOS/Android, and `mixBlendMode` is only
// honored at the RN view layer. Splitting the duotone (SVG grayscale → RN
// blended ink wash) and the halftone (SVG pattern in its own multiply layer)
// lets us use the right tool at each step and keeps the result identical
// across platforms.
export function FNPortrait({
  imageUrl,
  treatment = 'duotone-halftone',
  position = 'top',
  dotScale = 3,
  style,
  onLoad,
}: Props) {
  const noImage = !imageUrl || treatment === 'none';

  // No image to decode — the fixed-size fallback IS the final layout, so report
  // "loaded" immediately rather than leaving the onboarding gate to time out.
  useEffect(() => {
    if (noImage) onLoad?.();
  }, [noImage, onLoad]);

  if (noImage) {
    return (
      <LinearGradient
        colors={[FALLBACK_FROM, FALLBACK_TO]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.frame, style]}
      />
    );
  }

  const showDuotone = treatment === 'duotone-halftone' || treatment === 'duotone';
  const showHalftone = treatment === 'duotone-halftone' || treatment === 'halftone';

  // Crop geometry. Named anchors → exact SVG slice (unchanged). A numeric
  // percentage → top-anchored cover over an over-scanned rect, slid up so the
  // requested band sits in the frame (see OVERSCAN). Out-of-range falls back to
  // the named-anchor path, defaulting unknown strings to center.
  const percent = toVerticalPercent(position);
  const imageGeom =
    percent === null
      ? {
          y: '0%',
          height: '100%' as const,
          preserveAspectRatio:
            PRESERVE_ASPECT_RATIO[
              (position === 'top' || position === 'center' || position === 'bottom'
                ? position
                : 'center') as 'top' | 'center' | 'bottom'
            ],
        }
      : {
          // Slide up by the fraction of the over-scan band the percentage asks
          // for: 0%→0, 100%→-(OVERSCAN-1)·100% (reveals the bottom edge).
          y: `${-(percent / 100) * (OVERSCAN - 1) * 100}%`,
          height: `${OVERSCAN * 100}%` as const,
          preserveAspectRatio: 'xMidYMin slice',
        };

  return (
    <View style={[styles.frame, style]} accessible={false}>
      {/* multiplies the grayscaled bitmap into the paper background so the
          portrait reads printed-onto-paper rather than pasted-on. */}
      <Svg
        width="100%"
        height="100%"
        style={[StyleSheet.absoluteFill, { mixBlendMode: 'multiply' as const }]}
      >
        {showDuotone ? (
          <Defs>
            <Filter id={GRAYSCALE_FILTER_ID}>
              <FeColorMatrix type="matrix" values={GRAYSCALE_MATRIX} />
            </Filter>
          </Defs>
        ) : null}
        <SvgImage
          href={imageUrl}
          width="100%"
          y={imageGeom.y}
          height={imageGeom.height}
          preserveAspectRatio={imageGeom.preserveAspectRatio}
          filter={showDuotone ? `url(#${GRAYSCALE_FILTER_ID})` : undefined}
          onLoad={onLoad ? () => onLoad() : undefined}
        />
      </Svg>

      {showDuotone ? (
        <LinearGradient
          colors={[colors.ink, colors.ink2]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.duotoneWash]}
        />
      ) : null}

      {showHalftone ? (
        <View style={[StyleSheet.absoluteFill, styles.halftoneLayer]}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id={HALFTONE_PATTERN_ID}
                width={dotScale}
                height={dotScale}
                patternUnits="userSpaceOnUse"
              >
                <Circle
                  cx={dotScale / 2}
                  cy={dotScale / 2}
                  r={dotScale * 0.23}
                  fill={colors.ink}
                />
              </Pattern>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              fill={`url(#${HALFTONE_PATTERN_ID})`}
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  // Lighten blend keeps midtones in the ink family while shadows stay near
  // pure ink. Paired with the grayscale matrix this lands the image in the
  // FN.ink/FN.paper duotone the design specifies.
  duotoneWash: {
    mixBlendMode: 'lighten',
    opacity: 0.85,
    pointerEvents: 'none',
  },
  // Multiply blend keeps the dots ink-dark on top of the duotone. Opacity
  // tuned to register at thumbnail sizes without crushing detail at hero size.
  halftoneLayer: {
    mixBlendMode: 'multiply',
    opacity: 0.35,
    pointerEvents: 'none',
  },
});
