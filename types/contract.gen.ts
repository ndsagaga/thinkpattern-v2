// AUTO-GENERATED FROM perspectives-backend@80e6c75
// schemas.py SHA: c93a17c62b5a
// DO NOT EDIT MANUALLY — regenerate with scripts/generate_mobile_types.py

/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

export type EntityType = "person" | "organization";
export type RelationshipType = "ally" | "adversary" | "dependent" | "authority" | "neutral";
export type InteractionRecency = "this_week" | "this_month" | "older";
export type Topic = "POLITICS" | "BUSINESS" | "TECHNOLOGY" | "WORLD";

/**
 * actors/{id}.json — full actor profile.
 */
export interface ActorDetail {
  id: number;
  kg_id: string;
  name: string;
  canonical_name: string | null;
  entity_type: EntityType;
  image_url: string | null;
  thumbnail_image_url: string | null;
  bio_line: string;
  bio_summary: string;
  summary: string;
  focus_areas: ExportFocusArea[];
  key_relationships: ExportRelationship[];
  top_locations?: Location[];
  primary_topic: Topic;
  updated_at: string;
}
/**
 * Entity focus area, possibly spanning multiple source stories.
 */
export interface ExportFocusArea {
  topic: string;
  summary: string;
  sources: FocusAreaSource[];
  quote?: EntityQuote | null;
}
/**
 * One source story for a focus area, with denormalized title.
 */
export interface FocusAreaSource {
  story_id: string;
  story_title: string;
  story_url: string;
}
/**
 * One verbatim quote attributed to an entity.
 *
 * Carries the source story for tap-to-navigate; the title is denormalized
 * so the client doesn't need a second fetch to render the label. Currently
 * embedded under `ExportFocusArea.quote` (the best supporting quote for
 * that focus area).
 */
export interface EntityQuote {
  quote: string;
  story_id: string;
  story_title: string;
  story_url: string;
  said_at: string;
}
/**
 * Entity relationship — counterparty, type, narrative, recency.
 *
 * `interaction_recency` is computed at commit time from the newest of the
 * relationship's cited evidence stories (entity/commit.py), not LLM-emitted.
 */
export interface ExportRelationship {
  entity_name: string;
  entity_type: EntityType;
  relationship_type: RelationshipType;
  relationship_summary: string;
  interaction_recency: InteractionRecency;
  actor_id?: number | null;
  actor_url?: string | null;
}
/**
 * Geocoded location embedded in stories and entities.
 *
 * `relevance` is populated only when the embed comes from a story
 * (per-story "why this location matters" text from `location_involvement`).
 * Elsewhere it's omitted.
 *
 * Only resolved locations (place_id IS NOT NULL) are exported — unresolved
 * rows have no lat/lng and would fail map rendering.
 */
export interface Location {
  location_id: number;
  name: string;
  country: string | null;
  formatted_address: string;
  lat: number;
  lng: number;
  place_types?: string[];
  relevance?: string | null;
  is_primary?: boolean;
}
/**
 * One row in actors/index.json. Pre-sorted by salience DESC.
 */
export interface ActorIndexEntry {
  id: number;
  kg_id: string;
  name: string;
  entity_type: EntityType;
  image_url: string | null;
  thumbnail_image_url: string | null;
  bio_line: string;
  bio_summary: string;
  focus_topics: string[];
  primary_topic: Topic;
  updated_at: string;
  salience: number;
  detail_url: string;
}
/**
 * A child of a structured block — a divide camp, timeline step, instances item, connection
 * node, or a then/now panel. `label` (camp) and `date` (step) are present only where the grammar
 * carries them; `quote_ids` are the [qt_] anchors in this child (0+; resolve in quotes[]).
 */
export interface BlockItem {
  spans?: (TextSpan | CitationSpan | DefineSpan)[];
  quote_ids?: string[];
  label?: string | null;
  date?: string | null;
}
export interface TextSpan {
  kind: "text";
  text: string;
}
export interface CitationSpan {
  kind: "citation";
  refs: string[];
}
export interface DefineSpan {
  kind: "define";
  term: string;
  gloss: string;
}
export interface CalloutBlock {
  type: "callout";
  spans: (TextSpan | CitationSpan | DefineSpan)[];
}
export interface CardBlock {
  type: "card";
  card_kind: "story" | "actor" | "perspective";
  ref: string;
}
/**
 * One resolvable citation anchor from a perspective body.
 *
 * `id` is the inline token in `PerspectiveDetail.body` (`sy_…`/`pp_…`); mobile
 * looks it up here to render the anchor. `url` follows the same null-together
 * contract as entity chips: present iff the cited object was published in this
 * export run, null otherwise (the title still grounds the claim; the reference
 * is just non-tappable). The title always resolves — it comes from the DB,
 * which has the row even when no current CDN detail file exists.
 */
export interface Citation {
  id: string;
  kind: "story" | "perspective";
  title: string;
  url?: string | null;
  date?: string | null;
}
export interface ConnectionBlock {
  type: "connection";
  layout: string;
  nodes: BlockItem[];
}
export interface DivideBlock {
  type: "divide";
  axis: string;
  camps: BlockItem[];
}
/**
 * Source article (§4.3).
 *
 * No `summary` field — the v1 `summary` was an event-enrichment summary
 * fanned out across articles, not an article summary. Mobile renders title
 * only.
 */
export interface ExportArticle {
  id: string;
  title: string;
  url: string;
  source_domain: string;
  published_at: string;
  image_url?: string | null;
  is_premium?: boolean;
}
export interface InstancesBlock {
  type: "instances";
  arrangement: string;
  items: BlockItem[];
}
/**
 * Top-level export manifest at /manifest.json.
 *
 * Loaded first by clients (hardcoded path: `manifest.json`) to know
 * freshness, scale, and topic distribution. Index URLs are bucket-relative
 * (mobile prepends its CDN base) — see the `_url` field rule in
 * docs/serve_contract.md §2. Uploaded LAST in the three-phase upload
 * (details → indexes → manifest) so a fresh manifest is never visible
 * before the files it references.
 */
export interface Manifest {
  generated_at: string;
  schema_version?: string;
  stories_index_url: string;
  actors_index_url: string;
  perspectives_index_url: string;
  counts: ManifestCounts;
  coverage: ManifestCoverage;
  topics: ManifestTopics;
}
export interface ManifestCounts {
  stories: number;
  actors: number;
  perspectives: number;
  articles: number;
}
export interface ManifestCoverage {
  earliest: string;
  latest: string;
}
/**
 * Sparse: only topics with count > 0 are present.
 */
export interface ManifestTopics {
  stories?: {
    [k: string]: number;
  };
  actors?: {
    [k: string]: number;
  };
  perspectives?: {
    [k: string]: number;
  };
}
/**
 * Rich resolved data for a `<card kind="perspective">[pp_…]</card>`.
 */
export interface PerspectiveCard {
  kind: "perspective";
  id: string;
  title: string;
  url?: string | null;
  shape: "divide" | "arc" | "pattern" | "contradiction" | "thread";
  thesis: string;
  date?: string | null;
}
/**
 * perspectives/{id}.json — the published piece + its resolved citations.
 */
export interface PerspectiveDetail {
  id: string;
  shape: "divide" | "arc" | "pattern" | "contradiction" | "thread";
  title: string;
  thesis: string;
  topic?: Topic | null;
  body: string;
  body_nodes: (
    | ProseBlock
    | QuoteBlock
    | StatBlock
    | CalloutBlock
    | CardBlock
    | DivideBlock
    | TimelineBlock
    | ThenNowBlock
    | InstancesBlock
    | ConnectionBlock
  )[];
  published_at: string;
  citations?: Citation[];
  quotes?: PerspectiveQuote[];
  cards?: (StoryCard | PerspectiveCard)[];
  entities?: PerspectiveEntityRef[];
  audio_url?: string | null;
  audio_duration_sec?: number | null;
}
export interface ProseBlock {
  type: "prose";
  spans: (TextSpan | CitationSpan | DefineSpan)[];
}
export interface QuoteBlock {
  type: "quote";
  display: "card" | "hero";
  quote_id: string;
}
export interface StatBlock {
  type: "stat";
  value: string;
  label: string;
  context: (TextSpan | CitationSpan | DefineSpan)[];
}
export interface TimelineBlock {
  type: "timeline";
  emphasis: string;
  steps: BlockItem[];
}
export interface ThenNowBlock {
  type: "then_now";
  then: BlockItem;
  now: BlockItem;
}
/**
 * One resolved quote anchor from a perspective body.
 *
 * `id` is the inline `[qt_…]` token in `PerspectiveDetail.body` (always inside a
 * tag — `<quote>` or a structured tag's quote slot). Mobile looks it up here to
 * render a set-off quote block. `text` + `speaker` come from the DB at serve time
 * (never the model), so quotes are verbatim and correctly attributed by
 * construction.
 *
 * Story-level provenance: `source_story_*` is the story this quote was curated
 * into (`quote_attribution`, story context). `source_story_url` follows the same
 * null-together rule as `Citation.url` (present iff that story is published this
 * run). The source story is independent of the body's `[sy_]` set, so it may not
 * appear in `citations[]` — which is why `source_story_title` is denormalized
 * here: it always resolves from the DB (even when `source_story_url` is null, like
 * `Citation.title` vs `Citation.url`), so the provenance line renders without a
 * `citations[]` lookup. Mirrors `EntityQuote.story_title`.
 */
export interface PerspectiveQuote {
  id: string;
  text: string;
  speaker: string;
  source_story_id?: string | null;
  source_story_title?: string | null;
  source_story_url?: string | null;
  source_story_date?: string | null;
}
/**
 * Rich resolved data for a `<card kind="story">[sy_…]</card>` — the chrome a
 * promoted story reference renders (vs. a bare `[sy_]` footnote in `citations[]`).
 * Resolved at serve time; `url` null-together-gated like `Citation.url`.
 */
export interface StoryCard {
  kind: "story";
  id: string;
  title: string;
  url?: string | null;
  date?: string | null;
  image_url?: string | null;
  summary?: string | null;
}
/**
 * Entity derived from a perspective's cited stories — and the data behind a
 * `<card kind="actor">`.
 *
 * Same null-together contract as StoryEntityRef.actor_id/actor_url — a chip is
 * tappable iff the entity is an exported actor. The card-chrome fields
 * (`image_url`/`thumbnail_url`/`bio_line`/`summary`) are present iff the
 * entity has current enrichment; null for a bare mentioned entity.
 *
 * `id` is the stable entity id (always present). It is the join key a
 * `CardBlock` with `card_kind="actor"` carries in `ref` — so an actor card joins
 * by id, not by matching `name` strings (added v5.3). `name` is still the display
 * label and remains unique within a perspective.
 */
export interface PerspectiveEntityRef {
  id: number;
  name: string;
  entity_type: EntityType;
  role: string;
  actor_id?: number | null;
  actor_url?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  bio_line?: string | null;
  summary?: string | null;
}
/**
 * One row in perspectives/index.json. Sorted by published_at DESC.
 *
 * Perspectives are not salience-ranked (immutable, low-volume); recency is the
 * order. `topic` is the dominant topic across the cited stories (one of the
 * exportable topics) or null when none resolves.
 */
export interface PerspectiveIndexEntry {
  id: string;
  shape: "divide" | "arc" | "pattern" | "contradiction" | "thread";
  title: string;
  thesis: string;
  topic?: Topic | null;
  published_at: string;
  detail_url: string;
  audio_duration_sec?: number | null;
}
/**
 * Strings in FCM `message.data` for a `perspectives.notify` push.
 */
export interface PushNotificationData {
  kind: "story" | "actor" | "perspective";
  object_id: string;
  notification_id: string;
  detail_url: string;
}
/**
 * One row in stories/search.json — a lean, full-corpus story record for the
 * app's search surface.
 *
 * stories/index.json is the recent (≤14d), salience-ranked *browse* feed; this
 * file is EVERY exportable-detail story (the full COMPLETE/STALE archive) so
 * search reaches beyond the feed window. It ships only the fields the
 * client-side ranker matches on + enough to render a result row and open the
 * story — no preview_articles/body, so the whole-corpus file stays small
 * (~2 MB gzip). Additive: index.json is untouched, so older builds keep
 * searching the feed unchanged.
 *
 * Note vs. the feed search: source-domain matching is dropped here (aggregating
 * outlet domains over the full article corpus every run is too expensive);
 * title/short_summary/topic/primary_location_name remain the match axes.
 */
export interface SearchStoryEntry {
  id: string;
  title: string;
  short_summary: string;
  topic: Topic;
  time_start: string;
  primary_location_name?: string | null;
  primary_location_country?: string | null;
  detail_url: string;
}
/**
 * stories/{id}.json — full article list + entities.
 */
export interface StoryDetail {
  id: string;
  title: string;
  short_summary: string;
  full_summary: string;
  topic: Topic;
  time_start: string;
  time_end: string;
  articles: ExportArticle[];
  entities: StoryEntityRef[];
  locations?: Location[];
  superseded_by?: SupersededBy | null;
}
/**
 * Entity at story level with optional per-story role narrative.
 *
 * `role_summary` is null in v2.0; populated in v2.1 once event/story
 * enrichment emits per-(story, entity) one-liners.
 */
export interface StoryEntityRef {
  name: string;
  entity_type: EntityType;
  role: string;
  role_summary?: string | null;
  quotes?: string[];
  actor_id?: number | null;
  actor_url?: string | null;
}
/**
 * Where a merged story's coverage continued.
 *
 * Set only on a story the editor MERGEd into a survivor. `detail_url` is the
 * survivor's detail path, so a client follows the pointer without resolving
 * the id against anything.
 */
export interface SupersededBy {
  id: string;
  title: string;
  detail_url: string;
}
/**
 * One row in stories/index.json. Pre-sorted by salience DESC.
 *
 * Every exported story passed the orphan/quality gate (state COMPLETE/STALE,
 * a kg_id-grounded entity, and multi-domain coverage). There is no
 * timeline-anchoring on the wire — timelines are retired.
 */
export interface StoryIndexEntry {
  id: string;
  title: string;
  short_summary: string;
  topic: Topic;
  time_start: string;
  time_end: string;
  preview_articles: ExportArticle[];
  article_count: number;
  salience: number;
  primary_location?: Location | null;
  detail_url: string;
}
