import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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

function stage(mediaFilenames: string[] = []) {
  const workdir = stageBuildDir({
    slidesMd: '---\nlayout: cover\n---\n\n# Test',
    themeCss: ':root { --x: 1; }',
    mermaidConfigSource: 'export const marker = "brand";',
    footerEnabled: false,
    logoPresent: false,
    mediaFilenames,
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

  it('writes the generated Mermaid config into the staged setup directory', () => {
    const workdir = stage();
    expect(readFileSync(join(workdir, ARTIFACTS.setupDir, 'mermaidConfig.ts'), 'utf-8')).toBe(
      'export const marker = "brand";',
    );
  });

  it('copies public fonts into the staged public directory when fonts exist', () => {
    mkdirSync(PUBLIC_FONTS_DIR, { recursive: true });
    writeFileSync(join(PUBLIC_FONTS_DIR, 'contract-font.txt'), 'font');

    const workdir = stage();

    expect(existsSync(join(workdir, 'public', ARTIFACTS.fonts, 'contract-font.txt'))).toBe(true);
  });

  it('copies referenced media into public so Slidev can embed it in SPA and PDF exports', () => {
    const filename = 'stage-build-avatar.png';
    writeFileSync(join(MEDIA_DIR, filename), 'avatar');

    try {
      const workdir = stage([filename]);
      expect(readFileSync(join(workdir, 'public', 'media', filename), 'utf-8')).toBe('avatar');
    } finally {
      rmSync(join(MEDIA_DIR, filename), { force: true });
    }
  });
});
