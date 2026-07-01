import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it } from 'vitest';

import { assemblePdf, pdfPageCount, splitRangePdf } from '../pdfAssemble';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-assemble-'));
  dirs.push(dir);
  return dir;
}

async function makePdf(path: string, pages: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([200, 200]);
  writeFileSync(path, await doc.save());
}

describe('pdfAssemble', () => {
  it('splits a range PDF into per-index page files', async () => {
    const dir = tmp();
    const src = join(dir, 'range.pdf');
    await makePdf(src, 2);

    const written: number[] = [];
    await splitRangePdf(src, [1, 3], async (pageIndex, data) => {
      written.push(pageIndex);
      writeFileSync(join(dir, `${pageIndex}.pdf`), data);
    });

    expect(written).toEqual([1, 3]);
    expect(await pdfPageCount(join(dir, '1.pdf'))).toBe(1);
    expect(await pdfPageCount(join(dir, '3.pdf'))).toBe(1);
  });

  it('fails closed when the range PDF page count does not match the dirty set', async () => {
    const dir = tmp();
    const src = join(dir, 'range.pdf');
    await makePdf(src, 1);

    await expect(splitRangePdf(src, [1, 2], async () => {})).rejects.toThrow(/page count mismatch/);
  });

  it('assembles cached single-page PDFs in deck order', async () => {
    const dir = tmp();
    const p0 = join(dir, '0.pdf');
    const p1 = join(dir, '1.pdf');
    await makePdf(p0, 1);
    await makePdf(p1, 1);

    const out = join(dir, 'full.pdf');
    await assemblePdf([p0, p1], out);

    expect(readFileSync(out).byteLength).toBeGreaterThan(0);
    expect(await pdfPageCount(out)).toBe(2);
  });
});
