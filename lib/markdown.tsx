import { Fragment, type ReactNode } from 'react';
import { Text } from 'react-native';

import { fontFamily } from '@/constants/Typography';

// Inline markdown — the app's established vocabulary (matches the old
// FNRichText.parseInline): **bold**, *italic*, _italic_. Emphasis never crosses
// a newline ([^*\n] / [^_\n]), so paragraph breaks in body prose survive. Links,
// headings, and lists are NOT markdown here — object references ship as the
// perspective body's citation/card anchors, not as markdown.

export type InlineSegment = { kind: 'text' | 'bold' | 'italic'; value: string };

// Pure split — bold matched before italic so `**x**` isn't read as two italic
// markers. Exported for unit tests; render via parseInlineMarkdown.
export function splitInline(text: string): InlineSegment[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g);
  const segs: InlineSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (part.length >= 4 && part.startsWith('**') && part.endsWith('**')) {
      segs.push({ kind: 'bold', value: part.slice(2, -2) });
    } else if (part.length >= 3 && part.startsWith('*') && part.endsWith('*')) {
      segs.push({ kind: 'italic', value: part.slice(1, -1) });
    } else if (part.length >= 3 && part.startsWith('_') && part.endsWith('_')) {
      segs.push({ kind: 'italic', value: part.slice(1, -1) });
    } else {
      segs.push({ kind: 'text', value: part });
    }
  }
  return segs;
}

// Render inline markdown to nodes for a parent <Text>. Bold/italic inherit
// size/color/line-height from the parent and only override the typeface. The
// bold cut is context-dependent (Inter Tight body vs Fraunces display), so
// pass `boldFamily` in Fraunces contexts (callout, dek, perspective-card thesis).
// Italic uses `fontStyle` (synthesized), matching the app's existing FNRichText.
export function parseInlineMarkdown(
  text: string,
  opts: { boldFamily?: string } = {},
): ReactNode[] {
  const boldFamily = opts.boldFamily ?? fontFamily.bodySemiBold;
  return splitInline(text).map((seg, i) => {
    if (seg.kind === 'bold') {
      return (
        <Text key={i} style={{ fontFamily: boldFamily }}>
          {seg.value}
        </Text>
      );
    }
    if (seg.kind === 'italic') {
      return (
        <Text key={i} style={{ fontStyle: 'italic' }}>
          {seg.value}
        </Text>
      );
    }
    return <Fragment key={i}>{seg.value}</Fragment>;
  });
}
