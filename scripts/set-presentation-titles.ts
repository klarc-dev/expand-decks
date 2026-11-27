/**
 * One-off production cleanup: rename presentations and delete duplicates.
 *
 *   pnpm prod run scripts/set-presentation-titles.ts            # dry run
 *   pnpm prod run scripts/set-presentation-titles.ts --apply --yes
 *
 * Titles change without a rebuild (skipBuildQueue); slugs, hence published
 * URLs, stay stable. Each deletion is guarded by the expected current title so
 * a reused id can never be removed by mistake; the presentation's own media
 * (generated PDF, cover) are deleted with it.
 */
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const apply = process.argv.includes('--apply');

const RENAMES: Record<number, [from: string, to: string]> = {
  11: ['Le crédit impôt recherche', 'Crédit d’impôt recherche (CIR)'],
  12: ['IP Box', 'IP Box : le régime français'],
  13: ['Introduction à la PI', 'Introduction à la propriété industrielle'],
  14: [
    "Semaine d'intégration Klarc - Aides et subventions",
    'Semaine d’intégration Klarc : aides et subventions',
  ],
  15: [
    'Incoterms® 2020 — comprendre, choisir et sécuriser',
    'Incoterms® 2020 : comprendre, choisir et sécuriser',
  ],
  19: ['Marques Françaises : la marque de position', 'Marques françaises : la marque de position'],
  22: ["L'horodatage blockchain", 'Horodatage blockchain (carrousel LinkedIn)'],
  25: ['Klarc : Présentation clients', 'Klarc : présentation clients'],
  35: ['Presentation Cosmetic labs', 'Cosmetic Labs : presentation'],
  37: [
    'Optimiser et sécuriser ses partenariats R&D · 30 minutes',
    'Optimiser et sécuriser ses partenariats R&D (French Tech, 30 min)',
  ],
};

// id → expected current title; 27 = copy of 25, 31 = copy of 30,
// 23 = superseded version of 30, 20 and 32 = empty drafts.
const DELETIONS: Record<number, string> = {
  20: "Klarc, l'innovation à 360°",
  23: "Signes distinctifs - sécuriser l'identité et l'image de votre projet innovant",
  27: 'Klarc : Présentation clients',
  31: "Signes distinctifs et originaux : sécuriser l'identité et l'image de votre projet innovant",
  32: 'mark',
};

// SPA folders left on disk without any presentation behind them.
const ORPHAN_SPA = ['test', 'test-2', 'dogfood-grounded-pilot-deck', 'presentation-de-klarc'];

process.env.PAYLOAD_DB_PUSH = '0';
process.env.PAYLOAD_RUN_JOBS_IN_PROCESS = '0';
process.env.MASTRA_DISABLE_INIT = '1';
const [{ getPayload }, { default: config }, { closeScriptPayload }] = await Promise.all([
  import('payload'),
  import('../src/payload.config'),
  import('./lib/payloadScript'),
]);
const payload = await getPayload({ config, disableOnInit: true, cron: false });
const spaRoot = join(process.cwd(), 'media', 'spa');
let exitCode = 0;

try {
  const docs = await payload.find({
    collection: 'presentations',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { title: true, slug: true },
  });
  const byId = new Map(docs.docs.map((doc) => [Number(doc.id), doc]));
  const slugs = new Set(docs.docs.map((doc) => doc.slug));

  // Validate every precondition before the first write.
  const problems: string[] = [];
  for (const [id, [from, to]] of Object.entries(RENAMES)) {
    const doc = byId.get(Number(id));
    if (!doc) problems.push(`#${id} introuvable`);
    else if (doc.title !== from && doc.title !== to)
      problems.push(`#${id} porte « ${doc.title} », attendu « ${from} »`);
  }
  for (const [id, expected] of Object.entries(DELETIONS)) {
    const doc = byId.get(Number(id));
    if (doc && doc.title !== expected)
      problems.push(`#${id} porte « ${doc.title} », attendu « ${expected} »`);
  }
  for (const dir of ORPHAN_SPA) if (slugs.has(dir)) problems.push(`spa/${dir} est utilisé`);
  if (problems.length) throw new Error(`Préconditions non remplies :\n${problems.join('\n')}`);

  for (const [id, [, to]] of Object.entries(RENAMES)) {
    const doc = byId.get(Number(id))!;
    if (doc.title === to) continue;
    // Write the title column only: a full update would revalidate legacy page
    // content against today's length limits and refuse older decks.
    if (apply)
      await payload.db.updateOne({
        collection: 'presentations',
        id: Number(id),
        data: { title: to },
        returning: false,
      });
    console.log(`${apply ? 'Renommé' : 'À renommer'} #${id} : « ${doc.title} » → « ${to} »`);
  }

  for (const id of Object.keys(DELETIONS).map(Number)) {
    const doc = byId.get(id);
    if (!doc) continue;
    const media = await payload.find({
      collection: 'media',
      where: { presentation: { equals: id } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    });
    if (apply) {
      for (const file of media.docs)
        await payload.delete({ collection: 'media', id: file.id, overrideAccess: true });
      await payload.delete({ collection: 'presentations', id, overrideAccess: true });
      await rm(join(spaRoot, doc.slug), { recursive: true, force: true });
    }
    console.log(
      `${apply ? 'Supprimé' : 'À supprimer'} #${id} « ${doc.title} » (${media.docs.length} média(s), spa/${doc.slug})`,
    );
  }

  for (const dir of ORPHAN_SPA) {
    console.log(`${apply ? 'Supprimé' : 'À supprimer'} spa/${dir} (orphelin)`);
    if (apply) await rm(join(spaRoot, dir), { recursive: true, force: true });
  }
  if (!apply) console.log('\nSimulation : relancer avec --apply pour appliquer.');
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await closeScriptPayload(payload);
}
process.exit(exitCode);
