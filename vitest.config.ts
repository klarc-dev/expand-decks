import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Load .env for live/integration tests (e.g. the agent smokes that hit the
// configured AI gateway). Unit tests ignore it. Best-effort: missing file is fine.
function loadDotenv(): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    env: loadDotenv(),
    // Node 20.20.x + undici@8 (pulled by Payload) crashes on import because
    // undici calls worker_threads.markAsUncloneable, absent in this runtime.
    // The setup file installs a no-op shim before any test module loads undici.
    setupFiles: ['./vitest.setup.ts'],
  },
});
