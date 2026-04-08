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
import { buildSlidesTask } from './jobs/buildSlides';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Presentations, Clients, Media],
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
    payloadAiPlugin({
      collections: {
        presentations: true,
        clients: true,
      },
    }),
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
