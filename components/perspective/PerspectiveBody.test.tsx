import fs from 'fs';
import path from 'path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { PerspectiveBody } from './PerspectiveBody';
import { buildPerspectiveCtx } from './context';
import type { PerspectiveDetail } from '@/types/contract';

// expo-router needs a navigation context a unit render doesn't have. Stub the
// bits the renderer touches: useRouter (footnote/card taps) and Link (cards,
// source rail, quote provenance) as a passthrough wrapper.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const FIX_DIR = path.join(__dirname, '__fixtures__');
const fixtures = fs
  .readdirSync(FIX_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({
    name: f,
    p: JSON.parse(fs.readFileSync(path.join(FIX_DIR, f), 'utf8')) as PerspectiveDetail,
  }));

// Recursively collect every rendered string from a react-test-renderer tree.
function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join('');
  return collectText((node as { children?: unknown }).children);
}

function renderBodyText(p: PerspectiveDetail): string {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(<PerspectiveBody perspective={p} />);
  });
  const text = collectText(r.toJSON());
  act(() => {
    r.unmount();
  });
  return text;
}

const RAW_TAG =
  /<\/?(?:card|quote|stat|callout|divide|timeline|then-now|instances|connection|prose|camp|step|item|node|then|now|define)\b/;
const RAW_ANCHOR = /\[(?:sy|pp|qt)_[0-9a-f]+/;

describe('PerspectiveBody renders the golden corpus', () => {
  test('all 10 fixtures load', () => {
    expect(fixtures.length).toBe(10);
  });

  test.each(fixtures.map((f) => [f.name, f.p] as const))(
    '%s — no raw tokens or tags leak, source rail counts',
    (_name, p) => {
      const text = renderBodyText(p);
      expect(text).not.toMatch(RAW_ANCHOR);
      expect(text).not.toMatch(RAW_TAG);
      const cites = p.citations?.length ?? 0;
      if (cites > 0) expect(text).toContain(`Sources · ${cites}`);
    },
  );

  test('inline markdown in body prose renders without leaking markers', () => {
    const p = {
      id: 'pp_md',
      shape: 'thread',
      title: 'T',
      thesis: 'th',
      topic: null,
      body: '',
      published_at: '2026-01-01T00:00:00Z',
      citations: [],
      quotes: [],
      cards: [],
      entities: [],
      body_nodes: [
        { type: 'prose', spans: [{ kind: 'text', text: 'A **bold** and *italic* and _under_ word.' }] },
      ],
    } as unknown as PerspectiveDetail;
    const text = renderBodyText(p);
    expect(text).toContain('bold');
    expect(text).toContain('italic');
    expect(text).toContain('under');
    expect(text).not.toContain('**');
    expect(text).not.toContain('_under_');
  });

  test('footnote numbers follow citations[] first-appearance order', () => {
    for (const { p } of fixtures) {
      const ctx = buildPerspectiveCtx(p);
      (p.citations ?? []).forEach((c, i) => expect(ctx.citeNum[c.id]).toBe(i + 1));
    }
  });

  test('the corpus exercises all 10 block types', () => {
    const seen = new Set<string>();
    for (const { p } of fixtures) {
      for (const node of p.body_nodes ?? []) seen.add(node.type);
    }
    expect([...seen].sort()).toEqual(
      [
        'callout',
        'card',
        'connection',
        'divide',
        'instances',
        'prose',
        'quote',
        'stat',
        'then_now',
        'timeline',
      ].sort(),
    );
  });
});
