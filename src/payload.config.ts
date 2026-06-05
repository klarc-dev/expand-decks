import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { fr } from '@payloadcms/translations/languages/fr';
import { en } from '@payloadcms/translations/languages/en';
import { authPlugin } from 'payload-auth-plugin';
import { GoogleAuthProvider } from 'payload-auth-plugin/providers';

import { Users } from './collections/Users';
import { Presentations } from './collections/Presentations';
import { Media } from './collections/Media';
import { ShareLinks } from './collections/ShareLinks';
import { Accounts } from './collections/Accounts';
import { buildSlidesTask } from './jobs/buildSlides';
import { COLLECTIONS } from './lib/collections';
import { SERVER_URL } from './lib/env';
import { ROLES } from './access/roles';

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
      afterLogin: ['/components/GoogleLoginButton#default'],
    },
    livePreview: {
      url: '/preview',
      collections: [COLLECTIONS.presentations],
      breakpoints: [
        { name: 'slide', label: '16:9 Slide', width: 960, height: 540 },
        { name: 'full', label: 'Pleine largeur', width: 1280, height: 720 },
      ],
    },
  },
  serverURL: SERVER_URL,
  collections: [Users, Presentations, Media, ShareLinks, Accounts],
  plugins: [
    authPlugin({
      name: 'auth',
      providers: [
        GoogleAuthProvider({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ],
      usersCollectionSlug: COLLECTIONS.users,
      accountsCollectionSlug: COLLECTIONS.accounts,
      allowOAuthAutoSignUp: true,
      useAdmin: true,
      successRedirectPath: '/admin',
      errorRedirectPath: '/admin/login',
    }),
  ],
  onInit: async (payload) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) return;
    try {
      const existing = await payload.find({
        collection: COLLECTIONS.users,
        where: { email: { equals: email } },
        limit: 1,
      });
      if (existing.docs.length > 0) {
        await payload.update({
          collection: COLLECTIONS.users,
          id: existing.docs[0].id,
          data: { password, role: ROLES.admin },
        });
        payload.logger.info(`[seed] Updated admin user ${email}`);
      } else {
        await payload.create({
          collection: COLLECTIONS.users,
          data: { email, password, role: ROLES.admin },
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
