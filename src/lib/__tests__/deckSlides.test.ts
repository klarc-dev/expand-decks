import type { Payload, TypedUser } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import type { Presentation } from '@/payload-types';
import { executeDeckSlidesCommand, inspectSlideDeletion, readDeckSlides } from '../deckSlides';
import { deckSlidesCommandSchema, deckSlidesRevision } from '../deckSlidesContract';

type Slides = NonNullable<Presentation['slides']>;
const author = {
  id: 1,
  role: 'author',
  membershipStatus: 'active',
  organisations: [4],
} as TypedUser;
const viewer = { ...author, role: 'viewer' as const };
const outsider = { ...author, organisations: [5] };
const initial: Slides = [
  { id: 'cover', blockType: 'cover', title: 'Deck title' },
  {
    id: 'existing',
    blockType: 'statement',
    title: 'Keep me',
    layoutContent: { internal: true },
    footnotes: [{ id: 'note-1', text: 'Detail' }],
  },
];

function setup(slides = initial, documentTemplate = 'presentation') {
  let current = structuredClone(slides);
  const revision = () => deckSlidesRevision(current, documentTemplate);
  const db = {
    name: 'postgres',
    sessions: { tx: { db: { transaction: true } } },
    beginTransaction: vi.fn(async () => 'tx'),
    commitTransaction: vi.fn(async () => undefined),
    rollbackTransaction: vi.fn(async () => undefined),
    execute: vi.fn(async () => undefined),
  };
  const findByID = vi.fn(async () => ({
    id: 42,
    title: 'My deck',
    organisation: 4,
    documentTemplate,
    slides: structuredClone(current),
  }));
  const update = vi.fn(async ({ data }: { data: { slides: Slides } }) => {
    current = structuredClone(data.slides).map((slide) => ({
      ...slide,
      id: slide.id ?? 'assigned-by-payload',
    }));
    return findByID();
  });
  const payload = { db, findByID, update } as unknown as Payload;
  return { db, findByID, update, payload, revision, current: () => current };
}

const deckId = 42;

function parseMutation(input: unknown) {
  const parsed = deckSlidesCommandSchema.parse(input);
  if (parsed.action === 'prepare-delete') throw new Error('Unexpected prepare-delete');
  return parsed;
}

describe('stable slide operations', () => {
  it('lists, gets, inserts, patches, moves, and deletes without losing other authored data', async () => {
    const api = setup();
    const actor = { payload: api.payload, user: author };
    const run = (input: Record<string, unknown>) =>
      executeDeckSlidesCommand({ ...actor, command: parseMutation(input) });
    expect(await readDeckSlides({ ...actor, deckId })).toMatchObject({
      revision: api.revision(),
      slides: [
        { slideId: 'cover', index: 0 },
        { slideId: 'existing', index: 1 },
      ],
    });
    const read = await readDeckSlides({ ...actor, deckId, slideId: 'existing' });
    expect(read).toMatchObject({
      slide: { title: 'Keep me' },
    });
    expect(read).not.toHaveProperty('slide.layoutContent');
    const inserted = await run({
      action: 'insert',
      deckId,
      expectedRevision: api.revision(),
      index: 1,
      slide: { blockType: 'statement', title: 'Inserted' },
    });
    const slideId = 'assigned-by-payload';
    expect(inserted).toMatchObject({ slideId, index: 1, buildQueued: true });
    const updated = await run({
      action: 'update',
      deckId,
      expectedRevision: api.revision(),
      slideId: 'existing',
      patch: { blockType: 'statement', title: 'Edited' },
    });
    expect(updated).toMatchObject({
      slideId: 'existing',
      index: 2,
      slide: { title: 'Edited', footnotes: [{ id: 'note-1' }] },
    });
    expect(api.current()[2]?.layoutContent).toEqual({ internal: true });
    expect(
      await run({ action: 'move', deckId, slideId, expectedRevision: api.revision(), index: 2 }),
    ).toMatchObject({ slideId, index: 2 });
    const deletion = { deckId, slideId, expectedRevision: api.revision() };
    expect(await inspectSlideDeletion({ ...actor, ...deletion })).toEqual({
      title: 'My deck',
      index: 2,
    });
    expect(
      await executeDeckSlidesCommand({ ...actor, command: { action: 'delete', ...deletion } }),
    ).toMatchObject({
      deckId,
      slideId,
      buildQueued: true,
    });
    expect(api.current().map((slide) => slide.id)).toEqual(['cover', 'existing']);
    expect(api.current()[0]).toEqual(initial[0]);
    expect(api.update).toHaveBeenCalledTimes(4);
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        overrideLock: false,
        req: expect.objectContaining({ transactionID: 'tx' }),
        data: { slides: api.current() },
      }),
    );
  });

  it('rechecks CAS after acquiring the row lock and never retries a stale write', async () => {
    const api = setup();
    const expectedRevision = api.revision();
    api.findByID.mockImplementationOnce(async () => ({
      id: deckId,
      title: 'My deck',
      organisation: 4,
      documentTemplate: 'presentation',
      slides: structuredClone(initial),
    }));
    api.db.execute.mockImplementationOnce(async () => {
      api.current()[1]!.title = 'Concurrent write';
    });
    await expect(
      executeDeckSlidesCommand({
        payload: api.payload,
        user: author,
        command: parseMutation({
          action: 'update',
          deckId,
          slideId: 'existing',
          expectedRevision,
          patch: { blockType: 'statement', title: 'Stale edit' },
        }),
      }),
    ).rejects.toMatchObject({ status: 409, code: 'stale' });
    expect(api.update).not.toHaveBeenCalled();
    expect(api.db.rollbackTransaction).toHaveBeenCalledWith('tx');
    expect(api.current()[1]?.title).toBe('Concurrent write');
  });

  it('enforces role, deck membership, and slide/deck binding before writing', async () => {
    const api = setup();
    const command = {
      action: 'move' as const,
      deckId,
      slideId: 'existing',
      expectedRevision: api.revision(),
      index: 0,
    };
    await expect(
      executeDeckSlidesCommand({ payload: api.payload, user: viewer, command }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      executeDeckSlidesCommand({ payload: api.payload, user: outsider, command }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      readDeckSlides({
        payload: api.payload,
        user: { ...author, membershipStatus: 'pending' },
        deckId,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      executeDeckSlidesCommand({
        payload: api.payload,
        user: author,
        command: { ...command, slideId: 'other-deck' },
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(api.db.beginTransaction).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('checks structural template constraints and nested row ownership', async () => {
    const api = setup([], 'visual-publication');
    const actor = { payload: api.payload, user: author };
    await expect(
      executeDeckSlidesCommand({
        ...actor,
        command: parseMutation({
          action: 'insert',
          deckId,
          index: 0,
          expectedRevision: api.revision(),
          slide: { blockType: 'cover', title: 'Not allowed' },
        }),
      }),
    ).rejects.toMatchObject({ code: 'invalid_template' });
    const foreign = setup();
    await expect(
      executeDeckSlidesCommand({
        ...actor,
        payload: foreign.payload,
        command: parseMutation({
          action: 'update',
          deckId,
          slideId: 'existing',
          expectedRevision: foreign.revision(),
          patch: { blockType: 'statement', footnotes: [{ id: 'other-slide-note', text: 'No' }] },
        }),
      }),
    ).rejects.toMatchObject({ code: 'invalid_row_id' });
    expect(api.update).not.toHaveBeenCalled();
    expect(foreign.update).not.toHaveBeenCalled();
  });

  it('joins the browser approval transaction and cannot replay a completed deletion', async () => {
    const api = setup();
    const args = {
      payload: api.payload,
      user: author,
      req: { transactionID: 'tx' },
      command: {
        action: 'delete' as const,
        deckId,
        slideId: 'existing',
        expectedRevision: api.revision(),
      },
    };
    await executeDeckSlidesCommand(args);
    expect(api.db.execute).toHaveBeenCalledOnce();
    expect(api.db.beginTransaction).not.toHaveBeenCalled();
    expect(api.db.commitTransaction).not.toHaveBeenCalled();
    await expect(executeDeckSlidesCommand(args)).rejects.toMatchObject({ status: 404 });
    expect(api.update).toHaveBeenCalledOnce();
  });
});
