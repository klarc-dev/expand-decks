import { readFile } from 'node:fs/promises';
import { extractText } from 'unpdf';
import { runPayloadScript } from './lib/payloadScript';
const text = (v: any): string =>
  typeof v === 'string'
    ? v
    : (v?.text ?? (v?.root ? text(v.root) : (v?.children ?? []).map(text).join('')));
await runPayloadScript(async (payload) => {
  const d: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 1 });
  const pdf = d.artifacts.find((a: any) => a.key === 'pdf')?.file;
  const p = pdf?.filename ? `/app/media/${pdf.filename}` : '';
  let pdfText = '';
  if (p) {
    try {
      const bytes = await readFile(p);
      const extracted: any = await extractText(new Uint8Array(bytes));
      pdfText = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text;
    } catch {
      pdfText = '';
    }
  }
  const expectedDescription =
    'La ressemblance olfactive ne suffit pas. Une création indépendante ou une analyse licite peut écarter une atteinte au secret, mais n’autorise pas l’exploitation d’une invention brevetée.';
  const expectedFootnote = 'CPI, art. L. 613-3, L. 713-2, L. 513-4 et L. 122-4.';
  const expectedEyebrow = 'Retour au lancement · Avant la campagne allemande';
  const expectedLead =
    'Retour au logo initial, avant la refonte. Votez : oui / non en l’état / informations insuffisantes. Quelle pièce vous fait décider ?';
  const expectedAgency =
    'Logo initial, supposé original ; droits cédés pour la France uniquement ; adaptation non autorisée.';
  const out = {
    title: d.title,
    count: d.slides.length,
    status: d.lastBuildStatus,
    cardTitle: d.slides[21].cards[2].title,
    cardDescription: text(d.slides[21].cards[2].description),
    footnote: d.slides[21].footnotes[0].text,
    slide24: {
      eyebrow: d.slides[23].eyebrow,
      lead: text(d.slides[23].lead),
      agency: text(d.slides[23].rows[1].cells[1].value),
    },
    pdfFilename: pdf?.filename,
    pdfContainsExpected:
      pdfText.includes('Un graphisme repris') &&
      pdfText.includes(expectedDescription) &&
      pdfText.includes(expectedEyebrow) &&
      pdfText.includes(expectedAgency),
    pdfContainsOldContent: pdfText.includes('Comparer les éléments repris du logo ou de l’étui'),
    pdfTextAvailable: Boolean(pdfText),
  };
  if (
    out.title !==
      "Signes distinctifs et originaux : sécuriser l'identité et l'image de votre projet innovant" ||
    out.count !== 25 ||
    out.status !== 'success' ||
    out.cardTitle !== 'Un graphisme repris' ||
    out.cardDescription !== expectedDescription ||
    out.footnote !== expectedFootnote ||
    out.slide24.eyebrow !== expectedEyebrow ||
    out.slide24.lead !== expectedLead ||
    out.slide24.agency !== expectedAgency ||
    !out.pdfContainsExpected ||
    out.pdfContainsOldContent
  )
    throw new Error(`Deck verification failed: ${JSON.stringify(out)}`);
  console.log(JSON.stringify(out));
});
