/**
 * Ensures an admin user exists. Idempotent — safe to run on every startup.
 * Credentials are sourced from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
 */
import { getPayload } from 'payload';
import config from '@payload-config';

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[seed] SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping');
    return;
  }

  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: { password, role: 'admin' },
    });
    console.log(`[seed] Updated admin user ${email}`);
  } else {
    await payload.create({
      collection: 'users',
      data: { email, password, role: 'admin' },
    });
    console.log(`[seed] Created admin user ${email}`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
