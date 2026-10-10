// AUTO-GENERATED FROM perspectives-backend@7284145
// DO NOT EDIT MANUALLY — regenerate with scripts/generate_tag_contract.py
// Source of truth: src/perspectives/common/perspective_tags.py

export const PERSPECTIVE_TAGS = {
  "version": "1.0",
  "tags": [
    {
      "name": "card",
      "category": "atom",
      "example": "<card kind=\"story|actor|perspective\"> … </card>",
      "note": "render a reference as a designed card, not a plain footnote. Wrap the token; for an actor, name them in the content.",
      "children": "one [sy_]/[pp_] token (story/perspective), or an actor name (actor)",
      "wraps": [
        "sy_",
        "pp_",
        "actor-name"
      ],
      "attributes": [
        {
          "name": "kind",
          "values": "story|actor|perspective",
          "required": true,
          "meaning": "which reference type the card resolves"
        }
      ]
    },
    {
      "name": "quote",
      "category": "atom",
      "example": "<quote display=\"card|hero\">[qt_x9]</quote>",
      "note": "a set-off quote block — the ONLY way to use a quote; 'hero' is a large pull-quote. The sentence before it stands complete on its own — never a colon lead-in.",
      "children": "exactly one [qt_] token",
      "wraps": [
        "qt_"
      ],
      "attributes": [
        {
          "name": "display",
          "values": "card|hero",
          "required": true,
          "meaning": "block weight; hero = large pull-quote"
        }
      ]
    },
    {
      "name": "stat",
      "category": "atom",
      "example": "<stat value=\"$52B\" label=\"…\">one cited line of context [sy_a1]</stat>",
      "note": "MOVE the one load-bearing figure out of the prose — the prose must not repeat the number; it must come from a cited story.",
      "children": "one line of context prose, cited",
      "wraps": [
        "sy_",
        "pp_"
      ],
      "attributes": [
        {
          "name": "value",
          "values": "free-text",
          "required": true,
          "meaning": "the figure as displayed (opaque string, e.g. \"$52B\")"
        },
        {
          "name": "label",
          "values": "free-text",
          "required": true,
          "meaning": "the caption under the figure"
        }
      ]
    },
    {
      "name": "define",
      "category": "atom",
      "example": "<define term=\"carve-out\">a plain-language gloss</define>",
      "note": "a tap-to-expand gloss for jargon.",
      "children": "plain-language gloss prose (no citation needed — states no new fact)",
      "wraps": [],
      "attributes": [
        {
          "name": "term",
          "values": "free-text",
          "required": true,
          "meaning": "the jargon term (the tappable label)"
        }
      ]
    },
    {
      "name": "callout",
      "category": "atom",
      "example": "<callout>your \"why this matters\" — one sharp interpretive beat, cited to the combination [sy_a1, sy_b2]</callout>",
      "note": "one sharp interpretive beat, cited to the COMBINATION of sources whose synthesis is the point.",
      "children": "interpretive prose, cited",
      "wraps": [
        "sy_",
        "pp_"
      ],
      "attributes": []
    },
    {
      "name": "divide",
      "category": "block",
      "example": "<divide axis=\"the question they split on\"><camp label=\"Hawks\">the position, in its own sources [sy_a1]</camp> … </divide>",
      "note": "two OR MORE camps, each cited to ITS OWN stories.",
      "children": "<camp label=\"…\">position prose, cited; optional [qt_]</camp>, repeated two or more times",
      "wraps": [
        "sy_",
        "pp_",
        "qt_"
      ],
      "attributes": [
        {
          "name": "axis",
          "values": "free-text",
          "required": true,
          "meaning": "the question the camps answer differently"
        }
      ]
    },
    {
      "name": "timeline",
      "category": "block",
      "example": "<timeline emphasis=\"plain|escalation\"><step date=\"2026-03\">what happened, cited [sy_c3]</step> … </timeline>",
      "note": "dated steps in order; the direction of travel is the claim.",
      "children": "<step date=\"…\">what happened, cited; optional [qt_]</step>, in order",
      "wraps": [
        "sy_",
        "pp_",
        "qt_"
      ],
      "attributes": [
        {
          "name": "emphasis",
          "values": "plain|escalation",
          "required": false,
          "meaning": "render tone; unknown → plain"
        }
      ]
    },
    {
      "name": "then-now",
      "category": "block",
      "example": "<then-now><then>the earlier state, cited [sy_a1]</then><now>the later state, cited [sy_d4]</now></then-now>",
      "note": "a two-panel reversal.",
      "children": "exactly one <then>…</then> and one <now>…</now>, each cited; each may anchor one [qt_]",
      "wraps": [
        "sy_",
        "pp_",
        "qt_"
      ],
      "attributes": []
    },
    {
      "name": "instances",
      "category": "block",
      "example": "<instances as=\"cards|portraits\"><item>one case, cited [sy_a1]</item> … </instances>",
      "note": "N cases where the count is the proof; 'portraits' keys on a recurring actor.",
      "children": "<item>one case, cited; optional [qt_]</item>, repeated",
      "wraps": [
        "sy_",
        "pp_",
        "qt_"
      ],
      "attributes": [
        {
          "name": "as",
          "values": "cards|portraits",
          "required": false,
          "meaning": "layout; portraits keys on a recurring actor"
        }
      ]
    },
    {
      "name": "connection",
      "category": "block",
      "example": "<connection layout=\"chain\"><node>A [sy_a1]</node><node>B [sy_b2]</node> … </connection>",
      "note": "an A→B→C link no one drew; label the connective tissue between nodes.",
      "children": "<node>one point, cited; optional [qt_]</node>, repeated; link tissue is prose between nodes",
      "wraps": [
        "sy_",
        "pp_",
        "qt_"
      ],
      "attributes": [
        {
          "name": "layout",
          "values": "chain",
          "required": false,
          "meaning": "only a linear chain is defined; unknown → chain"
        }
      ]
    }
  ]
} as const;
