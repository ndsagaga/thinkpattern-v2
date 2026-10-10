import { splitInline } from './markdown';

describe('splitInline', () => {
  test('bold segment', () =>
    expect(splitInline('a **b** c')).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'bold', value: 'b' },
      { kind: 'text', value: ' c' },
    ]));

  test('italic via * and _', () =>
    expect(splitInline('*x* and _y_')).toEqual([
      { kind: 'italic', value: 'x' },
      { kind: 'text', value: ' and ' },
      { kind: 'italic', value: 'y' },
    ]));

  test('bold is not mis-read as two italics', () =>
    expect(splitInline('**bold**')).toEqual([{ kind: 'bold', value: 'bold' }]));

  test('plain text passes through unchanged', () =>
    expect(splitInline('no markdown here')).toEqual([
      { kind: 'text', value: 'no markdown here' },
    ]));

  test('emphasis never crosses a newline (paragraph breaks survive)', () =>
    expect(splitInline('a\n\nb **c**')).toEqual([
      { kind: 'text', value: 'a\n\nb ' },
      { kind: 'bold', value: 'c' },
    ]));
});
