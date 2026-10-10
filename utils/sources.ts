import type { ExportArticle } from '@/types/contract';

// Recency DESC ordering for a story's source articles. Scoped to the
// all-sources sheet ONLY: that surface promises "most recent", whereas the
// top-3 on the card/story detail are a backend-curated selection whose order
// must be preserved as sent. `published_at` is the one ordering key the article
// shape exposes. Returns a new array — never mutates the input. Array.prototype
// .sort is stable (Hermes/V8), so equal or unparseable timestamps keep their
// backend-relative order; unparseable dates sink to the bottom.
export function orderArticlesByRecency(articles: ExportArticle[]): ExportArticle[] {
  const ts = (a: ExportArticle) => {
    const t = Date.parse(a.published_at);
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...articles].sort((a, b) => ts(b) - ts(a));
}

// Rail when every top-3 article title would fit in ≤2 lines on a 168px tile;
// list otherwise. Walks words to simulate the actual wrap rather than a flat
// char-count — a title with one long word at a bad position wraps to more
// lines than a title with all-short words at the same total length.
//
// CHARS_PER_LINE is calibrated for Inter Tight 500 12.5pt at 168px: ~6px
// average char width → ~28 chars/line. Slightly conservative; rail tiles
// also clamp `numberOfLines={2}` as a visual safety net.
const RAIL_CHARS_PER_LINE = 28;
const RAIL_MAX_LINES = 2;

function fitsInLines(title: string, maxCharsPerLine: number, maxLines: number): boolean {
  if (!title) return true;
  const words = title.split(/\s+/);
  let line = '';
  let lines = 1;
  for (const word of words) {
    if (word.length > maxCharsPerLine) return false; // unbreakable word too long
    const candidate = line ? line + ' ' + word : word;
    if (candidate.length <= maxCharsPerLine) {
      line = candidate;
    } else {
      lines++;
      if (lines > maxLines) return false;
      line = word;
    }
  }
  return lines <= maxLines;
}

export function chooseSourceLayout(titles: string[]): 'rail' | 'list' {
  if (!titles?.length) return 'rail';
  const allFit = titles.every((t) =>
    fitsInLines(t, RAIL_CHARS_PER_LINE, RAIL_MAX_LINES),
  );
  return allFit ? 'rail' : 'list';
}

// Render the source domain as-is, minus a leading `www.` (pure noise). Backend
// doesn't ship a human-readable source name, and any algorithmic mapping
// (subdomain stripping, capitalize-and-pray) breaks on enough real domains
// that it's worse than the truthful display. If backend later ships a
// `source_name`, swap this for it.
export function friendlySourceName(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

// Google's free favicon API. Returns a 128×128 PNG (or globe fallback for
// unknown domains). Used as a visual stamp for sources with no article image.
export function faviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

// Initials for an entity avatar. Avoids picking stop-words ("The", "of") and
// prefers uppercase-starting tokens when available — so "Federal government
// of the United States" → "FU" rather than "FG", and "The U.S. Marine Corps"
// → "UM" rather than "TU".
const STOP_WORDS = new Set(['the', 'of', 'a', 'an', 'and']);

export function entityInitials(name: string): string {
  const tokens = name
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  const upperStart = tokens.filter((w) => /^[A-Z]/.test(w));
  const candidates = upperStart.length >= 2 ? upperStart : tokens;
  const out: string[] = [];
  for (const w of candidates) {
    const upper = w.match(/[A-Z]/);
    if (upper) out.push(upper[0]);
    else if (w[0]) out.push(w[0].toUpperCase());
    if (out.length === 2) break;
  }
  return out.join('');
}
