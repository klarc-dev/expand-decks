/**
 * Phase 1 LIVE smoke — gather → structure against the real 9router gateway.
 * Opt-in only: set RUN_LIVE_AGENT_TESTS=1 plus OPENAI_API_KEY.
 * Run with: RUN_LIVE_AGENT_TESTS=1 pnpm vitest run src/agents/__tests__/phase1.smoke.test.ts
 */
import { describe, expect, it } from 'vitest';

import { gather } from '../agents/gather';
import { structure, uncoveredKeyPoints } from '../agents/structure';
import { DeckDossierSchema } from '../schemas';

const live =
  process.env.RUN_LIVE_AGENT_TESTS === '1' && process.env.OPENAI_API_KEY ? describe : describe.skip;

const BRIEF =
  "Webinaire de 45 minutes pour des juristes d'entreprise : comment rendre une présentation d'expert juridique réellement intéressante. Couvre : mener par la conclusion (BLUF), réfuter l'objection adverse, et ancrer chaque point par un exemple concret.";

live('Phase 1 live (gather → structure)', () => {
  it('produces a valid dossier and a covering outline', { timeout: 240_000 }, async () => {
    const dossier = await gather(BRIEF);
    expect(DeckDossierSchema.safeParse(dossier).success).toBe(true);
    expect(dossier.keyPoints.length).toBeGreaterThan(0);

    const stubs = await structure(dossier);
    expect(stubs.length).toBeGreaterThanOrEqual(3);
    expect(stubs[0]?.blockType).toBe('cover');
    expect(stubs[stubs.length - 1]?.blockType).toBe('cta');

    // Coverage gate held (best-effort lexical check).
    expect(uncoveredKeyPoints(dossier, stubs)).toHaveLength(0);

    // eslint-disable-next-line no-console
    console.log(
      `\n[phase1] core: ${dossier.coreIdea}\n[phase1] ${stubs.length} slides:\n` +
        stubs.map((s, i) => `  ${i + 1}. [${s.blockType}] ${s.title}`).join('\n'),
    );
  });
});
