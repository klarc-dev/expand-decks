import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));

import { reviseSlide } from '../reviseSlide';
import { generateStructured } from '../model';

const mockedGenerateStructured = vi.mocked(generateStructured);

beforeEach(() => mockedGenerateStructured.mockReset());

describe('reviseSlide', () => {
  it('revises one slide against its own schema without changing its layout', async () => {
    mockedGenerateStructured.mockResolvedValue({
      blockType: 'table',
      title: 'A clearer comparison',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: 'One' }, { value: 'Two' }] }],
    } as never);

    const result = await reviseSlide({
      instruction: 'Shorten the copy and make the comparison clearer.',
      language: 'en',
      slide: {
        blockType: 'table',
        title: 'Original comparison',
        columns: [{ header: 'A' }, { header: 'B' }],
        rows: [{ cells: [{ value: 'One' }, { value: 'Two' }] }],
      },
    });

    expect(result.blockType).toBe('table');
    const call = mockedGenerateStructured.mock.calls[0]![0];
    expect(call.name).toBe('slide-revision:table');
    expect(call.prompt).toContain('Original comparison');
    expect(call.prompt).toContain('Shorten the copy');
    expect(call.instructions).toContain('UNE seule diapositive');
    expect(call.instructions).toContain('Required output language: English');
  });

  it('forbids replacing the requested result with instructions about how to produce it', async () => {
    mockedGenerateStructured.mockResolvedValue({
      blockType: 'statement',
      title: 'Concrete example',
      body: 'The actual facts, analysis, and conclusion.',
    } as never);

    await reviseSlide({
      instruction: 'Add a concrete example.',
      language: 'en',
      slide: {
        blockType: 'statement',
        title: 'Original',
        body: 'Original body',
      },
    });

    const call = mockedGenerateStructured.mock.calls[0]![0];
    expect(call.instructions).toContain('final audience-facing slide');
    expect(call.instructions).toContain('Never describe what should be written');
    expect(
      call.validate?.({
        title: 'Add a slide with an example',
        body: 'Create a slide that explains the example.',
      } as never),
    ).toEqual(expect.arrayContaining([expect.stringContaining('métadiscours de production')]));
  });

  it('rejects non-draftable slide layouts', async () => {
    await expect(
      reviseSlide({
        instruction: 'Rewrite it',
        language: 'en',
        slide: { blockType: 'markdown', content: '# Raw' },
      }),
    ).rejects.toThrow('not AI-draftable');
    expect(mockedGenerateStructured).not.toHaveBeenCalled();
  });

  it('revalidates the slide after restoring its locked layout', async () => {
    mockedGenerateStructured.mockResolvedValue({
      blockType: 'statement',
      title: '**Invalid revised title**',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: 'One' }, { value: 'Two' }] }],
    } as never);

    await expect(
      reviseSlide({
        instruction: 'Clarify it',
        language: 'en',
        slide: {
          blockType: 'table',
          title: 'Original comparison',
          columns: [{ header: 'A' }, { header: 'B' }],
          rows: [{ cells: [{ value: 'One' }, { value: 'Two' }] }],
        },
      }),
    ).rejects.toThrow('texte brut');
  });

  it('rejects an unknown slide layout', async () => {
    await expect(
      reviseSlide({
        instruction: 'Rewrite it',
        language: 'fr',
        slide: { blockType: 'not-a-layout', title: 'Raw' },
      }),
    ).rejects.toThrow('Unknown slide blockType');
    expect(mockedGenerateStructured).not.toHaveBeenCalled();
  });
});
