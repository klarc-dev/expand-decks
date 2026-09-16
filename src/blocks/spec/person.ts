import { z } from 'zod';

import { type FieldSpec, limitedArray, limitedArrayPayload, optionalRender, rawField } from './dsl';
import type { RangeLimit } from './limits';

/**
 * Shared "intervenants" relationship shape — one definition consumed by every
 * block spec that displays person cards (cover, cardGrid), so the render Zod,
 * the Payload field and the renderer contract cannot drift between blocks.
 */
const mediaRelationship = z.union([
  z.string(),
  z.number(),
  z
    .object({
      id: z.union([z.string(), z.number()]),
      url: optionalRender(z.string()),
      thumbnailURL: optionalRender(z.string()),
      sizes: optionalRender(
        z.object({
          thumbnail: optionalRender(z.object({ url: optionalRender(z.string()) }).passthrough()),
          card: optionalRender(z.object({ url: optionalRender(z.string()) }).passthrough()),
        }),
      ),
    })
    .passthrough(),
]);

const userRelationship = z.union([
  z.string(),
  z.number(),
  z
    .object({
      id: z.union([z.string(), z.number()]),
      name: optionalRender(z.string()),
      email: optionalRender(z.string()),
      title: optionalRender(z.string()),
      phone: optionalRender(z.string()),
      linkedin: optionalRender(z.string()),
      avatar: optionalRender(mediaRelationship),
    })
    .passthrough(),
]);

export const intervenantsRender = (limit: RangeLimit) =>
  optionalRender(
    limitedArray(
      z
        .object({
          user: userRelationship.nullable().optional(),
          description: optionalRender(z.string()),
        })
        .passthrough(),
      limit,
    ),
  );

/** Payload field spec for an `intervenants` array (not AI-draftable). */
export function intervenantsFieldSpec(limit: RangeLimit, description: string): FieldSpec {
  return rawField(
    'intervenants',
    intervenantsRender(limit),
    false,
    limitedArrayPayload(limit, {
      type: 'array',
      label: 'Intervenants',
      description,
      fields: [
        rawField('user', userRelationship, false, {
          type: 'relationship',
          relationTo: 'users',
          required: true,
          maxDepth: 2,
          label: 'Utilisateur',
          description: 'Utilisateur affiché comme intervenant',
        }),
        rawField('description', optionalRender(z.string()), false, {
          type: 'textarea',
          label: 'Description',
          maxLength: 240,
          description: 'Expertise ou sujets suivis, affichés sous la fonction',
        }),
      ],
    }),
  );
}
