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

  it('returns a minimal block for non-aiDraftable types without calling the model', async () => {
    const md: OutlineStub = { blockType: 'markdown', title: 'Raw', intent: 'x' };
    const out = await writeSlide(md, dossier, []);
    expect(out).toEqual({ blockType: 'markdown', title: 'Raw' });
    expect(mocked).not.toHaveBeenCalled();
  });
});
