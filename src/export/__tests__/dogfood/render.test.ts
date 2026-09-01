import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';

import { buildSlidesMd, type Presentation } from '../../buildSlidesMd';
import { exportSlidePngs } from '../../../agents/tools/exportSlidePngs';

function lexical(text: string) {
  return {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
          textFormat: 0,
          children: [
            {
              type: 'text',
              text,
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
              version: 1,
            },
          ],
        },
      ],
    },
  } as never;
}

const OUT = join(process.cwd(), 'tmp', 'dogfood-templates');

describe('dogfood all templates', () => {
  it('exports one PNG per template through the real Slidev pipeline', async () => {
    mkdirSync(OUT, { recursive: true });
    const deck: Presentation = {
      title: 'Dogfood — every template',
      slides: [
        {
          blockType: 'cover',
          title: 'Product strategy 2026',
          eyebrow: 'Dogfood',
          subtitle: lexical('A realistic deck used to stress every slide template.'),
        },
        { blockType: 'section', title: '01 — Narrative spine', number: '01' },
        {
          blockType: 'statement',
          title:
            'Teams need fewer choices, better defaults, and templates that survive real content.',
          body: lexical(
            'This statement intentionally uses a longer sentence to validate rhythm, wrapping, and emphasis.',
          ),
        },
        {
          blockType: 'twoCols',
          title: 'Decision framework',
          intro: lexical('A good template supports hierarchy without manual tuning.'),
          leftTitle: 'What we evaluate',
          leftBody: lexical(
            'Fit, readability, scan speed, contrast, and resilience to uneven copy.',
          ),
          leftFooter: lexical(
            'The shared density step must account for both columns rather than shrinking cards independently.',
          ),
          rightCards: [
            {
              title: 'Signal',
              description: lexical(
                'Can a reader understand the slide in five seconds, even when the explanation needs a second line?',
              ),
            },
            {
              title: 'Stress',
              description: lexical(
                'Does it stay polished with long labels, mixed content, and a substantially denser neighboring card?',
              ),
            },
            {
              title: 'Reuse across demanding production contexts',
              description: lexical(
                'Can authors use it repeatedly without per-slide layout surgery or one-off font overrides?',
              ),
            },
          ],
        },
        {
          blockType: 'cardGrid',
          title: 'Four quality levers',
          sidebarText: lexical(
            'Cards should align on a shared baseline and avoid weak floating side notes.',
          ),
          columns: '4',
          cards: [
            { number: '01', title: 'Hierarchy', description: lexical('One clear read order.') },
            {
              number: '02',
              title: 'Density',
              description: lexical('Enough content, never cramped.'),
            },
            { number: '03', title: 'Contrast', description: lexical('AA-safe muted text.') },
            { number: '04', title: 'Cadence', description: lexical('Consistent spacing rails.') },
          ],
        },
        {
          blockType: 'stats',
          title: 'Impact targets',
          stats: [
            { value: '€12.45M–€18.9M', label: 'projected annual value range' },
            { value: '2026–2031', label: 'multi-year adoption horizon' },
            { value: '99.987%', label: 'target platform availability' },
            { value: '1:250,000', label: 'maximum supported operating ratio' },
          ],
        },
        {
          blockType: 'quotes',
          title: 'Voice of the author',
          quotes: [
            {
              quote: lexical('The deck should look finished before I start polishing.'),
              authorName: 'Author',
              authorRole: 'Strategy',
            },
            {
              quote: lexical('If content grows, the template should adapt instead of breaking.'),
              authorName: 'Reviewer',
              authorRole: 'Design QA',
            },
          ],
        },
        {
          blockType: 'table',
          title: 'Readiness matrix',
          tableVariant: 'matrix',
          columns: [{ header: 'Template' }, { header: 'Fit' }, { header: 'Status' }],
          rows: [
            {
              cells: [
                { value: lexical('Diagram') },
                { value: lexical('Centered SVG contain') },
                { value: lexical('oui') },
              ],
            },
            {
              cells: [
                { value: lexical('Timeline') },
                { value: lexical('Dense rail for five steps') },
                { value: lexical('attention') },
              ],
            },
            {
              cells: [
                { value: lexical('Cards') },
                { value: lexical('Baseline-aligned grid') },
                { value: lexical('oui') },
              ],
            },
          ],
        },
        {
          blockType: 'timeline',
          title: 'Template quality loop',
          steps: [
            { label: 'Generate', description: 'Create a realistic multi-template deck' },
            { label: 'Render', description: 'Use the real Slidev export path' },
            { label: 'Inspect', description: 'Look for overflow, weak rhythm, bad alignment' },
            { label: 'Improve', description: 'Patch the shared primitive, not one slide' },
            { label: 'Repeat', description: 'Dogfood after every template change' },
          ],
          footer: 'The loop should be cheap enough to run often.',
        },
        {
          blockType: 'mermaid',
          title: 'Agent workflow alignment',
          caption: 'Mermaid now uses a centered SVG contain stage shared by preview and export.',
          source:
            'flowchart LR\n  A[Brief] --> B[Structure]\n  B --> C[Draft]\n  C --> D{Validate}\n  D -->|Revise| C\n  D -->|Pass| E[Assemble deck]',
        },
        { blockType: 'agenda', title: 'Auto agenda fallback', items: [] },
        {
          blockType: 'cta',
          title: 'Keep dogfooding',
          subtitle: lexical('Every template should earn its place with real rendered evidence.'),
          primaryAction: 'Run dogfood',
          secondaryAction: 'Inspect PNGs',
          footerNote: lexical('Use this deck whenever layout primitives change.'),
        },
        {
          blockType: 'markdown',
          layout: 'default',
          content:
            '<div class="k-content-frame"><div class="k-content-header"><h1>Markdown escape hatch</h1></div><div class="k-content-main"><p>Raw content still shares the deck rails when authors opt in.</p></div></div>',
        },
      ] as never,
    };
    const md = buildSlidesMd(deck);
    writeFileSync(join(OUT, 'slides.md'), md, 'utf-8');
    const { pngs } = await exportSlidePngs(md);
    for (const png of pngs) {
      const data = Buffer.from(png.base64, 'base64');
      writeFileSync(join(OUT, `slide-${String(png.page).padStart(2, '0')}.png`), data);
    }
    writeFileSync(
      join(OUT, 'manifest.json'),
      JSON.stringify(
        {
          count: pngs.length,
          files: pngs.map((p) => `slide-${String(p.page).padStart(2, '0')}.png`),
        },
        null,
        2,
      ),
    );
  }, 300000);
});
