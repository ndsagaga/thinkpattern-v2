import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontFamily, fontSize } from '@/constants/Typography';
import type { PerspectiveDetail, TextSpan, CitationSpan, DefineSpan } from '@/types/contract';
import { buildPerspectiveCtx, type PerspectiveCtx } from './context';
import {
  PCallout,
  PCard,
  PConnection,
  PDivide,
  PInstances,
  PQuote,
  PSourceRail,
  PStat,
  PThenNow,
  PTimeline,
} from './blocks';
import { renderSpans } from './Spans';

type BodyNode = NonNullable<PerspectiveDetail['body_nodes']>[number];

// Dispatch a parsed body node to its renderer. The backend folds unknown/
// unsupported tags into text spans server-side, so the only unknown case here is
// a node TYPE newer than this build — degrade it to its text (strip rule), never
// crash or show raw markup.
function PNode({ node, ctx }: { node: BodyNode; ctx: PerspectiveCtx }) {
  switch (node.type) {
    case 'prose':
      return (
        <Text style={styles.prose}>{renderSpans(node.spans, ctx, { preserveNewlines: true })}</Text>
      );
    case 'quote':
      return <PQuote block={node} ctx={ctx} />;
    case 'stat':
      return <PStat block={node} ctx={ctx} />;
    case 'callout':
      return <PCallout block={node} ctx={ctx} />;
    case 'card':
      return <PCard block={node} ctx={ctx} />;
    case 'divide':
      return <PDivide block={node} ctx={ctx} />;
    case 'timeline':
      return <PTimeline block={node} ctx={ctx} />;
    case 'then_now':
      return <PThenNow block={node} ctx={ctx} />;
    case 'instances':
      return <PInstances block={node} ctx={ctx} />;
    case 'connection':
      return <PConnection block={node} ctx={ctx} />;
    default: {
      // Forward-compat: a node type this build doesn't know. Render any spans it
      // carries as plain prose; otherwise drop it. Never show raw markup.
      const maybe = node as { spans?: (TextSpan | CitationSpan | DefineSpan)[] };
      if (maybe.spans?.length) {
        return (
          <Text style={styles.prose}>{renderSpans(maybe.spans, ctx, { preserveNewlines: true })}</Text>
        );
      }
      return null;
    }
  }
}

// Defensive fallback if body_nodes is ever empty (the contract guarantees ≥1):
// render the raw body string stripped of tags + anchor tokens to plain prose —
// never the parser, never raw markup.
function FallbackProse({ body }: { body: string }) {
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\[[a-z]{2}_[^\]]*\]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!text) return null;
  return <Text style={styles.prose}>{text}</Text>;
}

// Walk body_nodes → renderers, then the auto source rail harvested from
// citations[]. Resolution is inline from this one payload (no second fetch).
export function PerspectiveBody({ perspective }: { perspective: PerspectiveDetail }) {
  const ctx = buildPerspectiveCtx(perspective);
  const nodes = perspective.body_nodes ?? [];
  return (
    <View>
      {nodes.length > 0 ? (
        nodes.map((node, i) => <PNode key={i} node={node} ctx={ctx} />)
      ) : (
        <FallbackProse body={perspective.body} />
      )}
      <PSourceRail ctx={ctx} />
    </View>
  );
}

const styles = StyleSheet.create({
  prose: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.lead, // 17 (TS.lead)
    lineHeight: 27, // ~1.56
    color: colors.ink,
    marginBottom: spacing.lg, // PNode prose — design sp(0, 0, SP.s4)
  },
});
