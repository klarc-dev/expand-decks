import { z } from 'zod';
import { sql } from '@payloadcms/db-postgres';
import type { PayloadRequest } from 'payload';

import { userIsAdminOrAuthor, userIsOrganisationMember } from '@/access/roles';
import {
  analyzeSlideLayouts,
  applyLayoutProjection,
  slideLayoutFingerprint,
  undoLayoutProjection,
  validateProjectedSlide,
} from '@/blocks/spec/slideContent';
import { assertDocumentPages, resolveDocumentTemplate } from '@/documents/templates';
import { COLLECTIONS } from '@/lib/collections';
import { replaceSlideAt } from '@/lib/replaceSlideAt';
import { convertSlidesMarkdownToLexical } from '@/lib/richTextWrite';

const id = z.union([z.string().min(1).max(128), z.number()]);
const index = z.number().int().min(0);

export const slideLayoutCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('analyze'), deckId: id, slideIndex: index }),
  z.object({ action: z.literal('recommend'), deckId: id, slideIndex: index }),
  z.object({
    action: z.literal('preview'),
    deckId: id,
    slideIndex: index,
    targetLayout: z.string().min(1),
  }),
  z.object({
    action: z.literal('apply'),
    deckId: id,
    slideIndex: index,
    targetLayout: z.string().min(1),
    expectedFingerprint: z.string().length(64),
    confirmLossy: z.boolean().optional(),
    mapping: z
      .object({
        collectionSide: z.enum(['left', 'right']).optional(),
        collectionSourceField: z.string().optional(),
        proseSourceField: z.string().optional(),
      })
      .optional(),
    draft: z
      .object({
        slideId: z.union([z.string(), z.number()]).nullable(),
        slide: z.record(z.string(), z.unknown()),
      })
      .optional(),
  }),
  z.object({
    action: z.literal('undo-layout'),
    deckId: id,
    slideIndex: index,
    undoToken: z.string().min(1),
    expectedFingerprint: z.string().length(64),
  }),
]);

export class SlideLayoutCommandError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

async function withTransaction<T>(
  payload: any,
  user: any,
  callback: (req: PayloadRequest) => Promise<T>,
) {
  const transactionID = await payload.db.beginTransaction({ isolationLevel: 'serializable' });
  if (!transactionID) {
    throw new SlideLayoutCommandError(
      'Transaction de base de données indisponible',
      503,
      'transaction_unavailable',
    );
  }
  const req = { payload, user, transactionID, context: {} } as PayloadRequest;
  try {
    const result = await callback(req);
    await payload.db.commitTransaction(transactionID);
    return result;
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}

function sameSlideIdentity(left: unknown, right: unknown): boolean {
  if (left === null || left === undefined || right === null || right === undefined)
    return left === right;
  return String(left) === String(right);
}

/** Atomic command boundary shared by authenticated REST callers.
 * Issue #45's MCP half is superseded by #66; this REST contract is canonical and retired MCP code must not be restored.
 */
// fallow-ignore-next-line complexity
export async function executeSlideLayoutCommand(args: {
  command: z.infer<typeof slideLayoutCommandSchema>;
  payload: any;
  user: any;
}) {
  const { command, payload, user } = args;
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: command.deckId,
    user,
    overrideAccess: false,
    disableErrors: true,
    depth: 0,
  });
  if (!presentation)
    throw new SlideLayoutCommandError('Présentation introuvable', 404, 'not_found');
  if (!userIsOrganisationMember(user, presentation.organisation) || !userIsAdminOrAuthor(user)) {
    throw new SlideLayoutCommandError('Accès refusé', 403, 'forbidden');
  }
  const storedSlides = Array.isArray(presentation.slides) ? presentation.slides : [];
  const current = storedSlides[command.slideIndex] as Record<string, unknown> | undefined;
  if (!current) throw new SlideLayoutCommandError('Diapositive introuvable', 404, 'not_found');
  const fingerprint = slideLayoutFingerprint(current);
  const template = resolveDocumentTemplate(presentation.documentTemplate);

  const compatibility = analyzeSlideLayouts(current, template.allowedLayouts);
  if (command.action === 'analyze' || command.action === 'recommend') {
    return {
      action: command.action,
      deckId: presentation.id,
      slideIndex: command.slideIndex,
      slideId: current.id ?? null,
      fingerprint,
      compatibility,
      ...(command.action === 'recommend' ? { recommendation: compatibility[0] ?? null } : {}),
    };
  }
  if (command.action === 'preview') {
    const candidate = compatibility.find((result) => result.layout === command.targetLayout);
    if (!candidate) {
      throw new SlideLayoutCommandError('Layout cible non autorisé', 422, 'invalid_layout_change');
    }
    return {
      action: command.action,
      deckId: presentation.id,
      slideIndex: command.slideIndex,
      slideId: current.id ?? null,
      fingerprint,
      targetLayout: command.targetLayout,
      candidate,
    };
  }
  // The transaction callback coordinates the stale guard, row lock, projection, validation, and persistence.
  // fallow-ignore-next-line complexity
  return withTransaction(payload, user, async (req) => {
    const transactionDB = payload.db.sessions?.[String(req.transactionID)]?.db;
    if (!transactionDB) {
      throw new SlideLayoutCommandError(
        'Session transactionnelle indisponible',
        503,
        'transaction_unavailable',
      );
    }
    await payload.db.execute({
      db: transactionDB,
      drizzle: sql`SELECT id FROM presentations WHERE id = ${command.deckId} FOR UPDATE`,
    });
    const lockedPresentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: command.deckId,
      user,
      overrideAccess: false,
      disableErrors: true,
      depth: 0,
      req,
    });
    const lockedSlides = Array.isArray(lockedPresentation?.slides) ? lockedPresentation.slides : [];
    const lockedCurrent = lockedSlides[command.slideIndex] as Record<string, unknown> | undefined;
    if (!lockedCurrent)
      throw new SlideLayoutCommandError('Diapositive introuvable', 404, 'not_found');
    if (slideLayoutFingerprint(lockedCurrent) !== command.expectedFingerprint) {
      throw new SlideLayoutCommandError(
        'La slide a changé depuis l’analyse. Rechargez les propositions.',
        409,
        'stale',
      );
    }

    let replacement: Record<string, unknown>;
    let undoToken: string | undefined;
    let analysis;
    try {
      if (command.action === 'apply') {
        const sourceSlide = command.draft?.slide ?? lockedCurrent;
        if (
          command.draft &&
          (!sameSlideIdentity(command.draft.slideId, lockedCurrent.id) ||
            !sameSlideIdentity(command.draft.slide.id, lockedCurrent.id))
        ) {
          throw new SlideLayoutCommandError(
            'Le brouillon ne correspond pas à la diapositive sélectionnée.',
            409,
            'identity_mismatch',
          );
        }
        const applied = applyLayoutProjection({
          slide: sourceSlide,
          targetLayout: command.targetLayout,
          confirmLossy: command.confirmLossy,
          mapping: command.mapping,
        });
        replacement = applied.slide;
        if ('config' in payload) {
          [replacement] = await convertSlidesMarkdownToLexical([replacement], payload as never);
        }
        replacement = validateProjectedSlide(replacement!);
        undoToken = applied.undoToken;
        analysis = applied.analysis;
      } else {
        replacement = undoLayoutProjection(lockedCurrent, command.undoToken);
      }
      const nextSlides = replaceSlideAt(lockedSlides, command.slideIndex, replacement);
      assertDocumentPages(template, nextSlides);
      const updated = await payload.update({
        collection: COLLECTIONS.presentations,
        id: command.deckId,
        data: { slides: nextSlides },
        user,
        overrideAccess: false,
        depth: 0,
        req,
      });
      const slide = updated.slides?.[command.slideIndex];
      return {
        action: command.action,
        analysis,
        deckId: updated.id,
        slideIndex: command.slideIndex,
        slideId: slide?.id ?? lockedCurrent.id ?? null,
        slide,
        fingerprint: slideLayoutFingerprint(slide),
        undoToken,
        buildQueued: true,
        presentation: updated,
      };
    } catch (error) {
      if (error instanceof SlideLayoutCommandError) throw error;
      throw new SlideLayoutCommandError(
        error instanceof Error ? error.message : 'Changement de layout impossible',
        422,
        'invalid_layout_change',
      );
    }
  });
}
