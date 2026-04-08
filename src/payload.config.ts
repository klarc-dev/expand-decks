import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { fr } from '@payloadcms/translations/languages/fr';
import { en } from '@payloadcms/translations/languages/en';

import { Users } from './collections/Users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
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
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-payload',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
