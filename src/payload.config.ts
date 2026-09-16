import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildConfig, type Plugin } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { fr } from '@payloadcms/translations/languages/fr';
import { authPlugin } from 'payload-auth-plugin';
import { GoogleAuthProvider } from 'payload-auth-plugin/providers';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Presentations } from './collections/Presentations';
import { Organisations } from './collections/Organisations';
import { Media } from './collections/Media';
import { Accounts } from './collections/Accounts';
import { AgentRuns } from './collections/AgentRuns';
import { KnowledgeBases } from './collections/KnowledgeBases';
import { KnowledgeDocuments } from './collections/KnowledgeDocuments';
import { buildSlidesTask } from './jobs/buildSlides';
import { agentDraftTask } from './jobs/agentDraft';
import { agentRetentionTask } from './jobs/agentRetention';
import { knowledgeIngestTask } from './jobs/knowledgeIngest';
import { backfillStaleKnowledgeDocuments } from './jobs/knowledgeReindexBackfill';
import { startStalledJobSweep } from './jobs/requeueStalledJobs';
import { COLLECTIONS } from './lib/collections';
import {
  SERVER_URL,
  PAYLOAD_SECRET,
  DATABASE_URL,
  PAYLOAD_DB_PUSH,
  assertAIProviderConfig,
  assertGoogleFontsKey,
} from './lib/env';
import { ROLES } from './access/roles';

// Fail fast in production if configuration required by deck jobs is missing:
// every process can claim agent work, and builds require the font catalog.
assertGoogleFontsKey();
assertAIProviderConfig();

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/** `payload-auth-plugin@0.2.0` adds a non-functional, publicly writable
 * `apiKeys` collection. Payload's native user API-key strategy below is the
 * actual supported feature, so keep the OAuth plugin but discard that dead
 * generated collection. Re-check this workaround when upgrading the plugin. */
const withoutPluginAPIKeys =
  (plugin: Plugin): Plugin =>
  async (config) => {
    const configured = await plugin(config);
    return {
      ...configured,
      collections: configured.collections?.filter((collection) => collection.slug !== 'apiKeys'),
    };
  };

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
  },
  serverURL: SERVER_URL,
  collections: [
    Users,
    Organisations,
    Presentations,
    Media,
    Accounts,
    AgentRuns,
    KnowledgeBases,
    KnowledgeDocuments,
  ],
  plugins: [
    withoutPluginAPIKeys(
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
        errorRedirectPath: '/membership-pending',
      }),
    ),
  ],
  onInit: async (payload) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (email && password) {
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
            data: { password, role: ROLES.admin, membershipStatus: 'active' },
          });
          payload.logger.info(`[seed] Updated admin user ${email}`);
        } else {
          await payload.create({
            collection: COLLECTIONS.users,
            data: { email, password, role: ROLES.admin, membershipStatus: 'active' },
          });
          payload.logger.info(`[seed] Created admin user ${email}`);
        }
      } catch (err) {
        payload.logger.error({ err }, '[seed] Failed to upsert admin user');
      }
    }
    try {
      await backfillStaleKnowledgeDocuments(payload as never);
    } catch (err) {
      payload.logger.error({ err }, '[knowledge] Failed to backfill stale documents');
    }
    // Workers replaced mid-run (deploys, OOM kills) leave jobs flagged
    // `processing`, which the per-deck concurrency key turns into a permanent
    // block. The owner process releases such jobs at boot and periodically.
    startStalledJobSweep(payload as never);
  },
  db: postgresAdapter({
    // Schema push is opt-in (PAYLOAD_DB_PUSH=1). Off by default so maintenance
    // scripts never trip the interactive data-loss prompt or hang holding a
    // DB session. Use `pnpm payload migrate` to apply schema changes.
    push: PAYLOAD_DB_PUSH,
    pool: {
      connectionString: DATABASE_URL,
      // Server-side guard: any transaction left idle for 2 min is killed by
      // Postgres. Real Payload transactions finish in ms, so this only catches
      // interrupted/zombie sessions and prevents them from blocking schema work.
      options: '-c idle_in_transaction_session_timeout=120000',
    },
  }),
  editor: lexicalEditor(),
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  jobs: {
    tasks: [buildSlidesTask, agentDraftTask, agentRetentionTask, knowledgeIngestTask],
    autoRun: [
      { cron: '*/1 * * * *', limit: 5 },
      { cron: '0 3 * * *', queue: 'maintenance', limit: 1 },
    ],
    deleteJobOnComplete: true,
    enableConcurrencyControl: true,
  },
  sharp,
  secret: PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
