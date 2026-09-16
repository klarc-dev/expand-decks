import { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';

import type { DeckLanguage } from './language';

const DECK_PHASES = ['gather', 'structure', 'draft', 'validate', 'visual', 'fonts'] as const;

export const DeckRequestContextSchema = z.object({
  requestId: z.string().min(1).max(128),
  presentationId: z.string().min(1).max(128),
  runId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128).optional(),
  organizationId: z.string().min(1).max(128).optional(),
  model: z.string().min(1).max(128).optional(),
  /** Output language every localized agent must write in (see registry.ts). */
  language: z.enum(['fr', 'en']).optional(),
  phase: z.enum(DECK_PHASES),
});

export type DeckRequestContextValues = z.infer<typeof DeckRequestContextSchema>;
export type DeckRequestContext = RequestContext<DeckRequestContextValues>;

export function createDeckRequestContext(values: DeckRequestContextValues): DeckRequestContext {
  const parsed = DeckRequestContextSchema.parse(values);
  const context = new RequestContext<DeckRequestContextValues>();
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) context.set(key as keyof DeckRequestContextValues, value);
  }
  return context;
}

export function childRequestContext(
  parent: DeckRequestContext,
  phase: DeckRequestContextValues['phase'],
): DeckRequestContext {
  return createDeckRequestContext({
    requestId: parent.get('requestId')!,
    presentationId: parent.get('presentationId')!,
    runId: parent.get('runId')!,
    userId: parent.get('userId'),
    organizationId: parent.get('organizationId'),
    model: parent.get('model'),
    language: parent.get('language'),
    phase,
  });
}

/** Loosely typed so it can be handed to any Mastra primitive regardless of its declared schema. */
export type LanguageRequestContext = RequestContext<any>;

/**
 * Copy `parent` (or start empty) and pin the output language. The dossier's
 * resolved language is authoritative downstream, so a phase always sets it
 * explicitly rather than trusting whatever the caller's context carried.
 */
export function withDeckLanguage(
  parent: RequestContext<any> | undefined,
  language: DeckLanguage,
): LanguageRequestContext {
  const context = new RequestContext<any>();
  if (parent) {
    for (const [key, value] of parent.entries() as Iterable<[string, unknown]>) {
      context.setRaw(key, value);
    }
  }
  context.set('language', language);
  return context;
}
