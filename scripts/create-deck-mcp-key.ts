import { randomBytes } from 'node:crypto';

import { runPayloadScript } from './lib/payloadScript';

await runPayloadScript(async (payload) => {
  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    where: { email: { equals: 'hermes-mcp@expand.local' } },
  });
  const apiKey = randomBytes(32).toString('hex');
  const user = existing.docs[0]
    ? await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: { enableAPIKey: true, apiKey },
      })
    : await payload.create({
        collection: 'users',
        draft: false,
        data: {
          email: 'hermes-mcp@expand.local',
          password: randomBytes(32).toString('hex'),
          role: 'admin',
          name: 'Hermes MCP',
          membershipStatus: 'active',
          enableAPIKey: true,
          apiKey,
        },
      });

  console.log(`users API-Key ${apiKey}`);
});
