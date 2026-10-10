import { compilePill, fold, matchRange, storyMatches } from './pillMatch';
import type { StoryIndexEntry } from '@/types/contract';

const story = (
  title: string,
  extra: { summary?: string; place?: string; country?: string } = {},
): StoryIndexEntry => ({
  id: `sy_${title}`,
  title,
  short_summary: extra.summary ?? '',
  topic: 'WORLD',
  time_start: '2026-09-27T00:00:00Z',
  time_end: '2026-09-27T00:00:00Z',
  preview_articles: [],
  article_count: 1,
  salience: 1,
  primary_location: extra.place
    ? {
        location_id: 1,
        name: extra.place,
        country: extra.country ?? null,
        formatted_address: extra.place,
        lat: 0,
        lng: 0,
      }
    : null,
  detail_url: '',
});

const matches = (keywords: string[], s: StoryIndexEntry) => {
  const pattern = compilePill(keywords);
  return pattern !== null && storyMatches(pattern, s);
};

describe('fold', () => {
  test('lowercases and strips accents', () => {
    expect(fold('São Paulo CAFÉ')).toBe('sao paulo cafe');
  });
});

describe('compilePill', () => {
  test('is null when no keyword has a letter or digit', () => {
    expect(compilePill([])).toBeNull();
    expect(compilePill(['  ', '—'])).toBeNull();
  });

  test('skips unmatchable keywords but keeps the rest', () => {
    expect(matches(['—', 'tariff'], story('Tariff talks'))).toBe(true);
  });
});

describe('storyMatches', () => {
  test('matches whole words only', () => {
    expect(matches(['ai'], story('AI labs disclose hacking'))).toBe(true);
    expect(matches(['ai'], story('Minister said Taiwan talks stalled'))).toBe(false);
  });

  test('is case- and accent-insensitive in both directions', () => {
    expect(matches(['sao paulo'], story('Floods hit São Paulo'))).toBe(true);
    expect(matches(['São Paulo'], story('Floods hit Sao Paulo'))).toBe(true);
  });

  test('matches a regular plural of the keyword', () => {
    expect(matches(['tariff'], story('US and China cut tariffs'))).toBe(true);
    expect(matches(['tax'], story('New taxes announced'))).toBe(true);
    expect(matches(['policy'], story('Central bank policies diverge'))).toBe(true);
    expect(matches(['day'], story('Three days of talks'))).toBe(true);
  });

  test('does not strip a plural keyword down to its singular', () => {
    expect(matches(['tariffs'], story('A tariff on steel'))).toBe(false);
  });

  test('treats a multi-word keyword as a phrase, across spacing and punctuation', () => {
    expect(matches(['trade war'], story('Fears of a trade war grow'))).toBe(true);
    expect(matches(['trade war'], story('A trade-war truce'))).toBe(true);
    expect(matches(['trade war'], story('Trade talks as war rages'))).toBe(false);
  });

  test('pluralizes only the last word of a phrase', () => {
    expect(matches(['rate hike'], story('Fed signals more rate hikes'))).toBe(true);
    expect(matches(['rate hike'], story('Rates hike again'))).toBe(false);
  });

  test('matches if ANY keyword matches', () => {
    expect(matches(['cricket', 'tariff'], story('Tariff refund'))).toBe(true);
    expect(matches(['cricket', 'ipl'], story('Tariff refund'))).toBe(false);
  });

  test('searches the summary and primary location, not just the title', () => {
    expect(matches(['xi'], story('Summit ends', { summary: 'Trump and Xi agreed' }))).toBe(true);
    expect(matches(['india'], story('Police detain leaders', { place: 'Guwahati', country: 'India' }))).toBe(true);
  });

  test('a phrase does not span two fields', () => {
    expect(matches(['talks washington'], story('Summit talks', { place: 'Washington' }))).toBe(false);
  });

  test('evaluates repeatedly without state carrying over', () => {
    const pattern = compilePill(['tariff'])!;
    const s = story('Tariff cut');
    expect(storyMatches(pattern, s)).toBe(true);
    expect(storyMatches(pattern, s)).toBe(true);
  });
});

describe('matchRange', () => {
  test('returns offsets into the original text', () => {
    const title = 'US and China Cut Tariffs on Goods';
    const [start, end] = matchRange(compilePill(['tariff'])!, title)!;
    expect(title.slice(start, end)).toBe('Tariffs');
  });

  test('maps back through accents', () => {
    const title = 'Floods hit São Paulo today';
    const [start, end] = matchRange(compilePill(['sao paulo'])!, title)!;
    expect(title.slice(start, end)).toBe('São Paulo');
  });

  test('is null when nothing matches', () => {
    expect(matchRange(compilePill(['cricket'])!, 'Tariff refund')).toBeNull();
  });
});
