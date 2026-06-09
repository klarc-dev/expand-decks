import { readFileSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

// Load .env for live/integration tests (e.g. the agent smokes that hit the
// 9router gateway). Unit tests ignore it. Best-effort: missing file is fine.
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
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    env: loadDotenv(),
  },
});
