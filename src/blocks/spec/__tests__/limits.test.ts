import { describe, expect, it } from 'vitest';

import { AI_SPEC_BY_TYPE, RENDER_SLIDE_SCHEMA, SPEC_BY_TYPE, parseAiSlide } from '../index';
import { aiSchemaOf } from '../dsl';
import { emitPayloadBlock } from '../emit/emitPayloadBlock';
import { promptMetaOf } from '../emit/emitPromptSection';
import { SLIDE_LIMITS } from '../limits';

const repeat = (length: number) => 'x'.repeat(length);
const lexical = (length: number) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text: repeat(length) }] }],
  },
});

function field(blockType: string, name: string) {
  const spec = SPEC_BY_TYPE.get(blockType)!;
  const emitted = emitPayloadBlock(spec);
  return emitted.fields.find((candidate) => 'name' in candidate && candidate.name === name);
}

describe('canonical slide authoring limits', () => {
  it('projects common title and eyebrow limits to AI, render and Payload', () => {
    expect(
      parseAiSlide({
        blockType: 'statement',
        title: repeat(SLIDE_LIMITS.common.title.max),
      }),
    ).toBeTruthy();
    expect(() =>
      parseAiSlide({
        blockType: 'statement',
        title: repeat(SLIDE_LIMITS.common.title.max + 1),
      }),
    ).toThrow();
    expect(
      RENDER_SLIDE_SCHEMA.safeParse({
        blockType: 'statement',
        title: 'Valid',
        eyebrow: repeat(SLIDE_LIMITS.common.eyebrow.max + 1),
      }).success,
    ).toBe(false);
    expect(field('statement', 'title')).toMatchObject({
      maxLength: SLIDE_LIMITS.common.title.max,
    });
    expect(field('statement', 'eyebrow')).toMatchObject({
      maxLength: SLIDE_LIMITS.common.eyebrow.max,
    });
  });

  it.each([
    ['cardGrid', 'cards', SLIDE_LIMITS.cardGrid.cards],
    ['stats', 'stats', SLIDE_LIMITS.stats.items],
    ['quotes', 'quotes', SLIDE_LIMITS.quotes.items],
    ['timeline', 'steps', SLIDE_LIMITS.timeline.steps],
    ['table', 'columns', SLIDE_LIMITS.table.columns],
    ['table', 'rows', SLIDE_LIMITS.table.rows],
    ['twoCols', 'rightCards', SLIDE_LIMITS.twoCols.cards],
    ['cover', 'intervenants', SLIDE_LIMITS.cover.speakers],
  ] as const)('projects %s.%s native row bounds', (blockType, name, limit) => {
    expect(field(blockType, name)).toMatchObject({
      minRows: limit.min,
      maxRows: limit.max,
    });
  });

  it('keeps agenda empty-authoring semantics while bounding populated values', () => {
    expect(field('agenda', 'items')).toMatchObject({
      maxRows: SLIDE_LIMITS.agenda.items.max,
    });
    expect(field('agenda', 'items')).not.toHaveProperty('minRows');
    const schema = aiSchemaOf(AI_SPEC_BY_TYPE.get('agenda')!);
    expect(schema.safeParse({ blockType: 'agenda', title: 'Plan' }).success).toBe(true);
    expect(
      schema.safeParse({
        blockType: 'agenda',
        title: 'Plan',
        items: [{ label: 'Only' }],
      }).success,
    ).toBe(false);
  });

  it('rejects rich text above its visible-text limit in render schemas and Payload validators', () => {
    expect(
      RENDER_SLIDE_SCHEMA.safeParse({
        blockType: 'statement',
        title: 'Claim',
        body: lexical(SLIDE_LIMITS.statement.body.max + 1),
      }).success,
    ).toBe(false);
    const body = field('statement', 'body');
    expect(body && 'validate' in body && typeof body.validate === 'function').toBe(true);
    const validate = body && 'validate' in body ? body.validate : undefined;
    expect(
      (validate as ((value: unknown, options: unknown) => unknown) | undefined)?.(
        lexical(SLIDE_LIMITS.statement.body.max + 1),
        {},
      ),
    ).not.toBe(true);
  });

  it('enforces nested card limits identically in AI, render and Payload', () => {
    const limit = SLIDE_LIMITS.cardGrid.cardDescription.max;
    const cardsField = field('cardGrid', 'cards');
    const fields = cardsField && 'fields' in cardsField ? cardsField.fields : [];
    const description = fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'description',
    );
    const validate = description && 'validate' in description ? description.validate : undefined;
    expect(typeof validate).toBe('function');
    for (const length of [limit, limit + 1]) {
      const cards = [{ title: 'One', description: repeat(length) }, { title: 'Two' }];
      expect(
        aiSchemaOf(AI_SPEC_BY_TYPE.get('cardGrid')!).safeParse({
          blockType: 'cardGrid',
          title: 'Cards',
          cards,
        }).success,
      ).toBe(length === limit);
      const value = lexical(length);
      expect(
        RENDER_SLIDE_SCHEMA.safeParse({
          blockType: 'cardGrid',
          title: 'Cards',
          cards: [{ ...cards[0], description: value }, cards[1]],
        }).success,
      ).toBe(length === limit);
      expect((validate as (value: unknown, options: unknown) => unknown)(value, {}) === true).toBe(
        length === limit,
      );
    }
  });

  it('projects optional quote company attribution and its exact boundary everywhere', () => {
    const limit = SLIDE_LIMITS.quotes.authorCompany.max;
    expect(limit).toBe(80);
    const quotesField = field('quotes', 'quotes');
    const fields = quotesField && 'fields' in quotesField ? quotesField.fields : [];
    const company = fields.find((candidate) => 'name' in candidate && candidate.name === 'authorCompany');
    expect(company).toMatchObject({ type: 'text', maxLength: limit });
    expect(company).not.toHaveProperty('required', true);
    const schema = aiSchemaOf(AI_SPEC_BY_TYPE.get('quotes')!);
    for (const authorCompany of [undefined, '', repeat(limit), repeat(limit + 1)]) {
      const slide = {
        blockType: 'quotes', title: 'Attribution',
        quotes: [{ quote: 'Exact quotation', authorName: 'Author', authorCompany }],
      };
      const expected = authorCompany === undefined || authorCompany.length <= limit;
      const ai = schema.safeParse(slide);
      const render = RENDER_SLIDE_SCHEMA.safeParse(slide);
      expect(ai.success).toBe(expected);
      expect(render.success).toBe(expected);
      if (ai.success) expect(ai.data).toMatchObject({ quotes: [{ authorCompany }] });
      if (render.success) expect(render.data).toMatchObject({ quotes: [{ authorCompany }] });
      if (!ai.success) expect(ai.error.issues[0]?.path).toEqual(['quotes', 0, 'authorCompany']);
      if (!render.success) expect(render.error.issues[0]?.path).toEqual(['quotes', 0, 'authorCompany']);
    }
    expect(RENDER_SLIDE_SCHEMA.safeParse({
      blockType: 'quotes', title: 'Legacy',
      quotes: [{ quote: 'Exact quotation', authorName: 'Author', authorCompany: null }],
    }).success).toBe(true);
    expect(promptMetaOf(SPEC_BY_TYPE.get('quotes')!)?.lines).toContain(
      `quotes[].authorCompany: ${limit} caractères max`,
    );
  });

  it('counts explicit rich-text linebreaks toward the same card limit', () => {
    const value = {
      root: {
        children: Array.from({ length: SLIDE_LIMITS.cardGrid.cardDescription.max + 1 }, () => ({
          type: 'linebreak',
        })),
      },
    };
    expect(
      RENDER_SLIDE_SCHEMA.safeParse({
        blockType: 'cardGrid',
        title: 'Cards',
        cards: [{ title: 'One', description: value }, { title: 'Two' }],
      }).success,
    ).toBe(false);
  });

  it('derives prompt limit guidance from the same field metadata', () => {
    const meta = promptMetaOf(SPEC_BY_TYPE.get('stats')!)!;
    expect(meta.lines).toContain(
      `stats: ${SLIDE_LIMITS.stats.items.min}–${SLIDE_LIMITS.stats.items.max} éléments`,
    );
    expect(meta.lines).toContain(`title: ${SLIDE_LIMITS.common.title.max} caractères max`);
  });

  it('rejects fenced Mermaid source at canonical AI and render boundaries', () => {
    const slide = {
      blockType: 'mermaid',
      title: 'Flow',
      source: '```mermaid\nflowchart TD\n```',
    };
    expect(() => parseAiSlide(slide)).toThrow();
    expect(RENDER_SLIDE_SCHEMA.safeParse(slide).success).toBe(false);
  });

  it('rejects table row-cell misalignment with the precise row path', () => {
    const result = parseAiSlide.bind(null, {
      blockType: 'table',
      title: 'Matrix',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: 'Only one' }] }],
    });
    expect(result).toThrow();
    const parsed = aiSchemaOf(AI_SPEC_BY_TYPE.get('table')!).safeParse({
      blockType: 'table',
      title: 'Matrix',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: 'Only one' }] }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['rows', 0, 'cells']);
  });
});
