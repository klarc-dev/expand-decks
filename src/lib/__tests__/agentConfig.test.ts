import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadConfig() {
  vi.resetModules();
  return import('../agentConfig');
}

describe('agentConfig env parsing', () => {
  it('uses defaults for missing values', async () => {
    const cfg = await loadConfig();
    expect(cfg.WRITER_CONCURRENCY).toBe(4);
    expect(cfg.REVISE_MAX_ITERATIONS).toBe(2);
    expect(cfg.SCORE_THRESHOLD).toBe(0.7);
  });

  it('uses defaults for empty, NaN, or out-of-range values', async () => {
    vi.stubEnv('WRITER_CONCURRENCY', 'foo');
    vi.stubEnv('REVISE_MAX_ITERATIONS', '-1');
    vi.stubEnv('SCORE_THRESHOLD', '2');
    const cfg = await loadConfig();
    expect(cfg.WRITER_CONCURRENCY).toBe(4);
    expect(cfg.REVISE_MAX_ITERATIONS).toBe(2);
    expect(cfg.SCORE_THRESHOLD).toBe(0.7);
  });

  it('accepts finite in-range values', async () => {
    vi.stubEnv('WRITER_CONCURRENCY', '8');
    vi.stubEnv('REVISE_MAX_ITERATIONS', '3');
    vi.stubEnv('SCORE_THRESHOLD', '0.85');
    const cfg = await loadConfig();
    expect(cfg.WRITER_CONCURRENCY).toBe(8);
    expect(cfg.REVISE_MAX_ITERATIONS).toBe(3);
    expect(cfg.SCORE_THRESHOLD).toBe(0.85);
  });
});
