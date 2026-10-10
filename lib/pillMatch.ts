// Custom-pill matching: does a story mention any of a pill's keywords?
//
// Deliberately literal, so a pill never catches a story it shouldn't:
//   • Case- and accent-insensitive ("sao paulo" finds "São Paulo").
//   • Whole words only ("ai" finds "AI" but not "said" or "Taiwan").
//   • A multi-word keyword is a phrase; any punctuation or spacing may sit
//     between its words ("trade war" finds "trade-war").
//   • The keyword's last word also matches its regular plural: +s / +es, and
//     consonant+y → ies ("tariff" finds "tariffs", "policy" finds "policies").
// Not handled, on purpose: plural keyword → singular story word (stripping a
// trailing "s" breaks "news", "gas", "us"), irregular forms, stemming, and
// meaning ("ai" does not find "OpenAI"). A pill's live match count makes those
// gaps visible, and the fix is another keyword.
//
// A story is searched on its title, summary and primary location. The folded
// text is memoized per story object, so a feed load pays for it once and every
// pill evaluation after that is a single regex test per story.

import type { StoryIndexEntry } from '@/types/contract';

const COMBINING_MARKS = /[̀-ͯ]/g;

// Lowercase + strip accents. Everything matching runs on folded text.
export function fold(text: string): string {
  return text.normalize('NFKD').replace(COMBINING_MARKS, '').toLowerCase();
}

// Letters/digits of a keyword, split into words. Anything else separates.
function words(text: string): string[] {
  return fold(text).match(/[a-z0-9]+/g) ?? [];
}

// Regular plural forms of a word's last token, as a regex fragment.
function withPlural(word: string): string {
  return /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}(?:y|ies)` : `${word}(?:e?s)?`;
}

// One keyword → a whole-word, phrase-aware pattern fragment, or null if the
// keyword has no letters or digits. Tokens are [a-z0-9]+, so nothing needs
// escaping. The separator excludes "\n" so a phrase can't span two fields.
function keywordPattern(keyword: string): string | null {
  const parts = words(keyword);
  if (!parts.length) return null;
  const last = parts.length - 1;
  return parts.map((w, i) => (i === last ? withPlural(w) : w)).join('[^a-z0-9\\n]+');
}

// A pill's keywords compiled into one pattern (a story matches if ANY keyword
// does). Null when no keyword is matchable — such a pill matches nothing.
// Non-global on purpose: a /g regex's `test` is stateful across calls.
export function compilePill(keywords: readonly string[]): RegExp | null {
  const alternatives = keywords.map(keywordPattern).filter((p): p is string => p !== null);
  if (!alternatives.length) return null;
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`);
}

const storyTexts = new WeakMap<StoryIndexEntry, string>();

function storyText(story: StoryIndexEntry): string {
  let text = storyTexts.get(story);
  if (text === undefined) {
    const place = story.primary_location;
    text = fold([story.title, story.short_summary, place?.name, place?.country].filter(Boolean).join('\n'));
    storyTexts.set(story, text);
  }
  return text;
}

export function storyMatches(pattern: RegExp, story: StoryIndexEntry): boolean {
  return pattern.test(storyText(story));
}

// The first keyword match inside `text`, as [start, end) offsets into the
// ORIGINAL string — for underlining the hit in a headline. Folding can change
// length (a ligature becomes two letters), so offsets are mapped back per
// character rather than assumed to line up.
export function matchRange(pattern: RegExp, text: string): [number, number] | null {
  let folded = '';
  const origin: number[] = [];
  let offset = 0;
  for (const char of text) {
    const f = fold(char);
    folded += f;
    for (let i = 0; i < f.length; i++) origin.push(offset);
    offset += char.length;
  }
  origin.push(offset);

  const hit = pattern.exec(folded);
  if (!hit) return null;
  // Extend past folded characters that came from the same source character,
  // so the range never splits one (e.g. a match ending inside a ligature).
  let end = hit.index + hit[0].length;
  while (origin[end] === origin[end - 1]) end++;
  return [origin[hit.index], origin[end]];
}
