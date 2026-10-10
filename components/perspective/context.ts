import type {
  Citation,
  PerspectiveCard,
  PerspectiveDetail,
  PerspectiveEntityRef,
  PerspectiveQuote,
  StoryCard,
} from '@/types/contract';
import { formatCalendarDate, formatShortDate } from '@/utils/time';

// The resolution maps a perspective body needs. Everything resolves inline from
// the SAME detail payload — citations[]/quotes[]/cards[]/entities[] — never a
// second fetch. Footnote numbers are citations[] array order, which the backend
// guarantees is body first-appearance order (= the source-rail order), so the
// number is consistent whether we index the array or walk body_nodes.
export type PerspectiveCtx = {
  citeNum: Record<string, number>;
  citeById: Record<string, Citation>;
  quoteById: Record<string, PerspectiveQuote>;
  entById: Record<string, PerspectiveEntityRef>;
  entByName: Record<string, PerspectiveEntityRef>;
  storyCardById: Record<string, StoryCard>;
  perspectiveCardById: Record<string, PerspectiveCard>;
  citations: Citation[];
};

export function buildPerspectiveCtx(p: PerspectiveDetail): PerspectiveCtx {
  const citations = p.citations ?? [];
  const citeNum: Record<string, number> = {};
  const citeById: Record<string, Citation> = {};
  citations.forEach((c, i) => {
    citeNum[c.id] = i + 1;
    citeById[c.id] = c;
  });

  const quoteById: Record<string, PerspectiveQuote> = {};
  (p.quotes ?? []).forEach((q) => {
    quoteById[q.id] = q;
  });

  // Two entity maps: by id (the stable join key an actor CardBlock carries in
  // `ref`, v5.3) and by name (instances "portraits" resolve the leading name in
  // an item's prose against entities[]).
  const entById: Record<string, PerspectiveEntityRef> = {};
  const entByName: Record<string, PerspectiveEntityRef> = {};
  (p.entities ?? []).forEach((e) => {
    entById[String(e.id)] = e;
    entByName[e.name] = e;
  });

  // Story/perspective cards keyed by id within their kind — discriminate on the
  // required `kind` literal, never by sniffing the id prefix.
  const storyCardById: Record<string, StoryCard> = {};
  const perspectiveCardById: Record<string, PerspectiveCard> = {};
  (p.cards ?? []).forEach((c) => {
    if (c.kind === 'story') storyCardById[c.id] = c;
    else perspectiveCardById[c.id] = c;
  });

  return {
    citeNum,
    citeById,
    quoteById,
    entById,
    entByName,
    storyCardById,
    perspectiveCardById,
    citations,
  };
}

// Reference dates arrive as either full ISO datetimes ("2026-06-18T19:00:00Z")
// or date-only strings ("2026-03-09"). Use the calendar-date splitter for the
// latter (new Date() would parse it as UTC midnight and shift a day west).
export function formatRefDate(s?: string | null): string {
  if (!s) return '';
  return s.includes('T') ? formatShortDate(s) : formatCalendarDate(s);
}
