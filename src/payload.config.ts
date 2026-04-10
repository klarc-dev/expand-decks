import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { fr } from '@payloadcms/translations/languages/fr';
import { en } from '@payloadcms/translations/languages/en';
import { payloadAiPlugin } from '@ai-stack/payloadcms';

import { Users } from './collections/Users';
import { Presentations } from './collections/Presentations';
import { Clients } from './collections/Clients';
import { Media } from './collections/Media';
import { ShareLinks } from './collections/ShareLinks';
import { buildSlidesTask } from './jobs/buildSlides';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Icon: '/components/KlarcIcon#KlarcIcon',
        Logo: '/components/KlarcLogo#KlarcLogo',
      },
    },
    livePreview: {
      url: '/preview',
      collections: ['presentations'],
      breakpoints: [
        { name: 'slide', label: '16:9 Slide', width: 960, height: 540 },
        { name: 'full', label: 'Pleine largeur', width: 1280, height: 720 },
      ],
    },
  },
  collections: [Users, Presentations, Clients, Media, ShareLinks],
  onInit: async (payload) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) return;
    try {
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
        payload.logger.info(`[seed] Updated admin user ${email}`);
      } else {
        await payload.create({
          collection: 'users',
          data: { email, password, role: 'admin' },
        });
        payload.logger.info(`[seed] Created admin user ${email}`);
      }
    } catch (err) {
      payload.logger.error({ err }, '[seed] Failed to upsert admin user');
    }
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  editor: lexicalEditor(),
  // payload-ai adds Compose/Proofread/Translate/Rephrase toolbar buttons
  // to Lexical RichText fields in enabled collections (e.g. Clients.notes).
  // Block fields using text/textarea are unaffected — only Lexical editors get AI actions.
  plugins: [
    // Temporarily disabled — AI plugin crashes the admin client-side render
    // Re-enable when @ai-stack/payloadcms fixes the initialization error
    // payloadAiPlugin({
    //   collections: {
    //     presentations: true,
    //     clients: true,
    //   },
    // }),
  ],
  i18n: {
    supportedLanguages: { fr, en },
    fallbackLanguage: 'fr',
  },
  jobs: {
    tasks: [buildSlidesTask],
    autoRun: [{ cron: '*/1 * * * *', limit: 5 }],
    deleteJobOnComplete: true,
  },
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-payload',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
