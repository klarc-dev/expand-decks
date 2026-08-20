import { describe, expect, it } from 'vitest';

import { aiSchemaOf } from '../../dsl';
import { sectionSpec } from '../../section';
import { emitOutlineSchema } from '../emitDraftSchema';

describe('AI title schemas', () => {
  it('rejects Markdown decoration in outline titles', () => {
    const schema = emitOutlineSchema([sectionSpec]);
    const result = schema.safeParse({
      slides: Array.from({ length: 3 }, () => ({
        blockType: 'section',
        title: '**ARTICLE 1 — DOCUMENTS CONTRACTUELS**',
        intent: 'Introduce the contractual framework',
      })),
    });

    expect(result.success).toBe(false);
  });

  it('accepts the same punctuation as plain text', () => {
    const schema = emitOutlineSchema([sectionSpec]);
    const result = schema.safeParse({
      slides: Array.from({ length: 3 }, () => ({
        blockType: 'section',
        title: 'ARTICLE 1 — DOCUMENTS CONTRACTUELS, COMMANDES & CONDITIONS COMMERCIALES',
        intent: 'Introduce the contractual framework',
      })),
    });

    expect(result.success).toBe(true);
  });

  it('rejects sentence-style titles ending with sentence punctuation', () => {
    const schema = emitOutlineSchema([sectionSpec]);
    const result = schema.safeParse({
      slides: Array.from({ length: 3 }, () => ({
        blockType: 'section',
        title: 'Le processus comporte trois étapes.',
        intent: 'Explain the three stages',
      })),
    });

    expect(result.success).toBe(false);
  });

  it('rejects Markdown decoration in drafted block titles', () => {
    const schema = aiSchemaOf(sectionSpec);

    expect(
      schema.safeParse({
        blockType: 'section',
        title: '**ARTICLE 1 — DOCUMENTS CONTRACTUELS**',
      }).success,
    ).toBe(false);
  });
});
