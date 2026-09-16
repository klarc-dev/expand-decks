import { PDFArray, PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { resolveInternalPdfLinks } from '../pdfLinks';

async function deckWithLinks(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const first = doc.addPage([1280, 720]);
  doc.addPage([1280, 720]);
  doc.addPage([1280, 720]);
  const link = (extra: Record<string, unknown>) =>
    doc.context.register(
      doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [10, 10, 200, 40], ...extra }),
    );
  first.node.set(
    PDFName.of('Annots'),
    doc.context.obj([
      link({ Dest: PDFName.of('3') }),
      link({ A: { S: 'GoTo', D: PDFName.of('2') } }),
      link({ Dest: PDFName.of('9') }),
      link({ A: { S: 'URI', URI: 'https://klarc.com/' } }),
    ]),
  );
  return doc.save({ useObjectStreams: false });
}

describe('resolveInternalPdfLinks', () => {
  it('rewrites numeric named destinations into explicit page destinations', async () => {
    const out = await resolveInternalPdfLinks(await deckWithLinks());
    const doc = await PDFDocument.load(out);
    const pages = doc.getPages();
    const annots = pages[0]!.node.lookup(PDFName.of('Annots')) as PDFArray;
    const dests = [];
    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookup(i) as never as {
        lookup: (k: PDFName) => unknown;
        get: (k: PDFName) => unknown;
      };
      const dest = annot.lookup(PDFName.of('Dest'));
      dests.push(
        dest instanceof PDFArray
          ? pages.findIndex((p) => p.ref === (dest.get(0) as PDFRef)) + 1
          : dest === undefined
            ? 'uri'
            : String(dest),
      );
    }
    // The dead link to page 9 is removed; the URI link keeps its action.
    expect(dests).toEqual([3, 2, 'uri']);
    expect(annots.size()).toBe(3);
  });

  it('returns the input untouched when there is nothing to resolve', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([1280, 720]);
    const bytes = await doc.save({ useObjectStreams: false });
    expect(await resolveInternalPdfLinks(bytes)).toBe(bytes);
  });
});
