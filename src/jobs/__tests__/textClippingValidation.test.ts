import { execFile as execFileCb } from 'node:child_process';
import { mkdtemp, rm, symlink, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { buildSlidesMd } from '../../export/buildSlidesMd';
import { exportSlidePngs } from '../../agents/tools/exportSlidePngs';

const execFile = promisify(execFileCb);
const workspace = resolve('slidev-workspace');

it('rejects internal hidden text in SPA and native print but permits cropped decoration', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'slidev-text-gate-'));
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development' };
  const run = (command: string, args: string[]) =>
    execFile(command, args, {
      cwd: dir,
      env,
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  const validate = () =>
    run(process.execPath, [join(workspace, 'validate-layout.mjs'), join(dir, 'dist'), '3']);
  try {
    await symlink(join(workspace, 'node_modules'), join(dir, 'node_modules'), 'dir');
    await writeFile(
      join(dir, 'slides.md'),
      `---\ntheme: default\nrouterMode: hash\nfonts:\n  local: sans-serif\n  sans: sans-serif\n---\n# Full text required\n<div class="text-box"><p>${'Meaningful variable content '.repeat(50)}</p></div>\n<div style="width:20px;height:20px;overflow:hidden"><svg width="100" height="100"><circle r="90"/></svg></div>\n\n---\n\n# Second page fits\n\n---\n\n# Third page fits\n`,
    );
    const css = '.text-box {height:40px;overflow:hidden}';
    await writeFile(join(dir, 'style.css'), css);
    await run(join(workspace, 'node_modules/.bin/slidev'), ['build', '--base', './']);
    const failure = await validate().catch((error: { stderr: string }) => error);
    expect(failure.stderr).toContain('text-clipping');
    const diagnostics = JSON.parse(failure.stderr.slice(failure.stderr.indexOf('{')));
    expect([
      ...new Set(diagnostics.violations.map((violation: { slide: number }) => violation.slide)),
    ]).toEqual([1]);
    // Repair only the built CSS: SPA passes, native print must still reject.
    const { readdir } = await import('node:fs/promises');
    for (const file of await readdir(join(dir, 'dist/assets'))) {
      if (!file.endsWith('.css')) continue;
      const path = join(dir, 'dist/assets', file);
      await writeFile(
        path,
        (await readFile(path, 'utf8')).replace(/\.text-box\{[^}]+\}/g, '.text-box{font-size:8px}'),
      );
    }
    await expect(validate()).rejects.toMatchObject({
      stderr: expect.stringContaining('text-clipping'),
    });
    await writeFile(join(dir, 'style.css'), '.text-box{font-size:8px}');
    await expect(validate()).resolves.toMatchObject({
      stdout: expect.stringContaining('"valid":true'),
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 240_000);

it('fails closed for within-limit card copy that cannot fit legibly', async () => {
  const description = {
    root: {
      type: 'root',
      version: 1,
      format: '' as const,
      indent: 0,
      direction: null,
      children: Array.from({ length: 35 }, () => ({
        type: 'paragraph',
        version: 1,
        format: '' as const,
        indent: 0,
        direction: null,
        children: [
          {
            type: 'text',
            version: 1,
            text: 'Full',
            format: 0,
            detail: 0,
            mode: 'normal',
            style: '',
          },
        ],
      })),
    },
  };
  const markdown = buildSlidesMd({
    title: 'No truncated cards',
    slides: [
      {
        blockType: 'cardGrid',
        title: 'Cards',
        columns: '2',
        cards: [
          { number: '01', title: 'Keep every line', description },
          { number: '02', title: 'Other card' },
          { number: '03', title: 'Other card' },
          { number: '04', title: 'Other card' },
        ],
      },
    ],
  });
  const result = await exportSlidePngs(markdown);
  try {
    await expect(result.validateLayout()).rejects.toMatchObject({
      name: 'SlideLayoutValidationError',
    });
  } finally {
    result.cleanup();
  }
}, 240_000);
