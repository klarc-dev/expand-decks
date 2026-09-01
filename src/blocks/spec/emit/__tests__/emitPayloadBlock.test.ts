import { describe, expect, it } from 'vitest';

import { cardGridSpec } from '../../cardGrid';
import { statementSpec } from '../../statement';
import { SLIDE_LIMITS } from '../../limits';
import { emitPayloadBlock } from '../emitPayloadBlock';

function field(blockType: typeof statementSpec | typeof cardGridSpec, name: string) {
  return emitPayloadBlock(blockType).fields.find(
    (candidate) => 'name' in candidate && candidate.name === name,
  );
}

describe('emitPayloadBlock', () => {
  it('projects common and rich-text limits for statement fields', () => {
    expect(field(statementSpec, 'eyebrow')).toMatchObject({
      maxLength: SLIDE_LIMITS.common.eyebrow.max,
    });
    expect(field(statementSpec, 'title')).toMatchObject({
      maxLength: SLIDE_LIMITS.common.title.max,
    });
    expect(field(statementSpec, 'body')).toMatchObject({ validate: expect.any(Function) });
    expect(field(statementSpec, 'body')).not.toHaveProperty('maxLength');
  });

  it('projects select options and nested array limits for card grids', () => {
    expect(field(cardGridSpec, 'columns')).toMatchObject({
      options: [
        { label: '2 colonnes', value: '2' },
        { label: '3 colonnes', value: '3' },
        { label: '4 colonnes', value: '4' },
      ],
    });
    const cards = field(cardGridSpec, 'cards');
    expect(cards).toMatchObject({
      minRows: SLIDE_LIMITS.cardGrid.cards.min,
      maxRows: SLIDE_LIMITS.cardGrid.cards.max,
    });
    const fields = cards && 'fields' in cards ? cards.fields : [];
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'number',
          maxLength: SLIDE_LIMITS.cardGrid.cardNumber.max,
        }),
        expect.objectContaining({ name: 'title', maxLength: SLIDE_LIMITS.cardGrid.cardTitle.max }),
        expect.objectContaining({ name: 'description', validate: expect.any(Function) }),
      ]),
    );
    expect(
      fields.find((candidate) => 'name' in candidate && candidate.name === 'description'),
    ).not.toHaveProperty('maxLength');
  });
});
