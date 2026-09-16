import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNull, PDFString } from 'pdf-lib';

/**
 * Resolve internal slide links in an exported deck PDF.
 *
 * Slidev's `<Link :to="n">` prints as `<a href="#n">`, which Chromium turns
 * into a link annotation whose destination is the *name* `n`. The deck is
 * exported one slide per PDF and merged, so no page can define that name and
 * the annotation points at nothing. This pass rewrites every such link into an
 * explicit destination on page `n`, and drops links whose page does not exist.
 * URI links (mailto, https, tel) are left untouched.
 */
export async function resolveInternalPdfLinks(pdf: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  const pages = doc.getPages();
  let changed = false;

  for (const page of pages) {
    const annots = page.node.lookup(PDFName.of('Annots'));
    if (!(annots instanceof PDFArray)) continue;
    for (let index = annots.size() - 1; index >= 0; index--) {
      const annot = annots.lookup(index);
      if (!(annot instanceof PDFDict)) continue;
      if (annot.lookup(PDFName.of('Subtype')) !== PDFName.of('Link')) continue;
      const target = namedPage(annot);
      if (target === null) continue;
      changed = true;
      const targetPage = pages[target - 1];
      if (!targetPage) {
        annots.remove(index);
        continue;
      }
      annot.delete(PDFName.of('A'));
      annot.set(
        PDFName.of('Dest'),
        doc.context.obj([targetPage.ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]),
      );
    }
  }

  return changed ? doc.save({ useObjectStreams: false }) : pdf;
}

/** The 1-based page a link names through `/Dest` or a `/GoTo` action, else null. */
function namedPage(annot: PDFDict): number | null {
  const direct = annot.lookup(PDFName.of('Dest'));
  const action = annot.lookup(PDFName.of('A'));
  const viaAction =
    action instanceof PDFDict && action.lookup(PDFName.of('S')) === PDFName.of('GoTo')
      ? action.lookup(PDFName.of('D'))
      : undefined;
  const name = destinationName(direct) ?? destinationName(viaAction);
  return name !== null && /^\d+$/.test(name) ? Number(name) : null;
}

function destinationName(value: unknown): string | null {
  if (value instanceof PDFName) return value.decodeText();
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return null;
}
