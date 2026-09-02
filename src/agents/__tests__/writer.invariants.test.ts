import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the single LLM entry point so no network call happens; capture the prompt
// the writer builds and control the "model" output.
vi.mock('../model', () => ({
  generateStructured: vi.fn(),
}));

import { generateStructured } from '../model';
import { writeSlide } from '../agents/writer';
import type { DeckDossier } from '../schemas';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';

const mocked = vi.mocked(generateStructured);

const dossier: DeckDossier = {
  coreIdea: 'Lead with the conclusion.',
  audience: 'Corporate lawyers',
  soWhat: 'Judges decide early.',
  keyPoints: ['BLUF works'],
  data: ['Garner 2013'],
  sources: ['Garner, Legal Writing in Plain English'],
  rawBrief: '',
  language: 'en',
};

const stub: OutlineStub = {
  blockType: 'statement',
  title: 'Lead with your conclusion',
  intent: 'state the BLUF rule',
};

beforeEach(() => mocked.mockReset());

describe('writeSlide invariants', () => {
  it('force-locks blockType and title even if the model drifts them', async () => {
    // Model returns a DIFFERENT blockType/title — alignBatch must override.
    mocked.mockResolvedValue({
      blockType: 'cover',
      title: 'Something else entirely',
      body: 'drafted body',
    } as never);

    const out = await writeSlide(stub, dossier, ['Other slide A', 'Other slide B']);
    expect((out as { blockType: string }).blockType).toBe('statement');
    expect((out as { title: string }).title).toBe('Lead with your conclusion');
    expect((out as { body: string }).body).toBe('drafted body');
  });

  it('revalidates the complete slide after force-locking the planned title', async () => {
    mocked.mockResolvedValue({
      blockType: 'statement',
      title: 'Valid model title',
      body: 'drafted body',
    } as never);

    await expect(
      writeSlide({ ...stub, title: '**Invalid planned title**' }, dossier, []),
    ).rejects.toThrow('texte brut');
  });

  it('passes other slides TITLES into the prompt (small-context: no bodies)', async () => {
    mocked.mockResolvedValue({ blockType: 'statement', title: stub.title } as never);

    await writeSlide(stub, dossier, ['Title of slide two', 'Title of slide three']);

    const prompt = mocked.mock.calls[0]![0].prompt;
    expect(prompt).toContain('Title of slide two');
    expect(prompt).toContain('Title of slide three');
    // The writer's own intent is present; the dossier core idea is present.
    expect(prompt).toContain('state the BLUF rule');
    expect(prompt).toContain('Lead with the conclusion.');
  });

  it('gives the writer the complete authorized dossier and forbids unsupported elaboration', async () => {
    mocked.mockResolvedValue({ blockType: 'statement', title: stub.title } as never);

    await writeSlide(stub, dossier, []);

    const call = mocked.mock.calls[0]![0];
    expect(call.prompt).toContain('Judges decide early.');
    expect(call.prompt).toContain('BLUF works');
    expect(call.instructions).toContain('N’ajoute aucun fait, chiffre, attribution, cas');
    expect(call.instructions).toContain('directement du dossier');
  });

  it('receives only the selected layout guidance and no deck-level planning commands', async () => {
    mocked.mockResolvedValue({ blockType: 'statement', title: stub.title } as never);

    await writeSlide(stub, dossier, []);

    const instructions = mocked.mock.calls[0]![0].instructions;
    expect(instructions).toContain('**statement**');
    expect(instructions).not.toContain('**cover**');
    expect(instructions).not.toContain('**table**');
    expect(instructions).not.toContain('Commence TOUJOURS');
    expect(instructions).not.toContain('Termine TOUJOURS');
    expect(instructions).not.toContain('nombre de diapositives');
    expect(instructions).toContain('Required output language: English');
  });

  it('does not expose dossier sources in the writer prompt while keeping grounded data', async () => {
    mocked.mockResolvedValue({ blockType: 'statement', title: stub.title } as never);

    await writeSlide(stub, dossier, []);

    const prompt = mocked.mock.calls[0]![0].prompt;
    const instructions = mocked.mock.calls[0]![0].instructions;
    expect(prompt).toContain('Garner 2013');
    expect(prompt).not.toContain('SOURCES :');
    expect(prompt).not.toContain('Garner, Legal Writing in Plain English');
    expect(instructions).toContain('Ne rédige jamais de rubrique bibliographique visible');
  });

  it('returns a minimal block for non-aiDraftable types without calling the model', async () => {
    const md: OutlineStub = { blockType: 'markdown', title: 'Raw', intent: 'x' };
    const out = await writeSlide(md, dossier, []);
    expect(out).toEqual({ blockType: 'markdown', title: 'Raw' });
    expect(mocked).not.toHaveBeenCalled();
  });

  it('supplies the existing deck and preservation rule during a revision', async () => {
    mocked.mockResolvedValue({ blockType: 'statement', title: stub.title } as never);

    await writeSlide(stub, dossier, [], '[{"slide":1,"title":"Existing title"}]');

    const prompt = mocked.mock.calls[0]![0].prompt;
    expect(prompt).toContain('DEMANDE DE RÉVISION');
    expect(prompt).toContain(dossier.rawBrief);
    expect(prompt).toContain('DECK EXISTANT À RÉVISER');
    expect(prompt).toContain('Existing title');
    expect(prompt).toContain('Préserve mot pour mot');
  });

  it('returns an unchanged existing slide when the revision does not target it', async () => {
    const existing = {
      blockType: 'statement',
      title: stub.title,
      eyebrow: 'Existing eyebrow',
      body: 'Existing body',
      footer: 'Existing footer',
      variant: 'big-statement',
    };

    const out = await writeSlide(
      { ...stub, intent: 'Préserve intégralement cette diapositive existante' },
      dossier,
      [],
      JSON.stringify([existing]),
    );

    expect(out).toEqual(existing);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('returns an unchanged existing slide when the revision does not target it', async () => {
    const existing = {
      blockType: 'statement',
      title: stub.title,
      eyebrow: 'Existing eyebrow',
      body: 'Existing body',
      footer: 'Existing footer',
      variant: 'big-statement',
    };

    const out = await writeSlide(
      { ...stub, intent: 'Préserve intégralement cette diapositive existante' },
      dossier,
      [],
      JSON.stringify([existing]),
    );

    expect(out).toEqual(existing);
    expect(mocked).not.toHaveBeenCalled();
  });
});
