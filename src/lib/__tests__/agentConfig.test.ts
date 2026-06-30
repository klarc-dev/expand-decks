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
    expect(cfg.VISUAL_IMAGE_MAX_WIDTH).toBe(1280);
    expect(cfg.VISUAL_IMAGE_MAX_HEIGHT).toBe(720);
    expect(cfg.VISUAL_IMAGE_MAX_BYTES).toBe(750_000);
    expect(cfg.VISUAL_IMAGE_JPEG_QUALITY).toBe(78);
  });

  it('uses defaults for empty, NaN, or out-of-range values', async () => {
    vi.stubEnv('WRITER_CONCURRENCY', 'foo');
    vi.stubEnv('REVISE_MAX_ITERATIONS', '-1');
    vi.stubEnv('SCORE_THRESHOLD', '2');
    vi.stubEnv('VISUAL_IMAGE_MAX_WIDTH', '100');
    vi.stubEnv('VISUAL_IMAGE_MAX_HEIGHT', '2000');
    vi.stubEnv('VISUAL_IMAGE_MAX_BYTES', 'small');
    vi.stubEnv('VISUAL_IMAGE_JPEG_QUALITY', '39');
    const cfg = await loadConfig();
    expect(cfg.WRITER_CONCURRENCY).toBe(4);
    expect(cfg.REVISE_MAX_ITERATIONS).toBe(2);
    expect(cfg.SCORE_THRESHOLD).toBe(0.7);
    expect(cfg.VISUAL_IMAGE_MAX_WIDTH).toBe(1280);
    expect(cfg.VISUAL_IMAGE_MAX_HEIGHT).toBe(720);
    expect(cfg.VISUAL_IMAGE_MAX_BYTES).toBe(750_000);
    expect(cfg.VISUAL_IMAGE_JPEG_QUALITY).toBe(78);
  });

  it('accepts finite in-range values', async () => {
    vi.stubEnv('WRITER_CONCURRENCY', '8');
    vi.stubEnv('REVISE_MAX_ITERATIONS', '3');
    vi.stubEnv('SCORE_THRESHOLD', '0.85');
    vi.stubEnv('VISUAL_IMAGE_MAX_WIDTH', '1024');
    vi.stubEnv('VISUAL_IMAGE_MAX_HEIGHT', '576');
    vi.stubEnv('VISUAL_IMAGE_MAX_BYTES', '500000');
    vi.stubEnv('VISUAL_IMAGE_JPEG_QUALITY', '70');
    const cfg = await loadConfig();
    expect(cfg.WRITER_CONCURRENCY).toBe(8);
    expect(cfg.REVISE_MAX_ITERATIONS).toBe(3);
    expect(cfg.SCORE_THRESHOLD).toBe(0.85);
    expect(cfg.VISUAL_IMAGE_MAX_WIDTH).toBe(1024);
    expect(cfg.VISUAL_IMAGE_MAX_HEIGHT).toBe(576);
    expect(cfg.VISUAL_IMAGE_MAX_BYTES).toBe(500_000);
    expect(cfg.VISUAL_IMAGE_JPEG_QUALITY).toBe(70);
  });
});
