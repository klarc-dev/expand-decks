import { describe, expect, it } from 'vitest';

import { prepareSlidesForRender } from '../renderSlides';

function textNodes(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value)) return value.map(textNodes).join('');
  const record = value as Record<string, unknown>;
  const own = record.type === 'text' && typeof record.text === 'string' ? record.text : '';
  return own + textNodes(record.children) + textNodes(record.root);
}

describe('prepareSlidesForRender', () => {
  it('converts generated rich-text markdown to Lexical before export', async () => {
    const [slide] = await prepareSlidesForRender([
      {
        blockType: 'statement',
        title: 'A decision rule',
        body: 'Keep this **visible** in the rendered deck.',
        footer: 'Supporting note',
      },
    ]);

    expect(slide).toMatchObject({ blockType: 'statement', title: 'A decision rule' });
    expect(typeof slide.body).toBe('object');
    expect(textNodes(slide.body)).toContain('Keep this visible in the rendered deck.');
    expect(textNodes(slide.footer)).toContain('Supporting note');
  });

  it('does not mutate the AI-facing slide objects', async () => {
    const source = {
      blockType: 'cover',
      title: 'Decision quality',
      subtitle: 'A visible subtitle',
    };

    await prepareSlidesForRender([source]);

    expect(source.subtitle).toBe('A visible subtitle');
  });
});
