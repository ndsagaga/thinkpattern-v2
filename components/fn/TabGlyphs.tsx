import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';

import { colors } from '@/constants/Colors';

type GlyphProps = {
  color: string;
  // True when the tab is the active one. Drives the fill-vs-stroke cue on the
  // accent element (the graph's outer nodes, the person's head) — active fills
  // it; inactive shows it hollow (paper) against the paper tab-bar background.
  focused?: boolean;
  size?: number;
};

export function StoriesGlyph({ color, size = 18 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x={2} y={3} width={12} height={2} fill={color} />
      <Rect x={2} y={7} width={12} height={2} fill={color} />
      <Rect x={2} y={11} width={8} height={2} fill={color} />
    </Svg>
  );
}

export function PerspectivesGlyph({ color, focused = false, size = 18 }: GlyphProps) {
  // Node-and-edges: a central point linked to two others — synthesis across
  // stories, which is what a Perspective is. Outer nodes fill when active,
  // hollow against the paper tab-bar when inactive.
  const outerFill = focused ? color : colors.paper;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Line x1={3} y1={11.5} x2={8} y2={5} stroke={color} strokeWidth={1.3} />
      <Line x1={13} y1={11.5} x2={8} y2={5} stroke={color} strokeWidth={1.3} />
      <Circle cx={8} cy={5} r={2.2} fill={color} />
      <Circle cx={3} cy={11.5} r={1.6} fill={outerFill} stroke={color} strokeWidth={1.3} />
      <Circle cx={13} cy={11.5} r={1.6} fill={outerFill} stroke={color} strokeWidth={1.3} />
    </Svg>
  );
}

export function ActorsGlyph({ color, focused = false, size = 18 }: GlyphProps) {
  // A person — head + shoulders. People (and organizations) are the actors.
  // Both the head circle and the CLOSED shoulders silhouette fill when active,
  // hollow against the paper tab-bar when inactive. Matches the design SSOT
  // (thinkpattern.jsx → TabGlyph 'actors'): head r=2.5 cy=5, a closed Z path
  // for the body, strokeWidth 1.3.
  const fill = focused ? color : colors.paper;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={5} r={2.5} fill={fill} stroke={color} strokeWidth={1.3} />
      <Path
        d="M2.8 13.5 C2.8 10 5.2 8.8 8 8.8 C10.8 8.8 13.2 10 13.2 13.5 Z"
        fill={fill}
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
