import { describe, expect, it } from 'vitest';
import { coverSpec, coverRenderSchema } from '../cover';
import { aiSchemaOf, renderSchemaOf, promptLinesOf } from '../dsl';
import { SLIDE_LIMITS } from '../limits';
import { emitPayloadBlock } from '../emit/emitPayloadBlock';
import { renderCover } from '../../../export/blocks/cover';

const base = { blockType: 'cover' as const, title: 'Title' };
describe('cover pills', () => {
  it('projects bounded authorable rows to Payload, AI, render and prompt', () => {
    const limit = SLIDE_LIMITS.cover.pills;
    const field = emitPayloadBlock(coverSpec).fields.find((f) => 'name' in f && f.name === 'pills');
    expect(field).toMatchObject({
      type: 'array',
      minRows: limit.min,
      maxRows: limit.max,
      fields: [
        expect.objectContaining({ name: 'text', required: true, maxLength: limit.text.max }),
      ],
    });
    for (const schema of [aiSchemaOf(coverSpec), renderSchemaOf(coverSpec), coverRenderSchema]) {
      expect(
        schema.safeParse({ ...base, pills: [{ text: 'Toulouse' }, { text: 'Lyon' }] }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          ...base,
          pills: Array.from({ length: limit.max + 1 }, () => ({ text: 'x' })),
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ ...base, pills: [{ text: 'x'.repeat(limit.text.max + 1) }] }).success,
      ).toBe(false);
      expect(schema.safeParse({ ...base, pills: [{ text: '   ' }] }).success).toBe(false);
    }
    expect(promptLinesOf(coverSpec)).toContain(`pills: ${limit.min}–${limit.max} éléments`);
    expect(promptLinesOf(coverSpec)).toContain(`pills[].text: ${limit.text.max} caractères max`);
  });
  it('renders multiple, single and absent pills, escaping authored text', () => {
    const html = renderCover({ ...base, pills: [{ text: 'Toulouse' }, { text: '<Lyon & "x">' }] });
    expect(html.match(/class="k-eyebrow"/g)).toHaveLength(2);
    expect(html).toContain('&lt;Lyon &amp; &quot;x&quot;&gt;');
    expect(
      renderCover({ ...base, pills: [{ text: 'One' }] }).match(/class="k-eyebrow"/g),
    ).toHaveLength(1);
    for (const pills of [undefined, null, []])
      expect(renderCover({ ...base, pills })).not.toContain('k-eyebrow');
  });
  it('preserves the complete legacy eyebrow when no new rows exist, without separator splitting', () => {
    for (const pills of [undefined, null, []]) {
      const html = renderCover({ ...base, eyebrow: 'TOULOUSE · LYON', pills });
      expect(html).toContain('TOULOUSE · LYON');
      expect(html.match(/class="k-eyebrow"/g)).toHaveLength(1);
    }
    expect(renderCover({ ...base, eyebrow: 'Legacy', pills: [{ text: 'New' }] })).not.toContain(
      'Legacy',
    );
  });
});
