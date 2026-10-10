import { View, Text, StyleSheet } from 'react-native';

import type { ActorIndexEntry } from '@/types/contract';
import { FNCap } from '@/components/fn/FNCap';
import { FNPortrait } from '@/components/fn/FNPortrait';
import { FNBioLine } from '@/components/fn/FNBioLine';
import { colors } from '@/constants/Colors';
import { FRAUNCES_LEADING, fontFamily, fontSize } from '@/constants/Typography';
import { spacing } from '@/constants/Spacing';
import { resolveCdnUrl } from '@/lib/config';
import { useLastOpenedAt } from '@/lib/history';
import { formatActorUpdated } from '@/utils/time';

type Props = {
  actor: ActorIndexEntry;
  // 'card' (default) is the full browse row (140×168 portrait). 'condensed' is
  // the search-result row: same name/bio_line, ~half-size portrait, "why"
  // clamped to 2 lines. Per design hifi-search.jsx ActorRow.
  variant?: 'card' | 'condensed';
  // Fires when the portrait image has decoded — the Actors tab passes it on the
  // first row so the onboarding spotlight measures the settled (post-image) row.
  onImageLoad?: () => void;
};

// Actor card. Per design/ThinkPattern ActorsList: a two-column row with name +
// bio_line + bio_summary on the left, and a 140×168 editorial portrait on the
// right. name = .tp-h title (24); bio_line = bold lead (FNBioLine md); summary
// = body detail (13) ink2, clamped to 3 lines.
//
// `entity_type` is a real wire variant on every ActorIndexEntry. Backend
// only ships `person` today; `organization` is planned. We branch
// exhaustively so the compiler catches any future variant added to the
// schema, and so the org-specific treatment has a documented seam.
// Both cases render the person card today.
export function ActorListItem({ actor, variant = 'card', onImageLoad }: Props) {
  switch (actor.entity_type) {
    case 'person':
      return <PersonCard actor={actor} variant={variant} onImageLoad={onImageLoad} />;
    case 'organization':
      // TODO(orgs): org-specific treatment — logo-shaped (not portrait)
      // image, different fallback glyph. Falls through to person until
      // backend ships the first org and design specs the variant.
      return <PersonCard actor={actor} variant={variant} onImageLoad={onImageLoad} />;
    default: {
      // Exhaustiveness guard. If backend adds a third entity_type to the
      // contract (e.g. 'event', 'place'), TS will fail to compile here
      // and force this branch to be handled.
      const _exhaustive: never = actor.entity_type;
      return null;
    }
  }
}

function PersonCard({
  actor,
  variant,
  onImageLoad,
}: {
  actor: ActorIndexEntry;
  variant: 'card' | 'condensed';
  onImageLoad?: () => void;
}) {
  const condensed = variant === 'condensed';
  // List uses the 480×720 thumbnail variant (~30-40 KB) instead of the
  // 1024×1536 hero (~2-3 MB). Cuts Actors-tab payload by ~50-100×. Falls
  // back to image_url for actors that haven't been backfilled yet — the
  // backfill is daily at 03:30 UTC, so the null tail should empty within
  // 1-2 runs. Hero stays on the detail screen (see ActorDetail).
  const portraitUrl = resolveCdnUrl(actor.thumbnail_image_url ?? actor.image_url);

  // Living-dossier freshness cue: the "updated" stamp stays ochre ("now") until
  // the reader catches up — it recedes to muted only once they've opened the
  // actor since its last rewrite. "Opened since" reads from reading history (the
  // last time this detail was opened), not a separate ledger. Browse card only;
  // the condensed search row omits the stamp (design).
  const updatedLabel = formatActorUpdated(actor.updated_at);
  const lastOpenedAt = useLastOpenedAt('actor', String(actor.id));
  const unseen = lastOpenedAt < Date.parse(actor.updated_at);

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        {!condensed && updatedLabel ? (
          <FNCap color={unseen ? colors.accent : colors.muted} style={styles.updated}>
            {updatedLabel}
          </FNCap>
        ) : null}
        <Text style={styles.name}>{actor.name}</Text>
        <View style={styles.bioWrap}>
          <FNBioLine text={actor.bio_line} size="md" />
        </View>
        <Text style={styles.why} numberOfLines={condensed ? 2 : 3}>
          {actor.bio_summary}
        </Text>
      </View>
      <FNPortrait
        imageUrl={portraitUrl}
        style={condensed ? styles.portraitCondensed : styles.portrait}
        position={22}
        onLoad={onImageLoad}
      />
    </View>
  );
}

const PORTRAIT_WIDTH = 140;
const PORTRAIT_HEIGHT = 168;
// Condensed (search) row portrait — roughly half-scale per design ActorRow.
const PORTRAIT_CONDENSED_WIDTH = 72;
const PORTRAIT_CONDENSED_HEIGHT = 86;

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xl, // 20 — design ActorsList row
    flexDirection: 'row',
    gap: spacing.lg, // 16 — design grid gap SP.s4
    alignItems: 'flex-start',
  },
  // minWidth: 0 lets flex: 1 actually constrain width so long names wrap
  // instead of pushing the portrait off-screen.
  body: { flex: 1, minWidth: 0 },
  // Freshness stamp above the name — FNCap type (Inter Tight caps, matching the
  // story/perspective date eyebrows); color is set inline (accent when live).
  updated: { marginBottom: spacing.sm }, // SP.s2 above the name
  name: {
    fontFamily: fontFamily.displayPlain, // Fraunces 600 SemiBold (<28pt → plain cut)
    fontSize: fontSize.title, // 24 — design .tp-h TS.title
    lineHeight: fontSize.title * FRAUNCES_LEADING, // clears Fraunces' descender floor
    letterSpacing: -fontSize.title * 0.02, // -0.02em at 24px
    color: colors.ink,
  },
  bioWrap: { marginTop: spacing.sm, alignSelf: 'flex-start' }, // SP.s2
  // bio_summary — the supporting "why", clamped to 3 lines (numberOfLines).
  why: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.detail, // 13 — design TS.detail
    lineHeight: fontSize.detail * 1.5, // 1.5 ratio
    color: colors.ink2,
    marginTop: spacing.sm, // SP.s2
  },
  portrait: {
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
    borderRadius: 2,
  },
  portraitCondensed: {
    width: PORTRAIT_CONDENSED_WIDTH,
    height: PORTRAIT_CONDENSED_HEIGHT,
    borderRadius: 2,
  },
});
