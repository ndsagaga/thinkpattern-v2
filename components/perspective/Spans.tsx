import { Fragment, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { colors } from '@/constants/Colors';
import { fontFamily, fontSize } from '@/constants/Typography';
import { parseInlineMarkdown } from '@/lib/markdown';
import type { CitationSpan, DefineSpan, TextSpan } from '@/types/contract';
import type { PerspectiveCtx } from './context';

type Span = TextSpan | CitationSpan | DefineSpan;

type RenderOpts = {
  // Prose blocks preserve the body's `\n\n` paragraph breaks; inline contexts
  // (block-item prose, stat context, callout) collapse runs of whitespace and
  // drop the stray whitespace-only spans the serializer leaves between children.
  preserveNewlines?: boolean;
  // Bold cut for inline markdown — Inter Tight by default; Fraunces contexts
  // (callout) pass a display bold so emphasis stays in the right typeface.
  boldFamily?: string;
};

const citeHref = (kind: string, id: string): Href =>
  (kind === 'perspective' ? `/perspective/${id}` : `/story/${id}`) as Href;

// Render body spans as inline nodes for a parent <Text>. Text → string,
// citation → footnote marker, define → tap-to-expand gloss.
export function renderSpans(
  spans: Span[] | undefined,
  ctx: PerspectiveCtx,
  opts: RenderOpts = {},
): ReactNode[] {
  const out: ReactNode[] = [];
  (spans ?? []).forEach((span, i) => {
    if (span.kind === 'text') {
      const md = (t: string) =>
        out.push(
          <Fragment key={i}>{parseInlineMarkdown(t, { boldFamily: opts.boldFamily })}</Fragment>,
        );
      if (opts.preserveNewlines) {
        md(span.text);
        return;
      }
      const t = span.text.replace(/\s+/g, ' ');
      if (t.trim() === '') return; // drop whitespace-only spans inline
      md(t);
    } else if (span.kind === 'citation') {
      out.push(<Cite key={i} refs={span.refs} ctx={ctx} />);
    } else if (span.kind === 'define') {
      out.push(<ProseDefine key={i} term={span.term} gloss={span.gloss} />);
    }
  });
  return out;
}

// Footnote marker — the citations[] index, mono + link-gold when the cited
// object is published (tappable to its detail), muted + inert when url is null.
// Inline text can't host a <Link>, so a footnote tap is the sanctioned
// router.push exception (no render context that could carry a Link).
function Cite({ refs, ctx }: { refs: string[]; ctx: PerspectiveCtx }) {
  const router = useRouter();
  return (
    <Text>
      {refs.map((id, i) => {
        const n = ctx.citeNum[id];
        const c = ctx.citeById[id];
        const tappable = !!c?.url;
        return (
          <Text key={id}>
            <Text
              onPress={tappable && c ? () => router.push(citeHref(c.kind, id)) : undefined}
              suppressHighlighting={!tappable}
              style={[styles.cite, tappable ? styles.citeTappable : styles.citeMuted]}
              accessibilityRole={tappable ? 'link' : undefined}
            >
              {n != null ? n : '·'}
            </Text>
            {i < refs.length - 1 ? <Text style={styles.citeMuted}>,</Text> : null}
          </Text>
        );
      })}
    </Text>
  );
}

// Jargon gloss — a dotted-underline term with a small "?"; tap toggles a muted
// inline definition. Self-contained, uncited (no backing wire object).
function ProseDefine({ term, gloss }: { term: string; gloss: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Text>
      <Text onPress={() => setOpen((v) => !v)} style={styles.defineTerm} suppressHighlighting>
        {term}
        <Text style={styles.defineMark}>?</Text>
      </Text>
      {open ? <Text style={styles.defineGloss}> — {parseInlineMarkdown(gloss)}</Text> : null}
    </Text>
  );
}

// Small set-off sub-quote inside a structured block child (camp/step/item/node/
// then-now panel). Ochre em-dash kicker, italic Fraunces, uppercase speaker.
export function MicroQuote({ id, ctx }: { id: string; ctx: PerspectiveCtx }) {
  const q = ctx.quoteById[id];
  if (!q) return null;
  return (
    <View style={styles.microWrap}>
      <Text style={styles.microText}>
        <Text style={styles.microDash}>— </Text>“{q.text}”
      </Text>
      <Text style={styles.microSpeaker}>{q.speaker}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cite: { fontFamily: fontFamily.mono, fontSize: 10.5 },
  // Tappable footnote — link-gold with the underline the design gives tappable
  // citations (borderBottom 1px link in the web target).
  citeTappable: {
    color: colors.link,
    textDecorationLine: 'underline',
    textDecorationColor: colors.link,
  },
  citeMuted: { color: colors.muted, fontFamily: fontFamily.mono, fontSize: 10.5 },
  defineTerm: {
    color: colors.ink,
    fontFamily: fontFamily.uiMedium,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: colors.link,
  },
  defineMark: { color: colors.link, fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.micro },
  defineGloss: {
    color: colors.muted,
    fontFamily: fontFamily.bodyRegular,
    fontStyle: 'italic',
    fontSize: 14.5,
  },
  microWrap: { marginTop: 8 },
  microText: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.detail, // 13 (TS.detail)
    lineHeight: 17, // ~1.34
    color: colors.ink2,
  },
  microDash: { color: colors.accent, fontFamily: fontFamily.displayItalic },
  microSpeaker: {
    marginTop: 2,
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.micro, // 10 (TS.micro)
    letterSpacing: 1.2, // 0.12em at 10px
    textTransform: 'uppercase',
    color: colors.muted,
  },
});
