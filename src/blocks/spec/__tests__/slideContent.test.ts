import { describe, expect, it } from 'vitest';

import { ALL_SPECS } from '../index';
import {
  analyzeSlideLayouts,
  applyLayoutProjection,
  normalizeSlideContent,
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
      const changed = applyLayoutProjection({ slide: source, targetLayout }).slide;
      const restored = applyLayoutProjection({ slide: changed, targetLayout: 'cardGrid' }).slide;
      expect((restored.cards as Array<{ id: string }>).map((item) => item.id)).toEqual(['a', 'b']);
      expect(restored.cards).toEqual(source.cards);
    },
  );

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
    const targets = ALL_SPECS.map((spec) => spec.blockType);
    for (const source of targets) {
      const results = analyzeSlideLayouts(fixtures[source]!, targets);
      expect(results, source).toHaveLength(targets.length);
      expect(new Set(results.map((result) => result.layout)), source).toEqual(new Set(targets));
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
