/**
 * Server entry-point for the `@`-mention variable feature. Payload requires a
 * server feature as the sole registration point for a client feature; this one
 * carries no server logic — it only points at the client component (registered
 * in the importMap via `pnpm generate:importmap`). All resolution happens at
 * build time (src/export/vars.ts); the inserted token is plain text.
 */
import { createServerFeature } from '@payloadcms/richtext-lexical';

export const VarMentionFeature = createServerFeature({
  key: 'varMention',
  feature: {
    ClientFeature: '/blocks/features/varMention.client#default',
  },
});
