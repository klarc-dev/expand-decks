import { readFile, writeFile } from 'node:fs/promises';

import { PDFDocument } from 'pdf-lib';

export async function pdfPageCount(path: string): Promise<number> {
  const pdf = await PDFDocument.load(await readFile(path));
  return pdf.getPageCount();
}

/**
 * Split a Slidev range-exported PDF into page files keyed by original dirty index.
 * Fails closed when Slidev returns a different number of pages than requested.
 */
export async function splitRangePdf(
  sourcePdfPath: string,
  dirtyIndexes: readonly number[],
  writePage: (pageIndex: number, data: Uint8Array) => Promise<void>,
): Promise<void> {
  const source = await PDFDocument.load(await readFile(sourcePdfPath));
  if (source.getPageCount() !== dirtyIndexes.length) {
    throw new Error(
      `Range PDF page count mismatch: expected ${dirtyIndexes.length}, got ${source.getPageCount()}`,
    );
  }

  for (let i = 0; i < dirtyIndexes.length; i += 1) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(source, [i]);
    out.addPage(page);
    await writePage(dirtyIndexes[i]!, await out.save());
  }
}

/** Assemble cached one-page PDFs in deck order into a full artifact PDF. */
export async function assemblePdf(
  pagePaths: readonly string[],
  outputPdfPath: string,
): Promise<void> {
  const out = await PDFDocument.create();
  for (const pagePath of pagePaths) {
    const source = await PDFDocument.load(await readFile(pagePath));
    if (source.getPageCount() !== 1) {
      throw new Error(`Cached PDF page must contain exactly 1 page: ${pagePath}`);
    }
    const [page] = await out.copyPages(source, [0]);
    out.addPage(page);
  }
  await writeFile(outputPdfPath, await out.save());
}
