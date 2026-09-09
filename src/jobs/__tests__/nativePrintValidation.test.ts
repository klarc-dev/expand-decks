import { execFile as execFileCb } from 'node:child_process';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

const execFile = promisify(execFileCb);
const workspace = resolve('slidev-workspace');

it('rejects export-only transform failures even when the built SPA passes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'slidev-print-gate-'));
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development' };
  try {
    await symlink(join(workspace, 'node_modules'), join(dir, 'node_modules'), 'dir');
    await writeFile(
      join(dir, 'slides.md'),
      `---
theme: default
routerMode: hash
fonts:
  local: sans-serif
  sans: sans-serif
---
# Healthy slide

---

# Export-only failure
`,
    );
    await writeFile(
      join(dir, 'vite.config.ts'),
      `export default {
  plugins: [{
    name: 'regression-export-transform-failure',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('__slidev_2.md'))
        throw new Error('Deliberate export-only transform failure');
    },
  }],
};
`,
    );
    await execFile(join(workspace, 'node_modules/.bin/slidev'), ['build', '--base', './'], {
      cwd: dir,
      env,
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const validate = () =>
      execFile(process.execPath, [join(workspace, 'validate-layout.mjs'), join(dir, 'dist'), '2'], {
        cwd: workspace,
        env,
        timeout: 120_000,
        maxBuffer: 8 * 1024 * 1024,
      });
    await expect(validate()).rejects.toMatchObject({
      stderr: expect.stringContaining('Slidev native print validation failed'),
    });

    // The same SPA and source pass once the dev-only failure is removed.
    await rm(join(dir, 'vite.config.ts'));
    await expect(validate()).resolves.toMatchObject({
      stdout: expect.stringContaining('"valid":true'),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 240_000);
