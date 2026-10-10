import { orderArticlesByRecency } from './sources';
import type { ExportArticle } from '@/types/contract';

// Minimal article fixture — only the fields the ordering reads. `id` doubles
// as an identity marker so assertions can check order without comparing dates.
function article(id: string, published_at: string): ExportArticle {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source_domain: 'example.com',
    published_at,
  };
}

const ids = (arr: ExportArticle[]) => arr.map((a) => a.id);

describe('orderArticlesByRecency', () => {
  test('sorts most-recent first regardless of input order', () => {
    const input = [
      article('old', '2026-05-01T00:00:00Z'),
      article('new', '2026-05-03T00:00:00Z'),
      article('mid', '2026-05-02T00:00:00Z'),
    ];
    expect(ids(orderArticlesByRecency(input))).toEqual(['new', 'mid', 'old']);
  });

  test('does not mutate the input array', () => {
    const input = [
      article('a', '2026-05-01T00:00:00Z'),
      article('b', '2026-05-02T00:00:00Z'),
    ];
    const before = ids(input);
    orderArticlesByRecency(input);
    expect(ids(input)).toEqual(before);
  });

  test('equal timestamps keep their backend-relative order (stable)', () => {
    const same = '2026-05-02T00:00:00Z';
    const input = [article('first', same), article('second', same), article('third', same)];
    expect(ids(orderArticlesByRecency(input))).toEqual(['first', 'second', 'third']);
  });

  test('unparseable dates sink to the bottom, keeping their relative order', () => {
    const input = [
      article('bad1', 'not-a-date'),
      article('good', '2026-05-02T00:00:00Z'),
      article('bad2', ''),
    ];
    expect(ids(orderArticlesByRecency(input))).toEqual(['good', 'bad1', 'bad2']);
  });

  test('empty input returns empty', () => {
    expect(orderArticlesByRecency([])).toEqual([]);
  });
});
