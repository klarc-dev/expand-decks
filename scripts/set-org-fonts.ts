/**
 * Set an organisation's heading/body font families through the collection
 * operation, so the afterChange hook re-queues a build for every published
 * deck of that organisation (a raw SQL update would leave baked SPA/PDF stale).
 *
 * Usage: pnpm exec tsx --env-file-if-exists=.env scripts/set-org-fonts.ts <orgName> <headingFont> <bodyFont>
 */
import { runPayloadScript } from './lib/payloadScript';

const [orgName, headingFont, bodyFont] = process.argv.slice(2);
if (!orgName || !headingFont || !bodyFont) {
  console.error('Usage: set-org-fonts.ts <orgName> <headingFont> <bodyFont>');
  process.exit(1);
}

await runPayloadScript(async (payload) => {
  const orgs = (
    await payload.find({
      collection: 'organisations',
      where: { name: { equals: orgName } },
      limit: 2,
      overrideAccess: true,
    })
  ).docs;
  if (orgs.length !== 1) throw new Error(`Expected exactly one organisation named ${orgName}`);
  const org = orgs[0];
  const updated = await payload.update({
    collection: 'organisations',
    id: org.id,
    data: { headingFont, bodyFont },
    overrideAccess: true,
  });
  const published = await payload.count({
    collection: 'presentations',
    where: {
      and: [{ organisation: { equals: org.id } }, { status: { equals: 'published' } }],
    },
    overrideAccess: true,
  });
  console.log(
    JSON.stringify({
      id: updated.id,
      name: updated.name,
      before: { headingFont: org.headingFont, bodyFont: org.bodyFont },
      after: { headingFont: updated.headingFont, bodyFont: updated.bodyFont },
      rebuildsQueued: published.totalDocs,
    }),
  );
});
