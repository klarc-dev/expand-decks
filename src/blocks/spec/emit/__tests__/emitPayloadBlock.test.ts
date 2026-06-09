import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CardGridBlock } from '../../../CardGridBlock';
import { StatementBlock } from '../../../StatementBlock';
import { block, factoryField, optionalAi, optionalRender, rawField } from '../../dsl';
import { emitPayloadBlock } from '../emitPayloadBlock';

/**
 * Inline spec faithfully reproducing StatementBlock.ts. This both exercises the
 * emitter and validates the spec-authoring pattern a later wave (B1) will reuse.
 */
const statementSpec = block({
  slug: 'statement',
  labels: { singular: 'Affirmation', plural: 'Affirmations' },
  imageURL: '/block-previews/statement.svg',
  aiDraftable: true,
  blockType: 'statement',
  fields: [
    factoryField('eyebrow', 'eyebrow', optionalRender(z.string()), optionalAi(z.string())),
    factoryField('title', 'title', z.string(), z.string(), {
      description: 'Citation ou affirmation principale',
    }),
    rawField('body', optionalRender(z.string()), optionalAi(z.string()), {
      type: 'richText',
      label: 'Corps',
      description: 'Texte développant l’affirmation',
    }),
    rawField('footer', optionalRender(z.string()), optionalAi(z.string()), {
      type: 'richText',
      label: 'Pied de page',
      description: 'Légende ou note en bas de la diapositive',
    }),
    rawField(
      'variant',
      optionalRender(z.enum(['centered-hero', 'pull-quote', 'big-statement', 'split'])),
      optionalAi(z.enum(['centered-hero', 'pull-quote', 'big-statement', 'split'])),
      {
        type: 'select',
        label: 'Variante de mise en page',
        description:
          'Disposition : centered-hero (centré), pull-quote (citation), big-statement (énoncé large), split (titre/texte). Laisser vide pour une alternance automatique.',
        options: ['centered-hero', 'pull-quote', 'big-statement', 'split'].map((v) => ({
          label: v,
          value: v,
        })),
      },
    ),
    factoryField(
      'surface',
      'surface',
      optionalRender(z.enum(['dark', 'light'])),
      optionalAi(z.enum(['dark', 'light'])),
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
});

describe('emitPayloadBlock', () => {
  it('reproduces StatementBlock byte-identically', () => {
    expect(emitPayloadBlock(statementSpec)).toEqual(StatementBlock);
  });

  it('emits select options and recurses into array fields with cardTitleDesc', () => {
    // Focused fragment covering: factory eyebrow/title, raw select with options,
    // raw array recursing through the dispatch (number raw + cardTitleDesc spread).
    const cardGridSpec = block({
      slug: 'cardGrid',
      labels: { singular: 'Grille de cartes', plural: 'Grilles de cartes' },
      imageURL: '/block-previews/cardGrid.svg',
      aiDraftable: true,
      blockType: 'cardGrid',
      fields: [
        factoryField('eyebrow', 'eyebrow', optionalRender(z.string()), optionalAi(z.string())),
        factoryField('title', 'title', z.string(), z.string(), {
          description: 'Titre principal de la grille',
        }),
        rawField('sidebarText', optionalRender(z.string()), optionalAi(z.string()), {
          type: 'richText',
          label: 'Texte latéral',
          description: 'Texte optionnel affiché sur le côté de la grille',
        }),
        rawField('columns', z.string(), z.string(), {
          type: 'select',
          label: 'Colonnes',
          defaultValue: '4',
          description: 'Nombre de colonnes dans la grille',
          options: [
            { label: '2 colonnes', value: '2' },
            { label: '3 colonnes', value: '3' },
            { label: '4 colonnes', value: '4' },
          ],
        }),
        rawField('cards', z.array(z.unknown()), z.array(z.unknown()), {
          type: 'array',
          label: 'Cartes',
          description: 'Liste des cartes à afficher dans la grille',
          fields: [
            rawField('number', optionalRender(z.string()), optionalAi(z.string()), {
              type: 'text',
              label: 'Numéro',
              description: 'Numéro ou identifiant de la carte (ex. "01")',
            }),
            factoryField('cardTitleDesc', 'cardTitleDesc', z.unknown(), false),
          ],
        }),
        factoryField('preview', 'preview', z.never(), false),
      ],
    });

    expect(emitPayloadBlock(cardGridSpec)).toEqual(CardGridBlock);
  });
});
