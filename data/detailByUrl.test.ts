import { detailPath, followSurvivor, mapDetailFetchError } from './detailByUrl';
import { GoneError, HttpError } from '@/lib/fetch';

describe('detailPath', () => {
  test.each([
    ['story', 'sy_abc', 'stories/sy_abc.json'],
    ['perspective', 'pp_def', 'perspectives/pp_def.json'],
    ['actor', 42, 'actors/42.json'],
  ] as const)('%s %s → %s', (surface, id, path) => {
    expect(detailPath(surface, id)).toBe(path);
  });
});

describe('followSurvivor', () => {
  type Story = { id: string; superseded_by?: { id: string; title: string; detail_url: string } | null };
  const ptr = (id: string) => ({ id, title: id, detail_url: `stories/${id}.json` });
  const fetcher = (graph: Record<string, Story>) => {
    const fetched: string[] = [];
    const fetchUrl = async (url: string) => {
      fetched.push(url);
      return graph[url];
    };
    return { fetched, fetchUrl };
  };

  test('unmerged story returns as-is, no fetches', async () => {
    const { fetched, fetchUrl } = fetcher({});
    const story: Story = { id: 'sy_a', superseded_by: null };
    await expect(followSurvivor(story, fetchUrl)).resolves.toBe(story);
    expect(fetched).toEqual([]);
  });

  test('merged story forwards one hop to its survivor', async () => {
    const survivor: Story = { id: 'sy_b' };
    const { fetched, fetchUrl } = fetcher({ 'stories/sy_b.json': survivor });
    const merged: Story = { id: 'sy_a', superseded_by: ptr('sy_b') };
    await expect(followSurvivor(merged, fetchUrl)).resolves.toBe(survivor);
    expect(fetched).toEqual(['stories/sy_b.json']);
  });

  test('a cycle stops at the hop cap instead of looping', async () => {
    const a: Story = { id: 'sy_a', superseded_by: ptr('sy_b') };
    const b: Story = { id: 'sy_b', superseded_by: ptr('sy_a') };
    const { fetched, fetchUrl } = fetcher({
      'stories/sy_a.json': a,
      'stories/sy_b.json': b,
    });
    await expect(followSurvivor(a, fetchUrl)).resolves.toBeDefined();
    expect(fetched.length).toBe(3);
  });
});

describe('mapDetailFetchError', () => {
  const url = 'stories/sy_abc.json';

  test.each([404, 403])('HttpError %i → GoneError (removed object)', (status) => {
    const mapped = mapDetailFetchError(new HttpError('gone', status, url), url);
    expect(mapped).toBeInstanceOf(GoneError);
    expect((mapped as GoneError).url).toBe(url);
  });

  test.each([500, 503, 429, 408, 0])('HttpError %i → passes through (retry/error path)', (status) => {
    const original = new HttpError('transient', status, url);
    expect(mapDetailFetchError(original, url)).toBe(original);
  });

  test('non-HttpError passes through unchanged', () => {
    const original = new TypeError('network down');
    expect(mapDetailFetchError(original, url)).toBe(original);
  });
});

