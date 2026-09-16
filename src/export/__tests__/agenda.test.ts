import { describe, expect, it } from 'vitest';

import { renderAgenda } from '../blocks/agenda';

const base = {
  blockType: 'agenda' as const,
  title: 'Au programme',
  eyebrow: null,
  items: null,
  active: null,
};

describe('renderAgenda', () => {
  it('auto-derives the list from ctx.sections when items are empty', () => {
    const out = renderAgenda(base, {
      sections: ['Comprendre', 'Sécuriser', 'Décider'],
    });
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

  it('keeps small agendas (<4 rows) centered without the fitted treatment', () => {
    const out = renderAgenda(base, { sections: ['One', 'Two', 'Three'] });
    expect(out).not.toContain('k-agenda--fit');
    expect(out).toContain('k-content-main--center');
  });

  it('switches to the height-fitted layout once the list can crowd the canvas', () => {
    const out = renderAgenda(base, {
      sections: ['One', 'Two', 'Three', 'Four', 'Five'],
    });
    // Fitted mode: list fills the content-main row and shares it across rows, so
    // the canvas bounds the layout regardless of count — no overflow into chrome.
    expect(out).toContain('k-agenda--fit');
    expect(out).toContain('k-content-main--stretch');
  });

  it('gives short uncrowded lists the roomy ledger type and spans labels when nothing is described', () => {
    const roomy = renderAgenda(base, {
      sections: ['One', 'Two', 'Three', 'Four'],
    });
    expect(roomy).toContain('k-agenda--roomy');
    expect(roomy).toContain('k-agenda--plain');

    const described = renderAgenda(
      {
        ...base,
        items: [
          { label: 'One', description: 'A line under the chapter' },
          { label: 'Two', description: null },
        ],
      },
      {},
    );
    expect(described).toContain('k-agenda--roomy');
    expect(described).not.toContain('k-agenda--plain');

    const long = renderAgenda(base, {
      sections: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
    });
    expect(long).not.toContain('k-agenda--roomy');
  });

  it('links an authored row to its slide by block id through the deck fold', () => {
    const out = renderAgenda(
      {
        ...base,
        items: [{ label: 'Produit', description: null, slideId: 'b2' }],
      },
      {
        slideRefs: [
          { id: 'b1', blockType: 'cover' },
          { id: 'b2', blockType: 'twoCols', title: 'Produit' },
        ],
      },
    );
    expect(out).toContain('<Link :to="2" class="k-ag-link">Produit</Link>');
  });

  it('links derived section rows to their own section slides', () => {
    const out = renderAgenda(base, {
      sections: ['Intro', 'Roadmap'],
      slideRefs: [
        { id: 'a', blockType: 'cover' },
        { id: 'b', blockType: 'section', title: 'Intro' },
        { id: 'c', blockType: 'statement' },
        { id: 'd', blockType: 'section', title: 'Roadmap' },
      ],
    });
    expect(out).toContain('<Link :to="2" class="k-ag-link">Intro</Link>');
    expect(out).toContain('<Link :to="4" class="k-ag-link">Roadmap</Link>');
  });

  it('renders plain labels when the row has no target or the slide is gone', () => {
    const out = renderAgenda(
      {
        ...base,
        items: [
          { label: 'Plain', description: null },
          { label: 'Orphan', description: null, slideId: 'missing' },
        ],
      },
      { slideRefs: [{ id: 'b1', blockType: 'cover' }] },
    );
    expect(out).not.toContain('<Link');
    expect(out).toContain('>Plain</h3>');
    expect(out).toContain('>Orphan</h3>');
  });
});
