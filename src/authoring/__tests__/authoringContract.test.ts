import { describe, expect, it } from 'vitest';
import { ALL_SPECS } from '@/blocks/spec';
import { generateAuthoringContract } from '../../../scripts/generate-authoring-contract';
import { authoringOperations } from '../../../scripts/slides-authoring';
import { slideInputSchema, slidePatchSchema } from '../slideSchema';

describe('generated Slides authoring contract', () => {
  it('publishes a deterministic explicit catalogue with both CRUD paths and no raw deletion', () => {
    const contract = generateAuthoringContract();
    expect(generateAuthoringContract()).toEqual(contract);
    expect(authoringOperations.map((operation) => operation.id)).toEqual(
      expect.arrayContaining([
        'create_deck',
        'list_decks',
        'get_deck',
        'update_deck',
        'request_deck_deletion',
        'manage_deck_slides',
        'get_deck_outputs',
        'start_deck_draft',
        'manage_slide_layout',
        'upload_media',
        'upload_knowledge_document',
      ]),
    );
    for (const [route, methods] of Object.entries(contract.paths)) {
      expect(route).not.toMatch(/^\/api\/(users|accounts|payload-jobs|graphql)(\/|$)/);
      expect(methods).not.toHaveProperty('delete');
    }
    expect(Object.keys(contract.paths['/api/deck-actions'] ?? {})).not.toContain('get');
  });

  it('derives each slide type and protects storage and inherited access fields', () => {
    expect(slideInputSchema.options.map((option) => option.shape.blockType.value)).toEqual(
      ALL_SPECS.map((spec) => spec.blockType),
    );
    expect(slideInputSchema.safeParse({ blockType: 'cover' }).success).toBe(false);
    expect(slidePatchSchema.safeParse({ blockType: 'cover' }).success).toBe(true);
    expect(slidePatchSchema.safeParse({ blockType: 'cover', layoutContent: {} }).success).toBe(
      false,
    );
    const update = authoringOperations.find(({ id }) => id === 'update_deck')?.body;
    for (const body of [{ slides: [] }, { organisation: 2 }, { lastBuildStatus: 'success' }]) {
      expect(update?.safeParse(body).success).toBe(false);
    }
  });

  it('fails on duplicate operations and unresolved path parameters', () => {
    const entry = authoringOperations[0];
    expect(() => generateAuthoringContract([entry, entry])).toThrow(/duplicate/i);
    expect(() =>
      generateAuthoringContract([{ ...entry, path: '/api/presentations/{id}' }]),
    ).toThrow(/unresolved/i);
  });
});
