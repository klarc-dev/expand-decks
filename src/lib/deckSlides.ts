import { type PostgresAdapter, sql } from '@payloadcms/db-postgres';
import {
  APIError,
  type Payload,
  type PayloadRequest,
  type TypedUser,
  ValidationError,
} from 'payload';

import { userIsAdminOrAuthor, userIsOrganisationMember } from '@/access/roles';
import { assertDocumentPages, resolveDocumentTemplate } from '@/documents/templates';
import type { Presentation } from '@/payload-types';
import { COLLECTIONS } from './collections';
import {
  type DeckSlidesCommand,
  deckSlidesRevision,
  type ReadDeckSlidesQuery,
} from './deckSlidesContract';

export class DeckSlidesError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

type Slide = NonNullable<Presentation['slides']>[number];
type Actor = { payload: Payload; user: TypedUser; req?: Partial<PayloadRequest> };
type SlideDeletionTarget = Extract<DeckSlidesCommand, { action: 'prepare-delete' }>;
type Mutation =
  | Exclude<DeckSlidesCommand, { action: 'prepare-delete' }>
  | (Omit<SlideDeletionTarget, 'action'> & { action: 'delete' });

async function readDeck(
  { payload, user, req }: Actor,
  deckId: number,
  write = false,
): Promise<Presentation> {
  if (user.membershipStatus !== 'active') {
    throw new DeckSlidesError('Accès refusé.', 403, 'forbidden');
  }
  const deck = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: deckId,
    depth: 0,
    disableErrors: true,
    overrideAccess: false,
    user,
    req,
  });
  if (!deck || !userIsOrganisationMember(user, deck.organisation)) {
    throw new DeckSlidesError('Présentation introuvable.', 404, 'not_found');
  }
  if (write && !userIsAdminOrAuthor(user)) {
    throw new DeckSlidesError('Modification refusée.', 403, 'forbidden');
  }
  return deck;
}

function targetSlide(slides: Slide[], slideId: string) {
  const index = slides.findIndex((slide) => slide.id === slideId);
  const slide = slides[index];
  if (!slide)
    throw new DeckSlidesError('Diapositive introuvable dans cette présentation.', 404, 'not_found');
  if (slides.findLastIndex((candidate) => candidate.id === slideId) !== index) {
    throw new DeckSlidesError('Identifiant de diapositive ambigu.', 409, 'ambiguous_slide');
  }
  return { index, slide };
}

function revisionOf(deck: Presentation): string {
  return deckSlidesRevision(deck.slides ?? [], resolveDocumentTemplate(deck.documentTemplate).id);
}

function assertRevision(deck: Presentation, expectedRevision: string): void {
  if (revisionOf(deck) !== expectedRevision) {
    throw new DeckSlidesError(
      'La présentation a changé. Rechargez ses diapositives.',
      409,
      'stale',
    );
  }
}

function assertPages(deck: Presentation, slides: Slide[]): void {
  try {
    assertDocumentPages(resolveDocumentTemplate(deck.documentTemplate), slides);
  } catch (error) {
    throw new DeckSlidesError(
      error instanceof Error ? error.message : 'Pages non valides.',
      422,
      'invalid_template',
    );
  }
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** An existing row ID may only be reused within its own array and parent. */
function assertOwnedRows(value: unknown, previous: unknown): void {
  if (Array.isArray(value)) {
    const originals = new Map(
      (Array.isArray(previous) ? previous : []).flatMap((row: unknown) => {
        const record = objectRecord(row);
        return record.id == null ? [] : [[String(record.id), record] as const];
      }),
    );
    for (const row of value) {
      const id = objectRecord(row).id;
      const original = id == null ? undefined : originals.get(String(id));
      if (id != null && (!original || !originals.delete(String(id)))) {
        throw new DeckSlidesError(
          'Identifiant de ligne inconnu ou en double dans cette diapositive.',
          422,
          'invalid_row_id',
        );
      }
      assertOwnedRows(row, original);
    }
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      // Lexical nodes are documents, not Payload rows.
      if (key !== 'root') assertOwnedRows(child, objectRecord(previous)[key]);
    }
  }
}

function applyMutation(slides: Slide[], command: Mutation) {
  const next = [...slides];
  if (command.action === 'insert') {
    if (command.index > slides.length)
      throw new DeckSlidesError('Position d’insertion invalide.', 422, 'invalid_index');
    assertOwnedRows(command.slide, undefined);
    // The authoring schema derives from Payload. The collection operation applies
    // field defaults and assigns the persisted ID.
    next.splice(command.index, 0, command.slide as Slide);
    return { next, index: command.index };
  }
  const { index, slide } = targetSlide(slides, command.slideId);
  if (command.action === 'delete') {
    next.splice(index, 1);
    return { next };
  }
  if (command.action === 'move') {
    if (command.index >= slides.length)
      throw new DeckSlidesError('Position de déplacement invalide.', 422, 'invalid_index');
    next.splice(index, 1);
    next.splice(command.index, 0, slide);
    return { next, index: command.index };
  }
  if (command.patch.blockType !== slide.blockType) {
    throw new DeckSlidesError(
      'Le type de bloc ne peut pas être changé par cette opération.',
      422,
      'block_type_mismatch',
    );
  }
  assertOwnedRows(command.patch, slide);
  next[index] = { ...slide, ...command.patch, blockType: slide.blockType } as Slide;
  return { next, index };
}

function mapPayloadError(error: unknown): unknown {
  if (error instanceof ValidationError) {
    return new DeckSlidesError(error.message, 422, 'invalid_slide');
  }
  if (error instanceof APIError && error.status === 403) {
    return new DeckSlidesError('Modification refusée.', 403, 'forbidden');
  }
  if (error instanceof APIError && error.status === 423) {
    return new DeckSlidesError(error.message, 423, 'locked');
  }
  if (error instanceof APIError && error.status === 404) {
    return new DeckSlidesError('Présentation introuvable.', 404, 'not_found');
  }
  return error;
}

async function mutate(actor: Actor, command: Mutation) {
  const { payload, user } = actor;
  // Authorize before grabbing a lock, then recheck against the locked row.
  const deck = await readDeck(actor, command.deckId, true);
  if ('slideId' in command) targetSlide(deck.slides ?? [], command.slideId);
  const inheritedId = await actor.req?.transactionID;
  const transactionID =
    inheritedId ?? (await payload.db.beginTransaction({ isolationLevel: 'read committed' }));
  if (transactionID == null) {
    throw new DeckSlidesError('Transaction indisponible.', 503, 'transaction_unavailable');
  }
  const req = { ...actor.req, transactionID };
  try {
    const db = payload.db.sessions?.[String(transactionID)]?.db;
    if (payload.db.name !== 'postgres' || !db) {
      throw new DeckSlidesError('Transaction indisponible.', 503, 'transaction_unavailable');
    }
    await payload.db.execute({
      db: db as PostgresAdapter['drizzle'],
      sql: sql`SELECT id FROM presentations WHERE id = ${command.deckId} FOR UPDATE`,
    });
    const locked = await readDeck({ payload, user, req }, command.deckId, true);
    const slides = locked.slides ?? [];
    if ('slideId' in command) targetSlide(slides, command.slideId);
    assertRevision(locked, command.expectedRevision);
    const { next, index } = applyMutation(slides, command);
    assertPages(locked, next);
    const updated = await payload.update({
      collection: COLLECTIONS.presentations,
      id: command.deckId,
      data: { slides: next },
      user,
      req,
      depth: 0,
      overrideAccess: false,
      overrideLock: false,
    });
    const after = { deckId: updated.id, revision: revisionOf(updated), buildQueued: true as const };
    const result =
      command.action === 'delete'
        ? { ...after, slideId: command.slideId }
        : { ...after, ...persistedSlide(updated.slides ?? [], index!) };
    if (inheritedId == null) await payload.db.commitTransaction(transactionID);
    return result;
  } catch (error) {
    if (inheritedId == null) await payload.db.rollbackTransaction(transactionID);
    throw mapPayloadError(error);
  }
}

function persistedSlide(slides: Slide[], index: number) {
  const slide = slides[index];
  if (typeof slide?.id !== 'string' || !slide.id) {
    throw new DeckSlidesError(
      'Identifiant stable de diapositive indisponible.',
      500,
      'missing_slide_id',
    );
  }
  // Layout snapshots are internal and may contain hidden fields or undo tokens.
  const { layoutContent: _layoutContent, blockName: _blockName, id: _id, ...content } = slide;
  return { slideId: slide.id, index, slide: content };
}

export async function inspectSlideDeletion(args: Actor & Omit<SlideDeletionTarget, 'action'>) {
  const deck = await readDeck(args, args.deckId, true);
  const slides = deck.slides ?? [];
  const { index } = targetSlide(slides, args.slideId);
  assertRevision(deck, args.expectedRevision);
  assertPages(
    deck,
    slides.filter((_, current) => current !== index),
  );
  return { title: deck.title, index };
}

export function executeDeckSlidesCommand(args: Actor & { command: Mutation }) {
  return mutate(args, args.command);
}

export async function readDeckSlides(args: Actor & ReadDeckSlidesQuery) {
  const deck = await readDeck(args, args.deckId);
  const slides = deck.slides ?? [];
  const base = { deckId: deck.id, revision: revisionOf(deck) };
  return args.slideId
    ? { ...base, ...persistedSlide(slides, targetSlide(slides, args.slideId).index) }
    : { ...base, slides: slides.map((_, index) => persistedSlide(slides, index)) };
}
