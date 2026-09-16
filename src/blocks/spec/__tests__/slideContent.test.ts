import { describe, expect, it } from 'vitest';

import { renderBlockPreview } from '@/export/preview';
import { getRenderer } from '@/export/renderers';

import { ALL_SPECS } from '../index';
import {
  analyzeSlideLayouts,
  applyLayoutProjection,
  normalizeMedia,
  normalizeSlideContent,
  SPECIALIZED_LAYOUT_BEHAVIOR,
  undoLayoutProjection,
} from '../slideContent';

const rich = (text: string) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text, version: 1 }], version: 1 }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
});

const fixtures: Record<string, Record<string, unknown>> = {
  cover: { blockType: 'cover', title: 'Cover' },
  section: { blockType: 'section', title: 'Section' },
  statement: { blockType: 'statement', title: 'Statement' },
  twoCols: { blockType: 'twoCols', title: 'Columns', rightCards: [{ title: 'A' }] },
  cardGrid: { blockType: 'cardGrid', title: 'Cards', cards: [{ title: 'A' }, { title: 'B' }] },
  stats: { blockType: 'stats', title: 'Stats', stats: [{ value: '1', label: 'A' }] },
  quotes: {
    blockType: 'quotes',
    title: 'Quotes',
    quotes: [{ quote: rich('Q'), authorName: 'A' }],
  },
  cta: { blockType: 'cta', title: 'Act' },
  table: {
    blockType: 'table',
    title: 'Table',
    columns: [{ header: 'A' }],
    rows: [{ cells: [{ value: rich('B') }] }],
  },
  timeline: { blockType: 'timeline', title: 'Timeline', steps: [{ label: 'A' }] },
  mermaid: { blockType: 'mermaid', title: 'Diagram', source: 'flowchart TD\n A --> B' },
  agenda: { blockType: 'agenda', title: 'Agenda', items: [{ label: 'A' }] },
};

const EXPECTED_CLASSIFICATION_MATRIX: Record<string, string> = {
  cover: 'ccccuuucuuuc',
  section: 'ccccuuucuuuc',
  statement: 'ccccuuucuuuc',
  twoCols: 'lllcuulluuuu',
  cardGrid: 'lllaclllulul',
  stats: 'lllluulluuuu',
  quotes: 'lllluucluuuu',
  cta: 'ccccuuucuuuc',
  table: 'lllluuuluuul',
  timeline: 'lllluulluuuu',
  mermaid: 'lllluuuluucl',
  agenda: 'lllluulluuuu',
};

const CLASSIFICATION_CODE = {
  adjustments: 'a',
  compatible: 'c',
  lossy: 'l',
  unavailable: 'u',
} as const;

describe('unified slide-content adapters', () => {
  it('attaches one semantic contract to every registered layout', () => {
    expect(ALL_SPECS).toHaveLength(12);
    for (const spec of ALL_SPECS) {
      expect(spec.layout, spec.blockType).toBeDefined();
      expect(Object.keys(spec.layout?.fields ?? {}), spec.blockType).not.toHaveLength(0);
    }
  });

  it('preserves prose, actions, citations, media, people, identity, and hidden content round trip', () => {
    const source = {
      id: 'slide-1',
      blockName: 'Stable row',
      blockType: 'cover',
      pills: [{ id: 'pill-1', text: 'Décision' }],
      title: 'A stable title',
      subtitle: rich('Supporting copy'),
      image: { id: 42, url: '/media/hero.jpg', alt: 'Informative', focalX: 25, focalY: 60 },
      imagePosition: 'left',
      intervenants: [{ id: 'speaker-row', user: 7, description: 'Expert' }],
    };

    const changed = applyLayoutProjection({ slide: source, targetLayout: 'cta' });
    expect(changed.slide).toMatchObject({ blockType: 'cta', title: 'A stable title' });
    expect(changed.analysis.hidden).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'media.primary' }),
        expect.objectContaining({ role: 'people' }),
      ]),
    );

    const restored = applyLayoutProjection({ slide: changed.slide, targetLayout: 'cover' }).slide;
    expect(restored).toMatchObject({
      blockType: 'cover',
      title: source.title,
      subtitle: source.subtitle,
      image: source.image,
      imagePosition: 'left',
      intervenants: source.intervenants,
      pills: source.pills,
    });
  });

  it.each(['agenda', 'timeline', 'stats', 'quotes', 'twoCols'])(
    'keeps collection item ids and order through cardGrid → %s → cardGrid',
    (targetLayout) => {
      const source = {
        blockType: 'cardGrid',
        title: 'Portable collection',
        cards: [
          { id: 'a', number: '01', title: 'First', description: rich('Alpha') },
          { id: 'b', number: '02', title: 'Second', description: rich('Beta') },
        ],
      };
      const analysis = analyzeSlideLayouts(source, [targetLayout])[0]!;
      const changed = applyLayoutProjection({
        slide: source,
        targetLayout,
        confirmLossy: analysis.requiresConfirmation,
      }).slide;
      const backAnalysis = analyzeSlideLayouts(changed, ['cardGrid'])[0]!;
      const restored = applyLayoutProjection({
        slide: changed,
        targetLayout: 'cardGrid',
        confirmLossy: backAnalysis.requiresConfirmation,
      }).slide;
      expect((restored.cards as Array<{ id: string }>).map((item) => item.id)).toEqual(['a', 'b']);
      expect(restored.cards).toEqual(source.cards);
    },
  );

  it('refreshes canonical roles from edited visible content across subsequent layout changes', () => {
    const source = { blockType: 'statement', title: 'Original', body: rich('Initial support') };
    const section = applyLayoutProjection({ slide: source, targetLayout: 'section' }).slide;
    const edited = { ...section, title: 'Edited in B', subtitle: rich('Edited support in B') };

    const cta = applyLayoutProjection({ slide: edited, targetLayout: 'cta' }).slide;
    expect(cta).toMatchObject({ title: 'Edited in B', subtitle: rich('Edited support in B') });

    const back = applyLayoutProjection({ slide: edited, targetLayout: 'statement' }).slide;
    expect(back).toMatchObject({ title: 'Edited in B', body: rich('Edited support in B') });
  });

  it('diagnoses populated collection fields omitted by the target and preserves them round trip', () => {
    const source = {
      blockType: 'cardGrid',
      title: 'Cards',
      cards: [
        { id: 'a', number: '01', title: 'Alpha', description: rich('Detail') },
        { id: 'b', number: '02', title: 'Beta', description: rich('More detail') },
      ],
    };
    const analysis = analyzeSlideLayouts(source, ['stats'])[0]!;
    expect(analysis).toMatchObject({ classification: 'lossy', requiresConfirmation: true });
    expect(analysis.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'non-portable', field: 'description' }),
        expect.objectContaining({ code: 'non-portable', field: 'number' }),
      ]),
    );
    expect(() => applyLayoutProjection({ slide: source, targetLayout: 'stats' })).toThrow(
      /confirmation/,
    );
    const stats = applyLayoutProjection({
      slide: source,
      targetLayout: 'stats',
      confirmLossy: true,
    }).slide;
    const backAnalysis = analyzeSlideLayouts(stats, ['cardGrid'])[0]!;
    const restored = applyLayoutProjection({
      slide: stats,
      targetLayout: 'cardGrid',
      confirmLossy: backAnalysis.requiresConfirmation,
    }).slide;
    expect(restored.cards).toEqual(source.cards);
  });

  it('requires confirmation for specialized transformations and never deletes their structure', () => {
    const source = {
      blockType: 'mermaid',
      title: 'Workflow',
      source: 'flowchart TD\n A --> B',
      caption: 'Decision path',
    };
    const analysis = analyzeSlideLayouts(source, ['statement'])[0]!;
    expect(analysis).toMatchObject({ classification: 'lossy', requiresConfirmation: true });
    expect(() => applyLayoutProjection({ slide: source, targetLayout: 'statement' })).toThrow(
      /confirmation/,
    );
    const changed = applyLayoutProjection({
      slide: source,
      targetLayout: 'statement',
      confirmLossy: true,
    }).slide;
    expect(normalizeSlideContent(changed).roles['diagram.source']).toMatchObject([
      { field: 'source', value: source.source },
    ]);
  });

  it('provides explicit matrix results for every source and target layout', () => {
    const targets = ALL_SPECS.map((spec) => spec.blockType);
    for (const source of targets) {
      const results = analyzeSlideLayouts(fixtures[source]!, targets);
      expect(results, source).toHaveLength(targets.length);
      expect(new Set(results.map((result) => result.layout)), source).toEqual(new Set(targets));
    }
  });

  it('uses a real collection-side control for automatic and author-adjusted Two Columns mappings', () => {
    const source = {
      blockType: 'cardGrid',
      title: 'Portable collection',
      sidebarText: rich('Context'),
      cards: [{ id: 'a', title: 'Alpha', description: rich('Detail') }],
    };
    const automatic = applyLayoutProjection({ slide: source, targetLayout: 'twoCols' }).slide;
    expect(automatic).toMatchObject({ blockType: 'twoCols', rightCards: [{ id: 'a' }] });
    const adjusted = applyLayoutProjection({
      slide: source,
      targetLayout: 'twoCols',
      mapping: { collectionSide: 'left', proseSourceField: 'sidebarText' },
    }).slide;
    expect(adjusted).toMatchObject({ collectionSide: 'left', intro: rich('Context') });
    const preview = renderBlockPreview(adjusted as never);
    expect(preview?.html).toContain('k-split--collection-left');
    const blocked = analyzeSlideLayouts(
      { blockType: 'statement', title: '', body: rich('Only body') },
      ['twoCols'],
    )[0]!;
    expect(blocked.classification).toBe('unavailable');
  });

  it('does not confuse unrelated presentation hints with the Two Columns collection side', () => {
    const source = {
      blockType: 'cover',
      title: 'Hinted cover',
      pills: [{ id: 'p1', text: 'Decision' }],
      pillVariant: 'dark',
    };
    const automatic = applyLayoutProjection({ slide: source, targetLayout: 'twoCols' }).slide;
    expect(automatic.collectionSide).toBe('right');
    const adjusted = applyLayoutProjection({
      slide: source,
      targetLayout: 'twoCols',
      mapping: { collectionSide: 'left' },
    }).slide;
    expect(adjusted.collectionSide).toBe('left');
  });

  it('preserves media placement from legacy semantic state', () => {
    const media = { id: 42, url: '/media/legacy.jpg', alt: 'Legacy media' };
    const legacy = {
      blockType: 'statement',
      title: 'Legacy',
      layoutContent: {
        version: 1,
        revision: 0,
        provenance: { layouts: ['section'] },
        sourceLayout: 'section',
        roles: {
          'heading.title': [{ field: 'title', value: 'Legacy' }],
          'media.primary': [{ field: 'image', value: media }],
          'media.placement': [{ field: 'imagePosition', value: 'left' }],
        },
        layouts: {},
      },
    };
    const restored = applyLayoutProjection({ slide: legacy, targetLayout: 'section' }).slide;
    expect(restored).toMatchObject({ image: media, imagePosition: 'left' });
  });

  it('keeps normalized media placement across a non-media layout', () => {
    const source = {
      blockType: 'section',
      title: 'Media route',
      image: { id: 7, url: '/media/route.jpg', alt: 'Route' },
      imagePosition: 'left',
    };
    const hidden = applyLayoutProjection({ slide: source, targetLayout: 'statement' }).slide;
    const restored = applyLayoutProjection({ slide: hidden, targetLayout: 'twoCols' }).slide;
    expect(restored).toMatchObject({ image: source.image, imagePosition: 'left' });
  });

  it('normalizes media intent, decorative state, focal point, crop and placement', () => {
    const media = {
      id: 42,
      url: '/media/hero.jpg',
      alt: 'Decision makers reviewing a plan',
      focalX: 25,
      focalY: 60,
      crop: 'cover',
      decorative: false,
    };
    expect(normalizeMedia(media, 'left')).toEqual({
      identity: '42',
      media,
      intent: media.alt,
      decorative: false,
      focalPoint: { x: 25, y: 60 },
      crop: 'cover',
      placement: 'left',
    });
    const source = { blockType: 'section', title: 'Media', image: media, imagePosition: 'left' };
    const changed = applyLayoutProjection({ slide: source, targetLayout: 'twoCols' }).slide;
    expect(changed).toMatchObject({ image: media, imagePosition: 'left' });
    const state = normalizeSlideContent(changed);
    expect(state.roles['media.primary']?.[0]?.value).toMatchObject({
      identity: '42',
      intent: media.alt,
      focalPoint: { x: 25, y: 60 },
      crop: 'cover',
      placement: 'left',
    });
  });

  it('preserves normalized contacts, quotation attribution, actions, people and citations', () => {
    const source = {
      blockType: 'quotes',
      title: 'Voices',
      quotes: [
        {
          id: 'q1',
          quote: rich('Exact quotation'),
          authorName: 'Ada',
          authorRole: 'Director',
          authorCompany: 'Example',
        },
      ],
      linkLabel: 'Email Ada',
      linkUrl: 'mailto:ada@example.test',
      footnotes: [{ id: 'f1', text: 'Source 1' }],
    };
    const state = normalizeSlideContent(source);
    expect(state.roles.attributions?.[0]?.value).toMatchObject([
      { authorName: 'Ada', authorRole: 'Director', authorCompany: 'Example' },
    ]);
    expect(state.roles['contact.details']?.[0]?.value).toMatchObject({
      linkLabel: 'Email Ada',
      linkUrl: 'mailto:ada@example.test',
    });
    expect(state.roles['action.supporting.url']?.[0]?.value).toBe(source.linkUrl);
    expect(state.roles.citations?.[0]?.value).toEqual(source.footnotes);
    const current = analyzeSlideLayouts(source, ['quotes'])[0]!;
    expect(current.hidden).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'attributions' }),
        expect.objectContaining({ role: 'contact.details' }),
      ]),
    );
    const transformed = analyzeSlideLayouts(source, ['cardGrid'])[0]!;
    expect(transformed.hidden).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'attributions' }),
        expect.objectContaining({ role: 'contact.details' }),
      ]),
    );
    const changed = applyLayoutProjection({ slide: source, targetLayout: 'statement' }).slide;
    const restored = applyLayoutProjection({ slide: changed, targetLayout: 'quotes' }).slide;
    expect(restored).toMatchObject(source);
  });

  it('pins the specialized layout behavior matrix explicitly', () => {
    expect(SPECIALIZED_LAYOUT_BEHAVIOR).toMatchObject({
      table: { table: 'compatible', statement: 'lossy', mermaid: 'unavailable' },
      mermaid: { mermaid: 'compatible', statement: 'transformable', table: 'unavailable' },
    });
    const table = {
      blockType: 'table',
      title: 'Matrix',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: rich('One') }, { value: rich('Two') }] }],
    };
    expect(
      Object.fromEntries(
        analyzeSlideLayouts(table, ['table', 'statement', 'mermaid']).map((result) => [
          result.layout,
          result.classification,
        ]),
      ),
    ).toEqual({
      table: 'compatible',
      statement: 'lossy',
      mermaid: 'unavailable',
    });
  });

  it('ranks semantic fit, capacity, media support and information loss independently', () => {
    const source = {
      blockType: 'cardGrid',
      title: 'Many cards',
      cards: Array.from({ length: 6 }, (_, index) => ({
        id: String(index),
        title: `Card ${index}`,
      })),
    };
    const results = analyzeSlideLayouts(source, ['cardGrid', 'twoCols', 'statement']);
    const byLayout = new Map(results.map((result) => [result.layout, result]));
    expect(results[0]?.layout).toBe('cardGrid');
    expect(byLayout.get('twoCols')?.recommendation.dimensions.capacity).toBeLessThan(0);
    expect(byLayout.get('statement')?.recommendation.dimensions.loss).toBeLessThan(0);
    expect(byLayout.get('cardGrid')?.recommendation.dimensions.semantic).toBeGreaterThan(
      byLayout.get('statement')!.recommendation.dimensions.semantic,
    );
  });

  it('uses the same renderer result for representative candidate preview and final output', () => {
    const candidate = applyLayoutProjection({
      slide: {
        blockType: 'section',
        title: 'Parity',
        subtitle: rich('Resolved {org.name} copy'),
        image: { url: '/media/parity.jpg', alt: 'Parity image' },
        imagePosition: 'right',
        footnotes: [{ text: 'Citation' }],
      },
      targetLayout: 'twoCols',
    }).slide;
    const renderer = getRenderer('twoCols')!;
    const native = renderer(candidate as never);
    const preview = renderBlockPreview(candidate as never)!;
    expect(native).toContain(preview.html.trim());
    expect(preview.image).toBe('/media/parity.jpg');
    expect(preview.layout).toBe('image-right');
  });

  it('pins every registered source-target classification explicitly', () => {
    const layouts = ALL_SPECS.map((spec) => spec.blockType);
    expect(Object.keys(EXPECTED_CLASSIFICATION_MATRIX)).toEqual(layouts);
    for (const source of layouts) {
      const fixture = fixtures[source]!;
      const actual = Object.fromEntries(
        analyzeSlideLayouts(fixture, layouts).map((result) => [
          result.layout,
          result.classification,
        ]),
      );
      expect(
        layouts.map((target) => CLASSIFICATION_CODE[actual[target]!]).join(''),
        `${source} → ${layouts.join(', ')}`,
      ).toBe(EXPECTED_CLASSIFICATION_MATRIX[source]);
    }
  });

  it('supports exact immediate undo and rejects stale tokens', () => {
    const source = { blockType: 'statement', title: 'Before', body: rich('Body') };
    const changed = applyLayoutProjection({ slide: source, targetLayout: 'section' });
    expect(undoLayoutProjection(changed.slide, changed.undoToken)).toMatchObject(source);
    expect(() => undoLayoutProjection(changed.slide, 'stale')).toThrow(/périmée/);
  });

  it('round-trips every selectable pair without changing semantic state', () => {
    const fixtures: Record<string, Record<string, unknown>> = {
      cover: { blockType: 'cover', title: 'Cover', subtitle: rich('Support') },
      section: { blockType: 'section', title: 'Section', subtitle: rich('Support') },
      statement: { blockType: 'statement', title: 'Statement', body: rich('Support') },
      twoCols: {
        blockType: 'twoCols',
        title: 'Columns',
        intro: rich('Support'),
        rightCards: [{ id: 'a', title: 'A', description: rich('Alpha') }],
      },
      cardGrid: {
        blockType: 'cardGrid',
        title: 'Cards',
        cards: [
          { id: 'a', title: 'A', description: rich('Alpha') },
          { id: 'b', title: 'B', description: rich('Beta') },
        ],
      },
      stats: { blockType: 'stats', title: 'Stats', stats: [{ id: 'a', value: '1', label: 'A' }] },
      quotes: {
        blockType: 'quotes',
        title: 'Quotes',
        quotes: [{ id: 'a', quote: rich('Q'), authorName: 'A' }],
      },
      cta: { blockType: 'cta', title: 'Act', subtitle: rich('Support') },
      table: {
        blockType: 'table',
        title: 'Table',
        columns: [{ id: 'column-a', header: 'A' }],
        rows: [{ id: 'row-a', cells: [{ id: 'cell-a', value: rich('B') }] }],
      },
      timeline: { blockType: 'timeline', title: 'Timeline', steps: [{ id: 'a', label: 'A' }] },
      mermaid: { blockType: 'mermaid', title: 'Diagram', source: 'flowchart TD\n A --> B' },
      agenda: { blockType: 'agenda', title: 'Agenda', items: [{ id: 'a', label: 'A' }] },
    };

    for (const [sourceLayout, source] of Object.entries(fixtures)) {
      for (const analysis of analyzeSlideLayouts(source)) {
        if (analysis.classification === 'unavailable') continue;
        const changed = applyLayoutProjection({
          slide: source,
          targetLayout: analysis.layout,
          confirmLossy: analysis.requiresConfirmation,
        }).slide;
        const back = analyzeSlideLayouts(changed, [sourceLayout])[0]!;
        if (back.classification === 'unavailable') continue;
        const restored = applyLayoutProjection({
          slide: changed,
          targetLayout: sourceLayout,
          confirmLossy: back.requiresConfirmation,
        }).slide;
        expect(
          storedSemantic(restored),
          `${sourceLayout} → ${analysis.layout} → ${sourceLayout}`,
        ).toEqual(storedSemantic(source));
      }
    }
  });
});

function storedSemantic(slide: Record<string, unknown>) {
  const { layoutContent: _, ...visible } = slide;
  return visible;
}
