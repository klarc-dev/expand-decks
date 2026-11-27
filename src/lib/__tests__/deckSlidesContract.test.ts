import { describe, expect, it } from 'vitest';
import {
  deckSlidesCommandSchema,
  deckSlidesRevision,
  parseReadDeckSlidesQuery,
} from '../deckSlidesContract';

describe('parseReadDeckSlidesQuery', () => {
  it('decodes list and get targets', () => {
    expect(parseReadDeckSlidesQuery(new URLSearchParams('deckId=42'))).toEqual({ deckId: 42 });
    expect(parseReadDeckSlidesQuery(new URLSearchParams('deckId=42&slideId=stable-block'))).toEqual(
      { deckId: 42, slideId: 'stable-block' },
    );
  });

  it.each([
    '',
    'deckId=',
    'deckId=0',
    'deckId=2147483648',
    'deckId=4e2',
    'deckId=42&deckId=9',
    'deckId=42&slideId=',
    'deckId=42&slideId=a&slideId=b',
    'deckId=42&action=delete',
  ])('rejects malformed or ambiguous read query %s', (query) => {
    expect(parseReadDeckSlidesQuery(new URLSearchParams(query))).toBeNull();
  });
});

const deckId = 42;
const slideId = 'stable-block';
const expectedRevision = 'a'.repeat(64);
const target = { deckId, slideId, expectedRevision };

function valid(input: unknown) {
  return deckSlidesCommandSchema.safeParse(input).success;
}

describe('deckSlidesCommandSchema', () => {
  it('accepts typed insert and partial update using the native block fields', () => {
    expect(
      valid({
        action: 'insert',
        deckId,
        expectedRevision,
        index: 0,
        slide: { blockType: 'statement', title: 'New' },
      }),
    ).toBe(true);
    expect(
      valid({
        action: 'update',
        ...target,
        patch: { blockType: 'statement', title: 'Change only title' },
      }),
    ).toBe(true);
    expect(valid({ action: 'update', ...target, patch: { blockType: 'no-such-block' } })).toBe(
      false,
    );
    expect(
      valid({ action: 'update', ...target, patch: { blockType: 'statement', id: 'foreign' } }),
    ).toBe(false);
    expect(
      valid({ action: 'update', ...target, patch: { blockType: 'statement', layoutContent: {} } }),
    ).toBe(false);
    expect(
      valid({
        action: 'update',
        ...target,
        patch: { blockType: 'statement', body: '**not Lexical**' },
      }),
    ).toBe(false);
  });

  it('requires a stable ID, revision and valid destination for writes', () => {
    expect(valid({ action: 'move', ...target, index: 0 })).toBe(true);
    expect(valid({ action: 'move', deckId, slideIndex: 1, expectedRevision, index: 0 })).toBe(
      false,
    );
    expect(valid({ action: 'move', ...target, index: -1 })).toBe(false);
    expect(valid({ action: 'move', ...target, expectedRevision: 'not-a-revision', index: 0 })).toBe(
      false,
    );
  });

  it('allows preparing but never executing deletion through the command schema', () => {
    expect(valid({ action: 'prepare-delete', ...target })).toBe(true);
    expect(valid({ action: 'prepare-delete', ...target, confirm: true })).toBe(false);
    expect(valid({ action: 'delete', ...target })).toBe(false);
    expect(valid({ action: 'list', deckId })).toBe(false);
    expect(valid({ action: 'get', deckId, slideId })).toBe(false);
  });
});

describe('deckSlidesRevision', () => {
  const first = { id: 'a', nested: { z: 'test', b: 'sample' } };
  const second = { id: 'b' };
  const revision = deckSlidesRevision([first, second], 'presentation');

  it('is deterministic despite object key insertion order', () => {
    expect(
      deckSlidesRevision([{ nested: { b: 'sample', z: 'test' }, id: 'a' }, second], 'presentation'),
    ).toBe(revision);
  });

  it('changes on an ID or content edit, reorder, or template change', () => {
    expect(deckSlidesRevision([{ ...first, id: 'c' }, second], 'presentation')).not.toBe(revision);
    expect(
      deckSlidesRevision([{ ...first, nested: { z: 'changed' } }, second], 'presentation'),
    ).not.toBe(revision);
    expect(deckSlidesRevision([second, first], 'presentation')).not.toBe(revision);
    expect(deckSlidesRevision([first, second], 'linkedin-carousel')).not.toBe(revision);
  });
});
