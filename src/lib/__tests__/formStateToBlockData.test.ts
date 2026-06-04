import { describe, expect, it } from 'vitest';

import { formStateToBlockData } from '../formStateToBlockData';

const f = (value: unknown) => ({ value });

describe('formStateToBlockData()', () => {
  it('collects flat sibling fields of the block', () => {
    const fields = {
      'slides.0.blockType': f('cover'),
      'slides.0.title': f('Hello'),
      'slides.0.eyebrow': f('TAG'),
      'slides.1.title': f('Other block'),
      title: f('Doc title'),
    };
    expect(formStateToBlockData(fields, 'slides.0.preview')).toEqual({
      blockType: 'cover',
      title: 'Hello',
      eyebrow: 'TAG',
    });
  });

  it('rebuilds nested array rows (cards, stats, quotes)', () => {
    const fields = {
      'slides.2.blockType': f('cardGrid'),
      'slides.2.title': f('Grid'),
      'slides.2.cards.0.title': f('A'),
      'slides.2.cards.0.description': f('da'),
      'slides.2.cards.1.title': f('B'),
    };
    expect(formStateToBlockData(fields, 'slides.2.preview')).toEqual({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: [{ title: 'A', description: 'da' }, { title: 'B' }],
    });
  });

  it('treats array-parent entries (row count + rows) as arrays, not scalars', () => {
    const fields = {
      'slides.0.blockType': f('stats'),
      'slides.0.title': f('Numbers'),
      'slides.0.stats': { value: 2, rows: [{ id: 'a' }, { id: 'b' }] },
      'slides.0.stats.0.value': f('42'),
      'slides.0.stats.0.label': f('Things'),
      'slides.0.stats.1.value': f('7'),
      'slides.0.stats.1.label': f('Others'),
    };
    expect(formStateToBlockData(fields, 'slides.0.preview')).toEqual({
      blockType: 'stats',
      title: 'Numbers',
      stats: [
        { value: '42', label: 'Things' },
        { value: '7', label: 'Others' },
      ],
    });
  });

  it('materializes an empty array for a rowless array field (fresh block)', () => {
    const fields = {
      'slides.0.blockType': f('stats'),
      'slides.0.stats': { value: 0, rows: [] },
    };
    expect(formStateToBlockData(fields, 'slides.0.preview')).toEqual({
      blockType: 'stats',
      stats: [],
    });
  });

  it('excludes the preview field itself and unrelated paths', () => {
    const fields = {
      'slides.0.blockType': f('statement'),
      'slides.0.preview': f(null),
      'slides.10.title': f('Not mine'),
    };
    const out = formStateToBlockData(fields, 'slides.0.preview');
    expect(out).toEqual({ blockType: 'statement' });
  });

  it('returns empty object when the block has no fields yet', () => {
    expect(formStateToBlockData({}, 'slides.0.preview')).toEqual({});
  });
});
