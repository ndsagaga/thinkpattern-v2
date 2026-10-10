import { View, Text, ScrollView, StyleSheet } from 'react-native';

import type {
  ActorDetail as ActorDetailType,
  ExportFocusArea,
  ExportRelationship,
  InteractionRecency,
} from '@/types/contract';
import { FNCap } from '@/components/fn/FNCap';
import { FNRule } from '@/components/fn/FNRule';
import { FNPortrait } from '@/components/fn/FNPortrait';
import { FNBioLine } from '@/components/fn/FNBioLine';
import { FNRichText } from '@/components/fn/FNRichText';
import { colors, relation as relationPalette } from '@/constants/Colors';
import { typography, fontFamily, fontSize, FRAUNCES_LEADING } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { resolveCdnUrl } from '@/lib/config';
import { entityInitials } from '@/utils/sources';
import { formatActorUpdated } from '@/utils/time';

// Interaction recency tag — the contract's interaction_recency on a
// relationship. `this_week` is the now-beat, so it (and only it) carries the
// ochre accent; everything older recedes to muted. Mono micro, like all
// metadata. Per design/ThinkPattern RecencyTag/RECENCY.
const RECENCY: Record<InteractionRecency, { label: string; color: string }> = {
  this_week: { label: 'This week', color: colors.accent },
  this_month: { label: 'This month', color: colors.muted },
  older: { label: 'Earlier', color: colors.muted },
};

function RecencyTag({ value }: { value: InteractionRecency }) {
  const r = RECENCY[value];
  if (!r) return null;
  return <Text style={[styles.recency, { color: r.color }]}>{r.label}</Text>;
}

const RELATION_AVATAR_SIZE = 36;

// Tinted initials disc — the relationship/hero fallback when no portrait is
// available. Mirrors design/ThinkPattern ActorInitials: a soft tint wash (12%)
// with a 28% border, Fraunces initials in the tint color. Tint defaults to
// slate (mark/data-viz) for the hero; relationship rows pass the relation hue.
function ActorInitials({
  name,
  size = RELATION_AVATAR_SIZE,
  color = colors.slate,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <View
      style={[
        styles.initials,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}1F`, // ~12%
          borderColor: `${color}47`, // ~28%
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.displayPlain,
          fontSize: size * 0.4,
          color,
        }}
      >
        {entityInitials(name)}
      </Text>
    </View>
  );
}

type Props = { actor: ActorDetailType };

// Actor detail. Per design/ThinkPattern ActorDetail: square editorial portrait
// hero (or a slate initials fallback), then entity_type cap, name (display
// wonky), bio_line (bold lead), bio_summary (editorial paragraph), a narrative
// ("Where they stand"), numbered focus areas, and key relationships with
// relation-tinted initials, kind-colored labels, and recency.
//
// `entity_type` is a real wire variant on every ActorDetail. Backend only
// ships `person` today; `organization` is planned. Exhaustive switch so
// the compiler catches any future variant added to the schema. Both cases
// render the person detail today.
export function ActorDetail({ actor }: Props) {
  switch (actor.entity_type) {
    case 'person':
      return <PersonDetail actor={actor} />;
    case 'organization':
      // TODO(orgs): org-specific hero (logo-shaped, not portrait), header
      // layout, and possibly different "relationships" framing
      // (subsidiaries / parent companies rather than personal allies).
      return <PersonDetail actor={actor} />;
    default: {
      const _exhaustive: never = actor.entity_type;
      return null;
    }
  }
}

function PersonDetail({ actor }: { actor: ActorDetailType }) {
  const heroUrl = resolveCdnUrl(actor.image_url);
  const updatedLabel = formatActorUpdated(actor.updated_at);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {heroUrl ? (
        <FNPortrait imageUrl={heroUrl} style={styles.hero} position={18} />
      ) : (
        <View style={styles.heroFallback}>
          <ActorInitials name={actor.name} size={96} color={colors.slate} />
        </View>
      )}

      <View style={styles.headBlock}>
        {/* Freshness stamp replaces the entity_type cap (every actor is a
            person, so the type read as noise). Always muted here — opening the
            detail is the "seen" event; the ochre "now" cue lives on the list. */}
        {updatedLabel ? <FNCap>{updatedLabel}</FNCap> : null}
        <Text style={styles.name}>{actor.name}</Text>
        <View style={styles.bioWrap}>
          <FNBioLine text={actor.bio_line} size="lg" />
        </View>
        {actor.bio_summary ? (
          <Text style={styles.bioSummary}>{actor.bio_summary}</Text>
        ) : null}
      </View>

      {actor.summary ? (
        <>
          <FNRule style={styles.sectionRule} />
          <View style={styles.sectionHeader}>
            <FNCap>Where they stand</FNCap>
          </View>
          <FNRichText text={actor.summary} style={styles.narrative} />
        </>
      ) : null}

      {actor.focus_areas.length > 0 && (
        <>
          <FNRule style={styles.sectionRule} />
          <View style={styles.sectionHeader}>
            <FNCap>
              <Text style={typography.num}>{actor.focus_areas.length}</Text> focus areas
            </FNCap>
            <Text style={styles.sectionHeading}>On their plate</Text>
          </View>
          {actor.focus_areas.map((f, i) => (
            <FocusAreaRow
              key={`${f.topic}-${i}`}
              area={f}
              index={i}
              isLast={i === actor.focus_areas.length - 1}
            />
          ))}
        </>
      )}

      {actor.key_relationships.length > 0 && (
        <>
          <FNRule style={styles.sectionRule} />
          <View style={styles.sectionHeader}>
            <FNCap>
              <Text style={typography.num}>{actor.key_relationships.length}</Text> relationships
            </FNCap>
            <Text style={styles.sectionHeading}>Key relationships</Text>
          </View>
          {actor.key_relationships.map((r, i) => (
            <RelationshipRow
              key={`${r.entity_name}-${i}`}
              relationship={r}
              isLast={i === actor.key_relationships.length - 1}
            />
          ))}
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function FocusAreaRow({
  area,
  index,
  isLast,
}: {
  area: ExportFocusArea;
  index: number;
  isLast: boolean;
}) {
  return (
    <View style={[styles.focusRow, !isLast && styles.focusDivider]}>
      <Text style={styles.focusNum}>{index + 1}.</Text>
      <View style={styles.focusBody}>
        <Text style={styles.focusTopic}>{area.topic}</Text>
        {area.summary ? (
          <FNRichText text={area.summary} style={styles.focusSummary} />
        ) : null}
      </View>
    </View>
  );
}

function RelationshipRow({
  relationship,
  isLast,
}: {
  relationship: ExportRelationship;
  isLast: boolean;
}) {
  const kindColor =
    relationPalette[relationship.relationship_type] ?? colors.muted;

  // Backend doesn't yet surface portraits for related entities, so the avatar
  // falls back to tinted initials in the relation hue (per design/ThinkPattern
  // ActorInitials) rather than a flat kraft placeholder. When an image_url
  // eventually flows through ExportRelationship, swap to FNPortrait here.
  return (
    <View style={[styles.relRow, !isLast && styles.relDivider]}>
      <ActorInitials
        name={relationship.entity_name}
        size={RELATION_AVATAR_SIZE}
        color={kindColor}
      />
      <View style={styles.relMeta}>
        <View style={styles.relTopRow}>
          <Text style={styles.relName} numberOfLines={2}>
            {relationship.entity_name}
          </Text>
          <RecencyTag value={relationship.interaction_recency} />
        </View>
        <Text style={[styles.relKind, { color: kindColor }]}>
          {relationship.relationship_type}
        </Text>
        <FNRichText text={relationship.relationship_summary} style={styles.relSummary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
  },

  // Bleed the hero past the gutter to screen edges. Square aspect (1:1)
  // matches the design (Portrait aspectRatio '1') and the natural shape of
  // AI-generated entity portraits — they ship square with even padding.
  hero: {
    aspectRatio: 1,
    marginHorizontal: -spacing.gutter,
  },
  // No-portrait fallback: a 16:9 paper2 band centering the slate initials disc,
  // per design (ActorDetail fallback box).
  heroFallback: {
    aspectRatio: 16 / 9,
    marginHorizontal: -spacing.gutter,
    backgroundColor: colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headBlock: { marginTop: spacing.xl }, // SP.s5
  name: {
    fontFamily: fontFamily.displayWonky, // ≥28pt → wonky cut (.tp-h)
    fontSize: fontSize.display, // 34 — design TS.display
    lineHeight: fontSize.display * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -fontSize.display * 0.02, // -0.02em
    color: colors.ink,
    marginTop: spacing.sm, // SP.s2 below the entity_type cap
  },
  bioWrap: { marginTop: spacing.md, alignSelf: 'flex-start' }, // SP.s3

  // bio_summary — editorial paragraph beneath the bold bio_line lead.
  bioSummary: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.base, // 15 — design TS.base
    lineHeight: fontSize.base * 1.52, // 1.52 ratio
    color: colors.ink2,
    marginTop: spacing.md, // SP.s3
  },

  sectionRule: { marginTop: spacing.xxl }, // SP.s6
  sectionHeader: { paddingTop: spacing.lg }, // SP.s4
  sectionHeading: {
    fontFamily: fontFamily.displayPlain,
    fontSize: fontSize.lead, // 17 — design "On their plate"/"Key relationships"
    lineHeight: fontSize.lead * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
    marginTop: spacing.xs, // SP.s1
  },

  // "Where they stand" narrative — body lead.
  narrative: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.lead, // 17 — design TS.lead
    lineHeight: fontSize.lead * 1.5, // 1.5 ratio
    color: colors.ink,
    marginTop: spacing.sm, // SP.s2
  },

  // Focus areas — number + topic/summary column.
  focusRow: {
    paddingVertical: spacing.lg, // SP.s4
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md, // SP.s3
  },
  focusDivider: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  focusNum: {
    fontFamily: fontFamily.displayPlain, // Fraunces 600
    fontSize: fontSize.lead, // 17 — design display lead
    color: colors.muted,
    minWidth: 18,
  },
  focusBody: { flex: 1, minWidth: 0 },
  focusTopic: {
    fontFamily: fontFamily.displayPlain, // .tp-h
    fontSize: fontSize.lead, // 17 — design TS.lead
    lineHeight: fontSize.lead * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
  },
  focusSummary: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // 13 — design TS.detail
    lineHeight: fontSize.detail * 1.45, // 1.45 ratio
    color: colors.ink2,
    marginTop: spacing.xs, // SP.s1
  },

  // Relationships
  relRow: {
    paddingVertical: spacing.md, // SP.s3
    flexDirection: 'row',
    gap: spacing.md, // SP.s3
    alignItems: 'flex-start',
  },
  relDivider: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  relMeta: { flex: 1, minWidth: 0 },
  relTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm, // SP.s2
  },
  relName: {
    flex: 1,
    fontFamily: fontFamily.displayPlain, // .tp-h
    fontSize: fontSize.lead, // 17 — design TS.lead
    lineHeight: fontSize.lead * FRAUNCES_LEADING, // clears Fraunces' descender floor
    color: colors.ink,
  },
  relKind: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro, // 10 — design TS.micro
    letterSpacing: fontSize.micro * 0.1, // 0.1em
    textTransform: 'uppercase',
    marginTop: 2, // SP.hair
  },
  relSummary: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // 13 — design TS.detail
    lineHeight: fontSize.detail * 1.45, // 1.45 ratio
    color: colors.ink2,
    marginTop: spacing.xs, // SP.s1
  },

  // RecencyTag — mono micro, accent for `this_week`, muted otherwise.
  recency: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro, // 10 — design TS.micro
    letterSpacing: fontSize.micro * 0.1, // 0.1em
    textTransform: 'uppercase',
  },

  // ActorInitials fallback disc
  initials: {
    flexShrink: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSpacer: { height: 24 },
});
