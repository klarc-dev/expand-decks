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
          intro: lexical(
            'A good template supports hierarchy without manual tuning. Fit, readability, scan speed, contrast, and resilience to uneven copy all belong to one shared density decision.',
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
          title: 'Six quality levers that must stay visually comparable',
          sidebarText: lexical(
            'Cards should align on shared rows, use one typography scale, and remain balanced when the final row is incomplete.',
          ),
          columns: '3',
          cards: [
            {
              number: '01',
              title: 'Hierarchy that survives a substantially longer heading',
              description: lexical(
                'One clear read order from slide title to card label to supporting explanation, even when one sibling carries much more copy.',
              ),
            },
            {
              number: '02',
              title: 'Density',
              description: lexical(
                'Enough content to be useful, never cramped or individually shrunk.',
              ),
            },
            {
              number: '03',
              title: 'Contrast',
              description: lexical('AA-safe muted text on light and dark presentation surfaces.'),
            },
            {
              number: '04',
              title: 'Cadence',
              description: lexical('Consistent spacing rails across every template family.'),
            },
            {
              number: '05',
              title: 'Alignment',
              description: lexical('Equal-height rows keep comparable ideas comparable.'),
            },
            {
              number: '06',
              title: 'Resilience',
              description: lexical(
                'The fixed canvas adapts as a system before any content can clip.',
              ),
            },
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
              quote: lexical(
                'The deck should look finished before I start polishing, including when a quotation contains enough detail to wrap across several lines.',
              ),
              authorName: 'Author',
              authorRole: 'Strategy',
            },
            {
              quote: lexical(
                'If content grows, the complete template should adapt together instead of breaking one card or silently hiding the end of a sentence.',
              ),
              authorName: 'Reviewer',
              authorRole: 'Design QA',
            },
            {
              quote: lexical(
                'Comparable quotes need equal boxes, one scale, stable attribution placement, and enough breathing room to remain credible.',
              ),
              authorName: 'Editor',
              authorRole: 'Content operations',
            },
            {
              quote: lexical(
                'A fixed canvas is a constraint to design against, not a reason to introduce per-slide font overrides or unexplained truncation.',
              ),
              authorName: 'Engineer',
              authorRole: 'Rendering systems',
            },
          ],
        },
        {
          blockType: 'table',
          eyebrow: 'Périmètre des actifs',
          title: 'L’éligibilité varie selon la nature et la protection de l’actif',
          tableVariant: 'reference',
          columns: [
            { header: 'Catégorie d’actif' },
            { header: 'Fondement de protection' },
            { header: 'Critères juridiques à vérifier' },
            { header: 'Limite d’éligibilité' },
          ],
          rows: [
            {
              cells: [
                { value: lexical('Brevets et titres apparentés') },
                { value: lexical('Titre de propriété industrielle') },
                {
                  value: lexical(
                    'Brevet, certificat d’utilité ou certificat complémentaire de protection en vigueur',
                  ),
                },
                { value: lexical('Vérifier la titularité et la durée de protection restante') },
              ],
            },
            {
              cells: [
                { value: lexical('Certificats d’obtention végétale') },
                { value: lexical('Droit attaché à une variété végétale') },
                {
                  value: lexical(
                    'Certificat délivré pour la variété concernée et droit détenu par l’entreprise',
                  ),
                },
                { value: lexical('L’actif doit être protégé et effectivement détenu') },
              ],
            },
            {
              cells: [
                { value: lexical('Logiciels protégés par le droit d’auteur') },
                { value: lexical('Droit d’auteur') },
                {
                  value: lexical(
                    'Logiciel original bénéficiant de la protection du droit d’auteur',
                  ),
                },
                { value: lexical('Les fonctions protégées doivent être précisément identifiées') },
              ],
            },
            {
              cells: [
                { value: lexical('Procédés de fabrication industriels') },
                { value: lexical('Savoir-faire associé à un titre de propriété industrielle') },
                {
                  value: lexical(
                    'Procédé issu d’activités de R&D, indispensable à l’exploitation d’un brevet ou titre apparenté, et concédé avec celui-ci dans le même contrat',
                  ),
                },
                {
                  value: lexical(
                    'Pas d’éligibilité autonome sans le titre auquel le procédé se rattache',
                  ),
                },
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
        {
          blockType: 'agenda',
          title: 'A complete agenda should fit without losing meaning',
          items: [
            {
              label: 'Frame the decision and the evidence available',
              description: 'Clarify what the audience must understand before evaluating options.',
            },
            {
              label: 'Compare the viable paths and their trade-offs',
              description:
                'Keep the wording complete even when several sections require explanation.',
            },
            {
              label: 'Test operational feasibility and ownership',
              description: 'Show who acts, in what order, and under which constraints.',
            },
            {
              label: 'Confirm economics, timing, and dependencies',
              description: 'Make the implications scannable without reducing them to fragments.',
            },
            {
              label: 'Select the preferred direction',
              description: 'State the decision criterion and the remaining uncertainty.',
            },
            {
              label: 'Define the next actions and review point',
              description: 'Close with explicit ownership, sequence, and a bounded follow-up.',
            },
          ],
        },
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
