import { describe, expect, it } from 'vitest';

import { renderAgenda } from '../blocks/agenda';

const base = {
  blockType: 'agenda' as const,
  title: 'Au programme',
  eyebrow: null,
  surface: null,
  items: null,
  active: null,
};

describe('renderAgenda', () => {
  it('auto-derives the list from ctx.sections when items are empty', () => {
    const out = renderAgenda(base, { sections: ['Comprendre', 'Sécuriser', 'Décider'] });
    expect(out).toContain('Comprendre');
    expect(out).toContain('Sécuriser');
    expect(out).toContain('Décider');
    // Numbered in order.
    expect(out.indexOf('01')).toBeLessThan(out.indexOf('02'));
    expect(out).toContain('>03<');
  });

  it('prefers authored items over the section fallback', () => {
    const out = renderAgenda(
      { ...base, items: [{ label: 'Custom A', description: null }] },
      { sections: ['Ignored Section'] },
    );
    expect(out).toContain('Custom A');
    expect(out).not.toContain('Ignored Section');
  });

  it('renders an empty list when there are no items and no sections', () => {
    const out = renderAgenda(base, {});
    expect(out).toContain('Au programme');
    expect(out).toContain('k-agenda');
  });

  it('highlights the active row and dims the rest', () => {
    const out = renderAgenda({ ...base, active: 2 }, { sections: ['One', 'Two', 'Three'] });
    expect(out).toContain('k-ag-item--active');
    expect(out).toContain('k-ag-item--dim');
  });
});
