import { useState } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { FNBrokenSrcImg } from './FNBrokenSrcImg';

// Five tinted gradient placeholders, rotated by index. Source:
// design/design_handoff_perspectives/hifi-fieldnotebook.jsx FN_SRC_TINTS.
const TINTS: ReadonlyArray<readonly [string, string]> = [
  ['#6a7d6a', '#3e4f44'], // tealish
  ['#b87a4a', '#6a3a1f'], // warm
  ['#4a5a78', '#232c3e'], // cool
  ['#8a7a64', '#4d4438'], // dim
  ['#a89a7e', '#6a5e48'], // kraft
];

type Props = {
  tint?: number;
  imageUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  // Pass true for slots <70px wide so the broken-state fallback drops
  // the "IMAGE / UNREACHABLE" caps and centers the `!` instead.
  compact?: boolean;
};

// Source-image swatch: real image when imageUrl is provided, else a tinted
// 135° gradient placeholder. On image load failure, swaps to FNBrokenSrcImg
// (per design FNBrokenImages spec) so a 404'd article image reads as a
// deliberate "unreachable" state, not a silent blank.
//
// expo-image gives us memory + disk cache and off-thread decoding —
// addresses the scroll-jank + cold-start refetch cost of stock RN <Image>.
export function FNSrcImg({ tint = 0, imageUrl, style, compact = false }: Props) {
  const [errored, setErrored] = useState(false);

  if (imageUrl && !errored) {
    return (
      <Image
        source={imageUrl}
        style={style as StyleProp<ImageStyle>}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        onError={() => setErrored(true)}
      />
    );
  }

  if (errored) {
    return <FNBrokenSrcImg style={style} compact={compact} />;
  }

  const [from, to] = TINTS[tint % TINTS.length];
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    />
  );
}
