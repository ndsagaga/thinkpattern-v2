// Minimal ambient declaration for react-test-renderer (a devDependency with no
// bundled types and no @types package installed). Covers only what the
// perspective renderer tests use: create() + act() + toJSON()/unmount().
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export type ReactTestRendererJSON = {
    type: string;
    props: Record<string, unknown>;
    children: null | (string | ReactTestRendererJSON)[];
  };

  export interface ReactTestRenderer {
    toJSON(): ReactTestRendererJSON | ReactTestRendererJSON[] | null;
    unmount(): void;
    update(element: ReactElement): void;
    root: unknown;
  }

  export function create(element: ReactElement, options?: unknown): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): void;
}
