import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { agentDraftCommandSchema, agentDraftStartSchema } from '../agentDraftContract';
import { slideLayoutCommandSchema } from '../slideLayoutContract';
import { slidePreviewRequestSchema } from '../slidePreviewContract';
import { slideRevisionSchema } from '../slideRevisionContract';

describe('native route contracts', () => {
  it.each([
    ['layout', slideLayoutCommandSchema],
    ['preview', slidePreviewRequestSchema],
    ['revision', slideRevisionSchema],
    ['draft start', agentDraftStartSchema],
    ['draft command', agentDraftCommandSchema],
  ] as const)('projects the %s request to JSON Schema', (_name, schema) => {
    const projection = z.toJSONSchema(schema, { io: 'input' });
    expect(projection.type === 'object' || Array.isArray(projection.oneOf)).toBe(true);
  });

  it('keeps template-specific draft block fields for preview hydration', () => {
    const body = {
      presentationId: 42,
      block: { blockType: 'cover', intervenants: [{ user: 7 }] },
    };
    expect(slidePreviewRequestSchema.parse(body)).toEqual(body);
    expect(slidePreviewRequestSchema.safeParse({ ...body, block: {} }).success).toBe(false);
  });

  it('preserves revision trimming and draft start defaults', () => {
    expect(
      slideRevisionSchema.parse({ presentationId: 'p1', slideIndex: 0, instruction: ' Résumer  ' }),
    ).toEqual({ presentationId: 'p1', slideIndex: 0, instruction: 'Résumer' });
    expect(
      agentDraftStartSchema.parse({ presentationId: 'p1', brief: ' Préciser le besoin ' }),
    ).toEqual({
      presentationId: 'p1',
      brief: 'Préciser le besoin',
      mode: 'replace',
      visual: true,
      approvalRequired: false,
    });
  });

  it('requires the expected layout fingerprint for writes', () => {
    const apply = { action: 'apply', deckId: 1, slideIndex: 0, targetLayout: 'statement' };
    expect(slideLayoutCommandSchema.safeParse(apply).success).toBe(false);
    expect(
      slideLayoutCommandSchema.safeParse({ ...apply, expectedFingerprint: 'a'.repeat(64) }).success,
    ).toBe(true);
  });

  it('projects Mastra command-specific required fields and rejects their absence', () => {
    expect(agentDraftCommandSchema.safeParse({ action: 'resume' }).success).toBe(false);
    expect(agentDraftCommandSchema.safeParse({ action: 'time-travel' }).success).toBe(false);
    expect(agentDraftCommandSchema.safeParse({ action: 'resume', approved: false }).success).toBe(
      true,
    );
    expect(
      agentDraftCommandSchema.safeParse({ action: 'time-travel', step: 'visual' }).success,
    ).toBe(true);
    expect(
      agentDraftCommandSchema.safeParse({ action: 'time-travel', step: 'draft' }).success,
    ).toBe(false);
    expect(agentDraftCommandSchema.safeParse({ action: 'cancel', approved: 'false' }).success).toBe(
      false,
    );
    const { oneOf } = z.toJSONSchema(agentDraftCommandSchema, { io: 'input' });
    expect(oneOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          properties: expect.objectContaining({
            action: expect.objectContaining({ const: 'resume' }),
          }),
          required: expect.arrayContaining(['action', 'approved']),
        }),
        expect.objectContaining({
          properties: expect.objectContaining({
            action: expect.objectContaining({ const: 'time-travel' }),
          }),
          required: expect.arrayContaining(['action', 'step']),
        }),
      ]),
    );
  });
});
