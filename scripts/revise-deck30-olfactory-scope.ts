import { writeFileSync } from 'node:fs';
import { runPayloadScript } from './lib/payloadScript';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { runBuildSlidesTask } from '../src/jobs/buildSlidesRunner';

const title =
  "Signes distinctifs et originaux : sécuriser l'identité et l'image de votre projet innovant";
const desiredTitle = 'Un graphisme repris';
const desiredDescription =
  'La ressemblance olfactive ne suffit pas. Une création indépendante ou une analyse licite peut écarter une atteinte au secret, mais n’autorise pas l’exploitation d’une invention brevetée.';
const desiredFootnote = 'CPI, art. L. 613-3, L. 713-2, L. 513-4 et L. 122-4.';
const slide24Eyebrow = 'Retour au lancement · Avant la campagne allemande';
const slide24Lead =
  'Retour au logo initial, avant la refonte. Votez : oui / non en l’état / informations insuffisantes. Quelle pièce vous fait décider ?';
const slide24Agency =
  'Logo initial, supposé original ; droits cédés pour la France uniquement ; adaptation non autorisée.';
const text = (v: any): string =>
  typeof v === 'string'
    ? v
    : (v?.text ?? (v?.root ? text(v.root) : (v?.children ?? []).map(text).join('')));

await runPayloadScript(async (payload) => {
  const before: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 0 });
  if (before.title !== title || before.slides?.length !== 25)
    throw new Error('Deck identity changed');
  const s22 = before.slides[21];
  if (s22.blockType !== 'cardGrid' || s22.cards?.length !== 3)
    throw new Error('Unexpected slide 22 structure');
  if (s22.cards[2].title !== desiredTitle)
    throw new Error(`Unexpected slide 22 card title: ${s22.cards[2].title}`);
  if (
    ![
      'CPI, art. L. 713-2, L. 513-4, L. 122-4 et L. 613-3 ; C. com., art. L. 151-3 à L. 151-5.',
      'CPI, art. L. 713-2, L. 513-4 et L. 122-4.',
      'CPI, art. L. 613-3, L. 713-2, L. 513-4 et L. 122-4.',
    ].includes(s22.footnotes?.[0]?.text)
  )
    throw new Error('Unexpected slide 22 footnote; refusing non-minimal patch');
  const s24 = before.slides[23];
  if (s24.blockType !== 'table' || s24.rows?.[1]?.cells?.[1]?.value === undefined)
    throw new Error('Unexpected slide 24 structure');
  writeFileSync('/tmp/deck30-olfactory-before.json', JSON.stringify(before));

  const slides = structuredClone(before.slides);
  slides[21].cards[2].title = desiredTitle;
  slides[21].cards[2].description = desiredDescription;
  slides[21].footnotes[0].text = desiredFootnote;
  slides[23].eyebrow = slide24Eyebrow;
  slides[23].lead = slide24Lead;
  slides[23].rows[1].cells[1].value = slide24Agency;

  const fresh: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 0 });
  if (fresh.updatedAt !== before.updatedAt)
    throw new Error('Concurrent edit detected; refusing write');
  const converted: any = await convertSlidesMarkdownToLexical(slides, payload);
  await payload.update({
    collection: 'presentations',
    id: 30,
    data: { slides: converted },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const saved: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 0 });
  if (saved.title !== title || saved.slides?.length !== 25)
    throw new Error('Identity readback failed');
  for (let i = 0; i < 25; i++)
    if (
      i !== 21 &&
      i !== 23 &&
      JSON.stringify(saved.slides[i]) !== JSON.stringify(before.slides[i])
    )
      throw new Error(`Unexpected change slide ${i + 1}`);
  if (
    saved.slides[21].cards[2].title !== desiredTitle ||
    text(saved.slides[21].cards[2].description) !== desiredDescription ||
    saved.slides[21].footnotes[0].text !== desiredFootnote ||
    saved.slides[23].eyebrow !== slide24Eyebrow ||
    text(saved.slides[23].lead) !== slide24Lead ||
    text(saved.slides[23].rows[1].cells[1].value) !== slide24Agency
  )
    throw new Error('Content readback failed');

  const build = await runBuildSlidesTask({ input: { presentationId: 30 }, req: { payload } });
  const after: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 1 });
  const final: any = await payload.findByID({ collection: 'presentations', id: 30, depth: 0 });
  if (
    !build.output.success ||
    final.lastBuildStatus !== 'success' ||
    final.slides[21].cards[2].title !== desiredTitle ||
    text(final.slides[21].cards[2].description) !== desiredDescription ||
    final.slides[21].footnotes[0].text !== desiredFootnote ||
    final.slides[23].eyebrow !== slide24Eyebrow ||
    text(final.slides[23].lead) !== slide24Lead ||
    text(final.slides[23].rows[1].cells[1].value) !== slide24Agency
  )
    throw new Error('Build or final readback failed');
  for (let i = 0; i < 25; i++)
    if (i !== 21 && i !== 23 && JSON.stringify(final.slides[i]) !== JSON.stringify(saved.slides[i]))
      throw new Error(`Build changed slide ${i + 1}`);

  const out = {
    title: after.title,
    count: after.slides.length,
    status: after.lastBuildStatus,
    changedSlides: [22, 24],
    slide22: {
      description: text(final.slides[21].cards[2].description),
      footnote: final.slides[21].footnotes[0].text,
    },
    slide24: {
      eyebrow: final.slides[23].eyebrow,
      lead: text(final.slides[23].lead),
      agency: text(final.slides[23].rows[1].cells[1].value),
    },
    otherSlidesUnchanged: true,
    artifacts: after.artifacts.map((a: any) => ({
      key: a.key,
      file: a.file?.filename,
      id: a.file?.id,
      url: a.url,
    })),
  };
  writeFileSync('/tmp/deck30-olfactory-result.json', JSON.stringify(out));
  console.log(JSON.stringify(out));
});
