import { describe, expect, it } from 'vitest';

import { deckHasMermaid } from '../exportSlidePngs';

describe('deckHasMermaid', () => {
  it('returns false when a deck has no Mermaid fence', () => {
    expect(deckHasMermaid('# Slide\n\n```ts\nconst x = 1\n```')).toBe(false);
  });

  it('returns true for a top-level Mermaid fence', () => {
    expect(deckHasMermaid('# Diagram\n\n```mermaid\nflowchart TD\n  A --> B\n```')).toBe(true);
  });
});
