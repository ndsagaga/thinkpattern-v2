import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';

import { FNCap } from '@/components/fn/FNCap';
import { FNPortrait } from '@/components/fn/FNPortrait';
import { FNSrcImg } from '@/components/fn/FNSrcImg';
import { colors } from '@/constants/Colors';
import { spacing } from '@/constants/Spacing';
import { fontFamily, fontSize, FRAUNCES_LEADING } from '@/constants/Typography';
import { resolveCdnUrl } from '@/lib/config';
import { parseInlineMarkdown } from '@/lib/markdown';
import type {
  CalloutBlock,
  CardBlock,
  Citation,
  ConnectionBlock,
  DivideBlock,
  InstancesBlock,
  PerspectiveCard,
  PerspectiveEntityRef,
  QuoteBlock,
  StatBlock,
  StoryCard,
  TextSpan,
  ThenNowBlock,
  TimelineBlock,
} from '@/types/contract';
import { formatRefDate, type PerspectiveCtx } from './context';
import { MicroQuote, renderSpans } from './Spans';

const initialsOf = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');

// ─── Atoms ─────────────────────────────────────────────────────────────

// <quote display="card|hero"> — the only way a quote appears. Provenance is the
// source STORY (title denormalized on the quote, v5.3); tappable iff published.
export function PQuote({ block, ctx }: { block: QuoteBlock; ctx: PerspectiveCtx }) {
  const q = ctx.quoteById[block.quote_id];
  if (!q) return null;
  const hero = block.display === 'hero';
  const tappable = !!q.source_story_url && !!q.source_story_id;
  const provenance = (
    <View style={hero ? styles.heroProv : styles.cardProv}>
      <Text style={styles.quoteSpeaker}>{q.speaker}</Text>
      {q.source_story_title ? (
        <ProvFrom
          title={q.source_story_title}
          href={tappable ? (`/story/${q.source_story_id}` as Href) : null}
        />
      ) : null}
    </View>
  );
  if (hero) {
    return (
      <View style={styles.hero}>
        <Text style={styles.heroMark}>“</Text>
        <Text style={styles.heroText}>{q.text}</Text>
        {provenance}
      </View>
    );
  }
  return (
    <View style={styles.quoteCard}>
      <Text style={styles.quoteText}>“{q.text}”</Text>
      {provenance}
    </View>
  );
}

function ProvFrom({ title, href }: { title: string; href: Href | null }) {
  const label = (
    <Text style={[styles.quoteFrom, href != null && styles.quoteFromLink]}>from {title}</Text>
  );
  if (!href) return label;
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">{label}</Pressable>
    </Link>
  );
}

// <stat value label>cited context</stat> — one striking figure. value/label are
// opaque author strings; the big numeral is ink (accent stays reserved for now).
export function PStat({ block, ctx }: { block: StatBlock; ctx: PerspectiveCtx }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{block.value}</Text>
      <View style={styles.statBody}>
        <Text style={styles.statLabel}>{block.label}</Text>
        <Text style={styles.statContext}>{renderSpans(block.context, ctx)}</Text>
      </View>
    </View>
  );
}

// <callout> — the "why this matters" beat. Solid ink left-rule, roman Fraunces.
export function PCallout({ block, ctx }: { block: CalloutBlock; ctx: PerspectiveCtx }) {
  return (
    <View style={styles.callout}>
      <Text style={styles.calloutText}>
        {renderSpans(block.spans, ctx, { boldFamily: fontFamily.displayBold })}
      </Text>
    </View>
  );
}

// ─── Cards (the only bordered treatment) ───────────────────────────────

function CardShell({
  tappable,
  href,
  children,
}: {
  tappable: boolean;
  href: Href | null;
  children: ReactNode;
}) {
  const shell = (
    <View style={[styles.cardShell, !tappable && styles.cardShellDegraded]}>{children}</View>
  );
  if (tappable && href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="link">{shell}</Pressable>
      </Link>
    );
  }
  return shell;
}

function PStoryCard({ card }: { card: StoryCard | undefined }) {
  if (!card) return null;
  const tappable = !!card.url;
  // `outlet_count` was retired from the wire (StoryCard, schema 1.0); the story
  // reference card carries no count, so the meta is the date alone. The design's
  // PStoryCard (design/ThinkPattern) now matches — date-only meta, no count.
  const meta = formatRefDate(card.date);
  return (
    <CardShell tappable={tappable} href={tappable ? (`/story/${card.id}` as Href) : null}>
      <View style={styles.cardRow}>
        {card.image_url ? (
          <FNSrcImg tint={0} imageUrl={resolveCdnUrl(card.image_url)} style={styles.cardImg} />
        ) : null}
        <View style={styles.cardMain}>
          <View style={styles.cardKickerRow}>
            <Text style={[styles.cardKicker, tappable ? styles.kickerLink : styles.kickerMuted]}>
              Story
            </Text>
            {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
            {!tappable ? <Text style={styles.cardNYP}>not yet published</Text> : null}
          </View>
          <Text style={styles.cardTitle}>{card.title}</Text>
          {card.summary ? (
            <Text style={styles.cardSummary} numberOfLines={2}>
              {parseInlineMarkdown(card.summary)}
            </Text>
          ) : null}
        </View>
        {tappable ? <Text style={styles.cardArrow}>→</Text> : null}
      </View>
    </CardShell>
  );
}

function PPerspectiveCard({ card }: { card: PerspectiveCard | undefined }) {
  if (!card) return null;
  const tappable = !!card.url;
  return (
    <CardShell tappable={tappable} href={tappable ? (`/perspective/${card.id}` as Href) : null}>
      <View style={styles.cardRow}>
        <View style={styles.cardMain}>
          <View style={[styles.cardKickerRow, styles.cardKickerRowPersp]}>
            <Text style={[styles.cardKicker, tappable ? styles.kickerLink : styles.kickerMuted]}>
              Perspective
            </Text>
            {card.date ? <Text style={styles.cardMeta}>{formatRefDate(card.date)}</Text> : null}
          </View>
          <Text style={styles.cardTitlePersp}>{card.title}</Text>
          <Text style={styles.cardThesis}>
            {parseInlineMarkdown(card.thesis, { boldFamily: fontFamily.displayBold })}
          </Text>
        </View>
        {tappable ? <Text style={styles.cardArrow}>→</Text> : null}
      </View>
    </CardShell>
  );
}

function PActorCard({ entity }: { entity: PerspectiveEntityRef | undefined }) {
  if (!entity) return null;
  const tappable = !!entity.actor_url && entity.actor_id != null;
  const portraitUrl = resolveCdnUrl(entity.thumbnail_url ?? entity.image_url);
  return (
    <CardShell tappable={tappable} href={tappable ? (`/actor/${entity.actor_id}` as Href) : null}>
      <View style={styles.cardRow}>
        {portraitUrl ? (
          <FNPortrait imageUrl={portraitUrl} style={styles.actorPortrait} position="top" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initialsOf(entity.name)}</Text>
          </View>
        )}
        <View style={styles.cardMain}>
          <View style={styles.actorNameRow}>
            <Text style={styles.actorName}>{entity.name}</Text>
            {tappable ? <Text style={styles.actorArrow}>→</Text> : null}
          </View>
          {entity.role ? (
            <Text style={styles.actorRole}>{parseInlineMarkdown(entity.role)}</Text>
          ) : null}
          {entity.summary ? (
            <Text style={styles.actorSummary} numberOfLines={2}>
              {parseInlineMarkdown(entity.summary)}
            </Text>
          ) : null}
        </View>
      </View>
    </CardShell>
  );
}

// Dispatch on the required card_kind: story/perspective resolve in cards[] by id
// (discriminated on kind, not id prefix), actor resolves in entities[] by id.
export function PCard({ block, ctx }: { block: CardBlock; ctx: PerspectiveCtx }) {
  if (block.card_kind === 'actor') return <PActorCard entity={ctx.entById[block.ref]} />;
  if (block.card_kind === 'perspective')
    return <PPerspectiveCard card={ctx.perspectiveCardById[block.ref]} />;
  return <PStoryCard card={ctx.storyCardById[block.ref]} />;
}

// ─── Blocks (set off with whitespace + a hairline) ─────────────────────

// Positional camp accents — no wire signal for camp color, so a calm spread of
// editorial palette tokens (ink, slate, muted, ink2), per design CAMP_TICKS.
const CAMP_TICKS = [colors.ink, colors.slate, colors.muted, colors.ink2];

export function PDivide({ block, ctx }: { block: DivideBlock; ctx: PerspectiveCtx }) {
  return (
    <View style={styles.divide}>
      {block.axis ? <Text style={styles.divideAxis}>{block.axis}</Text> : null}
      <View style={styles.campGrid}>
        {block.camps.map((camp, i) => (
          <View key={i} style={[styles.camp, { borderTopColor: CAMP_TICKS[i % CAMP_TICKS.length] }]}>
            {camp.label ? <Text style={styles.campLabel}>{camp.label}</Text> : null}
            <Text style={styles.campText}>{renderSpans(camp.spans, ctx)}</Text>
            {(camp.quote_ids ?? []).map((qid) => (
              <MicroQuote key={qid} id={qid} ctx={ctx} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function PTimeline({ block, ctx }: { block: TimelineBlock; ctx: PerspectiveCtx }) {
  const escalate = block.emphasis === 'escalation';
  return (
    <View style={styles.timeline}>
      {block.steps.map((step, i) => {
        const last = i === block.steps.length - 1;
        const live = escalate && last;
        // Dot radius ramps per step in escalation mode (the dots grow toward the
        // live node); plain mode is a uniform 4.5px radius.
        const r = escalate ? 4 + i * 1.2 : 4.5;
        return (
          <View key={i} style={styles.tlRow}>
            <Text style={[styles.tlDate, live && styles.tlDateLive]}>
              {formatRefDate(step.date).toUpperCase()}
            </Text>
            <View
              style={[
                styles.tlContent,
                !last && styles.tlContentLine,
                !last && escalate && styles.tlContentLineEsc,
              ]}
            >
              <View
                style={[
                  styles.tlDot,
                  { left: -r - 0.75, width: r * 2, height: r * 2, borderRadius: r },
                  live ? styles.tlDotLive : styles.tlDotDefault,
                ]}
              />
              <Text style={styles.tlText}>{renderSpans(step.spans, ctx)}</Text>
              {(step.quote_ids ?? []).map((qid) => (
                <MicroQuote key={qid} id={qid} ctx={ctx} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function PThenNow({ block, ctx }: { block: ThenNowBlock; ctx: PerspectiveCtx }) {
  return (
    <View style={styles.thenNow}>
      <ThenNowPanel label="Then" item={block.then} color={colors.muted} ctx={ctx} />
      <View style={styles.tnArrowRow}>
        <Text style={styles.tnArrow}>↓</Text>
        <View style={styles.tnArrowLine} />
      </View>
      <ThenNowPanel label="Now" item={block.now} color={colors.accent} ctx={ctx} />
    </View>
  );
}

function ThenNowPanel({
  label,
  item,
  color,
  ctx,
}: {
  label: string;
  item: ThenNowBlock['then'];
  color: string;
  ctx: PerspectiveCtx;
}) {
  return (
    <View style={[styles.tnPanel, { borderLeftColor: color }]}>
      <Text style={[styles.tnLabel, { color }]}>{label}</Text>
      <Text style={styles.tnText}>{renderSpans(item.spans, ctx)}</Text>
      {(item.quote_ids ?? []).map((qid) => (
        <MicroQuote key={qid} id={qid} ctx={ctx} />
      ))}
    </View>
  );
}

export function PInstances({ block, ctx }: { block: InstancesBlock; ctx: PerspectiveCtx }) {
  const portraits = block.arrangement === 'portraits';
  return (
    <View style={styles.instances}>
      <View style={styles.instHead}>
        <Text style={styles.instCount}>{block.items.length}</Text>
        <Text style={styles.instKicker}>{portraits ? 'recurring' : 'instances'}</Text>
      </View>
      {portraits
        ? block.items.map((item, i) => <PortraitRow key={i} item={item} ctx={ctx} />)
        : block.items.map((item, i) => (
            <View key={i} style={styles.instCardRow}>
              <Text style={styles.instNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.instCardText}>{renderSpans(item.spans, ctx)}</Text>
            </View>
          ))}
    </View>
  );
}

function PortraitRow({ item, ctx }: { item: InstancesBlock['items'][number]; ctx: PerspectiveCtx }) {
  // Two-tier portrait: when the item leads with a "Name — …" form, the name is a
  // bold Fraunces heading and the remainder is body prose; the name also resolves
  // the recurring actor against entities[] for the portrait. When there is no
  // em-dash the item is a plain sentence — render the full spans as the body
  // (preserving footnote citations) with no name heading.
  const spans = item.spans ?? [];
  const fullText = spans
    .filter((s): s is TextSpan => s.kind === 'text')
    .map((s) => s.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const dash = fullText.indexOf('—');
  const hasName = dash > 0;
  const name = hasName ? fullText.slice(0, dash).trim() : fullText;
  // Body spans after the first em-dash (footnotes in the remainder preserved).
  const bodySpans = (hasName ? sliceSpansAfterDash(spans) : spans) ?? [];
  // Portrait/initials key on the resolved name (no-dash items rarely match an
  // entity, so they fall through to initials of the leading text).
  const ent = ctx.entByName[name];
  const portraitUrl = ent ? resolveCdnUrl(ent.thumbnail_url ?? ent.image_url) : null;
  return (
    <View style={styles.portraitRow}>
      {portraitUrl ? (
        <FNPortrait imageUrl={portraitUrl} style={styles.portraitImg} position="top" />
      ) : (
        <View style={styles.portraitFallback}>
          <Text style={styles.portraitInitials}>{initialsOf(name)}</Text>
        </View>
      )}
      <View style={styles.portraitMain}>
        {hasName ? <Text style={styles.portraitName}>{name}</Text> : null}
        {bodySpans.length ? (
          <Text style={styles.portraitText}>{renderSpans(bodySpans, ctx)}</Text>
        ) : null}
      </View>
    </View>
  );
}

// Drop everything up to and including the first em-dash that appears in a text
// span, keeping all later spans (incl. citations) intact for the body line.
function sliceSpansAfterDash(spans: InstancesBlock['items'][number]['spans']): typeof spans {
  const list = spans ?? [];
  const out: typeof list = [];
  let cut = false;
  for (const span of list) {
    if (cut) {
      out.push(span);
      continue;
    }
    if (span.kind === 'text') {
      const idx = span.text.indexOf('—');
      if (idx >= 0) {
        cut = true;
        const tail = span.text.slice(idx + 1);
        if (tail.trim()) out.push({ ...span, text: tail });
      }
    }
  }
  return out;
}

export function PConnection({ block, ctx }: { block: ConnectionBlock; ctx: PerspectiveCtx }) {
  return (
    <View style={styles.connection}>
      {block.nodes.map((node, i) => {
        const last = i === block.nodes.length - 1;
        return (
          <View key={i}>
            <View style={styles.connRow}>
              <View style={styles.connMarker}>
                <Text style={styles.connLetter}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text style={styles.connText}>{renderSpans(node.spans, ctx)}</Text>
            </View>
            {!last ? (
              <View style={styles.connConnector}>
                <Text style={styles.connArrow}>↓</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Auto source rail (from citations[], NOT an authored tag) ──────────

export function PSourceRail({ ctx }: { ctx: PerspectiveCtx }) {
  if (!ctx.citations.length) return null;
  return (
    <View>
      <View style={styles.railRule} />
      <FNCap style={styles.railHead}>Sources · {ctx.citations.length}</FNCap>
      {ctx.citations.map((c, i) => (
        <SourceRow key={c.id} c={c} n={i + 1} first={i === 0} />
      ))}
    </View>
  );
}

function SourceRow({ c, n, first }: { c: Citation; n: number; first: boolean }) {
  const tappable = !!c.url;
  const href = (c.kind === 'perspective' ? `/perspective/${c.id}` : `/story/${c.id}`) as Href;
  const row = (
    <View style={[styles.srcRow, !first && styles.srcRowDivider]}>
      <Text style={styles.srcNum}>{n}</Text>
      <View style={styles.srcMain}>
        <Text style={styles.srcTitle}>{c.title}</Text>
        <View style={styles.srcMetaRow}>
          {c.kind === 'perspective' ? <Text style={styles.srcKind}>Perspective</Text> : null}
          <Text style={styles.srcDate}>{formatRefDate(c.date) || '—'}</Text>
          {!tappable ? <Text style={styles.srcNYP}>· not yet published</Text> : null}
        </View>
      </View>
      <Text style={[styles.srcArrow, !tappable && styles.srcArrowHidden]}>→</Text>
    </View>
  );
  if (tappable) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="link">{row}</Pressable>
      </Link>
    );
  }
  return row;
}

const TICK = 'rgba(31, 26, 20, 0.18)'; // ink @ 18% — card border / camp grid
const TINT = 'rgba(31, 26, 20, 0.025)'; // faint ink wash for degraded cards

const styles = StyleSheet.create({
  // quote
  // Single-direction vertical spacing: RN doesn't collapse margins, so body
  // blocks carry marginBottom only — the gap to the next block equals this
  // block's marginBottom (no top+bottom doubling at prose↔tag boundaries).
  quoteCard: { marginBottom: 24, paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: colors.accent },
  quoteText: { fontFamily: fontFamily.displayItalic, fontSize: fontSize.lead, lineHeight: 23, color: colors.ink },
  hero: { marginBottom: 32 },
  heroMark: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.head, lineHeight: 30, color: colors.accent },
  heroText: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.title, // 24 (TS.title)
    lineHeight: fontSize.title * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    letterSpacing: -0.24, // -0.01em at 24px
  },
  cardProv: { marginTop: 9 },
  heroProv: { marginTop: 14 },
  quoteSpeaker: {
    fontFamily: fontFamily.uiBold, // 700 per design
    fontSize: fontSize.fine, // 12 (TS.fine)
    letterSpacing: 1.44, // 0.12em at 12px
    textTransform: 'uppercase',
    color: colors.ink,
  },
  quoteFrom: {
    marginTop: 2,
    fontFamily: fontFamily.uiMedium,
    fontSize: fontSize.micro, // 10 (TS.micro)
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  quoteFromLink: { color: colors.link },

  // stat
  stat: {
    marginBottom: spacing.xxl, // design margin sp(SP.s6, 0) — bottom-only (RN no collapse)
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.faint,
    paddingTop: spacing.lg, // design padding sp(SP.s4, 0, SP.s4)
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg, // design gap SP.s4
    alignItems: 'baseline',
  },
  statValue: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.hero, // 46 (TS.hero)
    lineHeight: 41, // ~0.9
    color: colors.ink,
    letterSpacing: -0.92, // -0.02em at 46px
    flexShrink: 0,
  },
  statBody: { flex: 1, minWidth: 0 },
  statLabel: {
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.micro, // 10 (TS.micro)
    letterSpacing: 1.3, // 0.13em at 10px
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
  statContext: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 19, color: colors.ink2 },

  // callout
  callout: { marginBottom: 24, paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: colors.ink },
  calloutText: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.sub, lineHeight: 27, color: colors.ink },

  // cards
  cardShell: {
    marginBottom: spacing.xl, // design margin sp(SP.s5, 0) — bottom-only (RN no collapse)
    borderWidth: 1,
    borderColor: TICK,
    borderRadius: 3,
    padding: spacing.lg, // design padding SP.s4
    backgroundColor: colors.paper,
  },
  cardShellDegraded: { borderColor: colors.faint, backgroundColor: TINT, opacity: 0.92 },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardImg: { width: 78, height: 78, borderRadius: 2, backgroundColor: colors.paper2 },
  cardMain: { flex: 1, minWidth: 0 },
  cardKickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs, flexWrap: 'wrap' },
  // Perspective card kicker sits a rung lower than story/actor — design
  // PPerspectiveCard kicker row uses marginBottom SP.s2 (not the s1 the others use).
  cardKickerRowPersp: { marginBottom: spacing.sm },
  cardKicker: { fontFamily: fontFamily.uiBold, fontSize: fontSize.micro, letterSpacing: 1.4, textTransform: 'uppercase' },
  kickerLink: { color: colors.link },
  kickerMuted: { color: colors.muted },
  cardMeta: { fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: colors.muted },
  cardNYP: {
    marginLeft: 'auto',
    fontFamily: fontFamily.uiSemiBold,
    fontSize: fontSize.micro,
    letterSpacing: 1, // 0.1em at 10px
    textTransform: 'uppercase',
    color: colors.muted,
  },
  cardTitle: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.base, lineHeight: fontSize.base * FRAUNCES_LEADING, color: colors.ink },
  cardTitlePersp: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.lead, lineHeight: fontSize.lead * FRAUNCES_LEADING, color: colors.ink, marginBottom: 8 },
  cardSummary: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.fine, lineHeight: 17, color: colors.ink2, marginTop: 8 },
  cardThesis: { fontFamily: fontFamily.displayItalic, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink2 },
  cardArrow: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.lead, color: colors.link, alignSelf: 'center' },
  // The actor-card arrow sits in the name row at TS.base (design PActorCard),
  // a rung quieter than the story/perspective card arrow (TS.lead).
  actorArrow: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.base, color: colors.link },
  actorPortrait: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(62, 88, 120, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(62, 88, 120, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.lead, color: colors.slate },
  actorNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  actorName: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.lead, lineHeight: fontSize.lead * FRAUNCES_LEADING, color: colors.ink, flex: 1 },
  // Role — Inter Tight 700 per design (the bold identity line), not the dek body.
  actorRole: { fontFamily: fontFamily.uiBold, fontSize: fontSize.base, lineHeight: 19, color: colors.ink, marginTop: 8 },
  actorSummary: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink2, marginTop: 8 },

  // divide
  divide: {
    // design margin sp(SP.s7, 0) — s7 (28) is off-rung, no spacing token. Bottom-only (RN no collapse).
    marginBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingTop: spacing.lg, // design padding sp(SP.s4, 0, SP.s2)
    paddingBottom: spacing.sm,
  },
  divideAxis: {
    fontFamily: fontFamily.displayItalic,
    fontSize: fontSize.base, // 15 (TS.base)
    lineHeight: 19, // ~1.25
    color: colors.ink,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 300,
    marginBottom: 16,
  },
  // design grid gap sp(SP.hair, SP.s5): column gap is the space-between/47% spread,
  // rowGap is the hair step between wrapped camp rows.
  campGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.hair },
  camp: { width: '47%', borderTopWidth: 2, paddingTop: 12, paddingBottom: 16 },
  campLabel: { fontFamily: fontFamily.displayBold, fontSize: fontSize.base, lineHeight: fontSize.base * FRAUNCES_LEADING, color: colors.ink, marginBottom: 8, marginTop: 8 },
  campText: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink2 },

  // timeline
  // design margin sp(SP.s7, 0) — s7 (28) is off-rung, no spacing token. Bottom-only (RN no collapse).
  timeline: { marginBottom: 28 },
  tlRow: { flexDirection: 'row' },
  tlDate: { width: 52, fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: colors.muted, paddingTop: 2 },
  tlDateLive: { color: colors.link },
  tlContent: { flex: 1, paddingLeft: 20, marginLeft: 4, position: 'relative' },
  tlContentLine: { borderLeftWidth: 1.5, borderLeftColor: colors.faint, paddingBottom: 20 },
  tlContentLineEsc: { borderLeftColor: colors.accentSoft },
  // Geometry (left/width/height/borderRadius) is supplied inline per step — the
  // dot radius ramps in escalation mode (see PTimeline).
  tlDot: { position: 'absolute', top: 2 },
  tlDotDefault: { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.slate },
  tlDotLive: { backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.accent },
  tlText: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink },

  // then-now
  // design margin sp(SP.s7, 0) — s7 (28) off-rung; gap SP.s4. Bottom-only (RN no collapse).
  thenNow: { marginBottom: 28, gap: spacing.lg },
  tnPanel: { paddingLeft: 16, borderLeftWidth: 3 },
  tnLabel: { fontFamily: fontFamily.uiBold, fontSize: fontSize.micro, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  tnText: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink },
  tnArrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  tnArrow: { fontFamily: fontFamily.mono, fontSize: fontSize.detail, color: colors.accent },
  tnArrowLine: { flex: 1, height: 1, backgroundColor: colors.faint },

  // instances
  // design margin sp(SP.s7, 0) — s7 (28) is off-rung, no spacing token. Bottom-only (RN no collapse).
  instances: { marginBottom: 28 },
  instHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  instCount: { fontFamily: fontFamily.displayBold, fontSize: fontSize.head, lineHeight: 27, color: colors.ink },
  instKicker: { fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.micro, letterSpacing: 1.3, textTransform: 'uppercase', color: colors.muted },
  instCardRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.faint },
  instNum: { width: 22, fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.slate, paddingTop: 2 },
  instCardText: { flex: 1, fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink },
  portraitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  portraitMain: { flex: 1, minWidth: 0, paddingTop: 2 },
  portraitName: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.base, lineHeight: fontSize.base * FRAUNCES_LEADING, color: colors.ink },
  portraitImg: { width: 44, height: 44, borderRadius: 22 },
  portraitFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // slate @ 12% / 28% — RN can't color-mix, so the design's
    // color-mix(slate, transparent) initials wash is the literal slate hue.
    backgroundColor: 'rgba(62, 88, 120, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(62, 88, 120, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitInitials: { fontFamily: fontFamily.displayPlain, fontSize: fontSize.fine, color: colors.slate },
  portraitText: { fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink2, marginTop: 2 },

  // connection
  // design margin sp(SP.s7, 0) — s7 (28) is off-rung, no spacing token. Bottom-only (RN no collapse).
  connection: { marginBottom: 28 },
  connRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  connMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connLetter: { fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.ink },
  connText: { flex: 1, fontFamily: fontFamily.bodyRegular, fontSize: fontSize.detail, lineHeight: 18, color: colors.ink, paddingTop: 2 },
  connConnector: { height: 20, marginLeft: 12.25, borderLeftWidth: 1.5, borderLeftColor: colors.accentSoft, justifyContent: 'center' },
  connArrow: { fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.accent, marginLeft: -5.5 },

  // source rail
  // Section boundary before SOURCES. The preceding body block now carries a
  // marginBottom (bottom-only spacing), so a wrapper marginTop here would STACK
  // with it in RN. The rail wrapper carries no top margin — the last body
  // block's marginBottom carries the seam gap, and railHead's marginTop adds the
  // internal breathing room below the rule. No doubling at the body↔rail seam.
  railRule: { height: 1, backgroundColor: colors.ink },
  railHead: { marginTop: spacing.lg, marginBottom: spacing.xs }, // design margin sp(SP.s4, 0, SP.s1)
  srcRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'baseline' }, // design gap SP.s3 · padding sp(SP.s3, 0)
  srcRowDivider: { borderTopWidth: 1, borderTopColor: colors.faint },
  srcNum: { width: 24, fontFamily: fontFamily.mono, fontSize: fontSize.fine, color: colors.slate },
  srcMain: { flex: 1, minWidth: 0 },
  srcTitle: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.detail, lineHeight: 17, color: colors.ink },
  srcMetaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  srcKind: { fontFamily: fontFamily.uiBold, fontSize: fontSize.micro, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  srcDate: { fontFamily: fontFamily.mono, fontSize: fontSize.micro, color: colors.muted },
  srcNYP: { fontFamily: fontFamily.uiSemiBold, fontSize: fontSize.micro, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  srcArrow: { fontFamily: fontFamily.uiMedium, fontSize: fontSize.base, color: colors.link, alignSelf: 'center' },
  srcArrowHidden: { color: 'transparent' },
});
