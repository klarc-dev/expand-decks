import { describe, it, expect } from 'vitest';
import { mastra } from '../mastra';

const BRIEF =
  'Court deck (5–6 slides) for corporate lawyers: why leading with the conclusion (BLUF) makes an expert legal talk land. Cover the cognitive reason, one concrete example, and the main objection refuted.';

describe('phase2 timing', () => {
  it('runs with step timing', { timeout: 900_000 }, async () => {
    const t0 = Date.now();
    const run = await mastra.getWorkflow('deckWorkflow').createRun();
    const stream = run.stream({ inputData: { brief: BRIEF }, initialState: { visual: false } });
    for await (const chunk of stream) {
      if (chunk.type === 'workflow-step-start' || chunk.type === 'workflow-step-result') {
        console.log(
          `[${((Date.now() - t0) / 1000).toFixed(0)}s]`,
          chunk.type,
          (chunk as any).payload?.id ?? '',
        );
      }
    }
    const res = await stream.result;
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] status=${res.status}`);
    if (res.status === 'failed') console.log('ERROR:', res.error?.message ?? res.error);
    expect(res.status).toBe('success');
  });
});
