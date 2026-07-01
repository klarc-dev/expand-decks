import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR } from '../../lib/paths';
import { stageBuildDir } from '../buildSlidesRunner';

const createdWorkdirs: string[] = [];
const createdFontsDir = !existsSync(PUBLIC_FONTS_DIR);

afterEach(() => {
  for (const workdir of createdWorkdirs.splice(0)) {
    rmSync(workdir, { recursive: true, force: true });
  }
  if (createdFontsDir) {
    rmSync(PUBLIC_FONTS_DIR, { recursive: true, force: true });
  }
});

function stage() {
  const workdir = stageBuildDir({
    slidesMd: '---\nlayout: cover\n---\n\n# Test',
    themeCss: ':root { --x: 1; }',
    footerEnabled: false,
    logoPresent: false,
  });
  createdWorkdirs.push(workdir);
  return workdir;
}

describe('stageBuildDir cache posture', () => {
  it('symlinks node_modules to the Slidev workspace to preserve the default Vite cache', () => {
    const workdir = stage();
    const nodeModules = join(workdir, 'node_modules');

    expect(lstatSync(nodeModules).isSymbolicLink()).toBe(true);
    expect(readlinkSync(nodeModules)).toBe(join(process.cwd(), 'slidev-workspace', 'node_modules'));
  });

  it('links media instead of copying it when media exists', () => {
    expect(existsSync(MEDIA_DIR)).toBe(true);

    const workdir = stage();
    const media = join(workdir, 'media');

    expect(lstatSync(media).isSymbolicLink()).toBe(true);
    expect(readlinkSync(media)).toBe(MEDIA_DIR);
  });

  it('copies public fonts into the staged public directory when fonts exist', () => {
    mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });
    writeFileSync(join(PUBLIC_FONTS_DIR, 'contract-font.txt'), 'font');

    const workdir = stage();

    expect(existsSync(join(workdir, 'public', ARTIFACTS.fonts, 'contract-font.txt'))).toBe(true);
  });
});
