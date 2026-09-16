import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ctaRenderSchema, ctaSpec } from '../cta';
import { aiSchemaOf } from '../dsl';
import { emitPayloadBlock } from '../emit/emitPayloadBlock';

describe('single-action CTA contract', () => {
  it('exposes only the primary action in authoring, render and AI schemas', () => {
    const names = emitPayloadBlock(ctaSpec).fields.flatMap((field) =>
      'name' in field ? [field.name] : [],
    );
    const ai = aiSchemaOf(ctaSpec);
    for (const fields of [
      names,
      Object.keys(ctaRenderSchema.shape),
      Object.keys(z.toJSONSchema(ai).properties ?? {}),
    ]) {
      expect(fields).toContain('primaryAction');
      expect(fields).toContain('primaryActionUrl');
      expect(fields).not.toContain('secondaryAction');
      expect(fields).not.toContain('secondaryActionUrl');
    }
    const legacy = {
      blockType: 'cta',
      title: 'Next step',
      primaryAction: 'Book',
      secondaryAction: 'Other',
      secondaryActionUrl: 'https://example.com',
    };
    for (const schema of [ctaRenderSchema, ai]) {
      const parsed = schema.parse(legacy);
      expect(parsed).not.toHaveProperty('secondaryAction');
      expect(parsed).not.toHaveProperty('secondaryActionUrl');
    }
  });
});
