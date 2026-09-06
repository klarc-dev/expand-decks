import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = vi.hoisted(() => ({ passage: vi.fn(), query: vi.fn() }));
vi.mock('@mastra/fastembed', () => ({
  fastembed: {
    multilingualE5LargePassage: { doEmbed: provider.passage },
    multilingualE5LargeQuery: { doEmbed: provider.query },
  },
}));
vi.mock('@mastra/pg', () => ({ PgVector: vi.fn() }));
vi.mock('../../env', () => ({ DATABASE_URL: 'postgres://unused' }));

import { embedKnowledgeQuery, embedKnowledgeValues } from '../knowledgeVector';

describe('knowledge embedding memory bounds', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('serializes overlapping passage and query requests on the shared native session', async () => {
    let active = 0;
    let peak = 0;
    const embed = async ({ values }: { values: string[] }) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return { embeddings: values.map(() => Array(1024).fill(0.1)) };
    };
    provider.passage.mockImplementation(embed);
    provider.query.mockImplementation(embed);

    await Promise.all([
      embedKnowledgeValues(['first', 'second']),
      embedKnowledgeValues(['third']),
      embedKnowledgeQuery('question'),
      embedKnowledgeQuery('another question'),
    ]);
    expect(peak).toBe(1);
  });

  it('propagates failures and still runs the next queued request', async () => {
    provider.passage.mockRejectedValueOnce(new Error('native failure'));
    provider.query.mockResolvedValue({ embeddings: [Array(1024).fill(0.2)] });
    const failed = expect(embedKnowledgeValues(['bad'])).rejects.toThrow('native failure');
    const next = embedKnowledgeQuery('valid');
    await failed;
    expect(await next).toEqual(Array(1024).fill(0.2));
    expect(provider.query).toHaveBeenCalledWith({ values: ['valid'] });
  });

  it('does not initialize a native model for an empty passage list', async () => {
    expect(await embedKnowledgeValues([])).toEqual([]);
    expect(provider.passage).not.toHaveBeenCalled();
  });

  it.each([{ embeddings: [] }, { embeddings: [[1, 2]] }])(
    'rejects missing or incorrect query dimensions: %j',
    async ({ embeddings }) => {
      provider.query.mockResolvedValue({ embeddings });
      await expect(embedKnowledgeQuery('question')).rejects.toThrow('dimension must be 1024');
    },
  );

  it('embeds one passage at a time without changing input or result order', async () => {
    provider.passage.mockImplementation(async ({ values }: { values: string[] }) => ({
      embeddings: values.map((value) => [Number(value)]),
    }));
    const values = Array.from({ length: 51 }, (_, i) => String(i));

    expect(await embedKnowledgeValues(values)).toEqual(values.map((value) => [Number(value)]));
    expect(provider.passage).toHaveBeenCalledTimes(51);
    expect(provider.passage.mock.calls.map(([args]) => args.values)).toEqual(
      values.map((v) => [v]),
    );
  });
});
