import { actorFields, perspectiveFields, searchIndex, type SearchField } from './search';
import type { ActorIndexEntry, PerspectiveIndexEntry } from '@/types/contract';

// Covers the on-device ranker, which after the story-search migration serves
// the actors and perspectives lenses only.
//
// NOT covered here: story search. It is ranked server-side by the worker's
// `GET /api/search` (D1 + FTS5), so the behaviour under test lives in the
// backend repo; on this side the surface is a fetch + envelope unwrap. The
// end-to-end path is a Maestro concern (see maestro/README.md).

const fields = (item: { text: string; weight?: number }): SearchField[] => [
  { text: item.text, weight: item.weight ?? 1 },
];

describe('searchIndex', () => {
  test('blank query returns the list untouched', () => {
    const items = [{ text: 'a' }, { text: 'b' }];
    expect(searchIndex(items, '   ', fields)).toBe(items);
  });

  test('drops entries no query word matches', () => {
    const items = [{ text: 'strait of hormuz' }, { text: 'baltic sea' }];
    expect(searchIndex(items, 'hormuz', fields)).toEqual([{ text: 'strait of hormuz' }]);
  });

  test('matching is OR — one word is enough to be included', () => {
    const items = [{ text: 'baltic sea' }];
    expect(searchIndex(items, 'hormuz sea', fields)).toHaveLength(1);
  });

  test('entries matching more words rank higher', () => {
    const both = { text: 'strait of hormuz' };
    const one = { text: 'hormuz' };
    // `one` is first in the list, so only scoring can put `both` on top.
    expect(searchIndex([one, both], 'hormuz strait', fields)).toEqual([both, one]);
  });

  test('a match in a heavier field outranks a match in a lighter one', () => {
    const light = { text: 'tariffs', weight: 1 };
    const heavy = { text: 'tariffs', weight: 2 };
    expect(searchIndex([light, heavy], 'tariffs', fields)).toEqual([heavy, light]);
  });

  test('ties keep the corpus order (salience), not an arbitrary sort', () => {
    const items = [{ text: 'sea one' }, { text: 'sea two' }, { text: 'sea three' }];
    expect(searchIndex(items, 'sea', fields)).toEqual(items);
  });

  test('a word scores once, via its best field — not once per field', () => {
    // Same word in both a weight-2 and a weight-1 field scores 2, not 3, so it
    // cannot outrank a genuine two-word match (which also scores 2+).
    const dup = { id: 1, name: 'tariff', focus_topics: ['tariff'] } as unknown as ActorIndexEntry;
    const [ranked] = searchIndex([dup], 'tariff', actorFields);
    expect(ranked).toBe(dup);
  });

  test('query casing and surrounding whitespace are ignored', () => {
    const items = [{ text: 'strait of hormuz' }];
    expect(searchIndex(items, '  HORMUZ  ', fields)).toHaveLength(1);
  });
});

describe('actorFields', () => {
  const actor = (name: string, focus_topics: string[] = []) =>
    ({ id: 1, name, focus_topics }) as unknown as ActorIndexEntry;

  test('name outweighs focus topics', () => {
    const [nameField, topicField] = actorFields(actor('Donald Trump', ['trade']));
    expect(nameField).toEqual({ text: 'donald trump', weight: 2 });
    expect(topicField).toEqual({ text: 'trade', weight: 1 });
  });

  test('a name hit ranks above an actor merely focused on that name', () => {
    const subject = actor('Donald Trump');
    const observer = actor('Jane Doe', ['donald trump']);
    expect(searchIndex([observer, subject], 'donald', actorFields)).toEqual([
      subject,
      observer,
    ]);
  });

  test('an actor with no focus topics yields an empty, harmless field', () => {
    expect(actorFields(actor('Jane Doe'))[1]).toEqual({ text: '', weight: 1 });
  });
});

describe('perspectiveFields', () => {
  const perspective = (title: string, thesis: string) =>
    ({ id: 'pp_1', title, thesis }) as unknown as PerspectiveIndexEntry;

  test('title outweighs thesis', () => {
    const titled = perspective('On tariffs', 'Something else entirely');
    const thesised = perspective('On something else', 'A view about tariffs');
    expect(searchIndex([thesised, titled], 'tariffs', perspectiveFields)).toEqual([
      titled,
      thesised,
    ]);
  });

  test('null-ish thesis does not blow up field extraction', () => {
    const p = { id: 'pp_1', title: 'On tariffs', thesis: null } as unknown as PerspectiveIndexEntry;
    expect(perspectiveFields(p)).toEqual([
      { text: 'on tariffs', weight: 2 },
      { text: '', weight: 1 },
    ]);
  });
});
