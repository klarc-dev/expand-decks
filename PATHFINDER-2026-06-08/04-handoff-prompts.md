# Handoff Prompts

Copy any fenced block below directly into `/make-plan`. They are ordered by the sequencing in `03-unified-proposal.md`: cheap de-risking emitters first (HP-1, HP-2), the big migration second (HP-3), trivial cleanups last (HP-4). Each cites concrete call sites from Phase 2 evidence and includes anti-pattern guards.

---

## HP-1 — Wire the AI draft schema to the existing emitter (D2)

```text
/make-plan

GOAL: Replace the hand-rolled AI draft Zod schema in the draft route with the existing (but dormant) emitter, with zero behavior change.

TARGET COMPONENT: emitSlidesArraySchema as the single source for the AI draft schema.
SINGLE ENTRY POINT: src/blocks/spec/emit/emitDraftSchema.ts:41 (emitSlidesArraySchema), backed by emitDraftSchema.ts:30.

CONTEXT FLOWCHART: PATHFINDER-2026-06-08/01-flowcharts/F6-ai-draft.md (and F4-F5-block-layers.md for the dormant emitter).

PREREQUISITE: A spec must exist for every AI-draftable block. Today only statement has one (src/blocks/spec/statement.ts:29). So this HP depends on HP-3 for full coverage — BUT you can land it incrementally: first create src/blocks/spec/index.ts exporting ALL_SPECS, seed it with statementSpec, and assert emitSlidesArraySchema([statementSpec]) matches the route's statement branch (route.ts:38-44) via a test. Only flip the route to the emitter once ALL_SPECS covers all 8 AI-draftable blocks.

EXACT CALL SITES TO REWRITE (final state, after HP-3):
- DELETE hand-rolled per-block schemas: src/app/(payload)/api/draft-presentation/route.ts:26-118
- DELETE hand-rolled union + array: src/app/(payload)/api/draft-presentation/route.ts:120-138
- REPLACE with: const slidesArraySchema = emitSlidesArraySchema(ALL_SPECS)  (import ALL_SPECS from src/blocks/spec)
- UNCHANGED: generateObject({ schema: slidesArraySchema }) at route.ts:234

VERIFICATION:
- pnpm test (Vitest, src/**/__tests__/**/*.test.ts) — the existing src/blocks/spec/emit/__tests__/emitDraftSchema.test.ts must stay green.
- Add a test asserting the emitted union shape equals the old hand-rolled union for every block (snapshot the z JSON schema before/after).
- Confirm markdown block stays EXCLUDED from AI (route.ts:120 today; markdown must have aiDraftable:false in its spec).
- Confirm media/image fields stay omitted from AI (route.ts:25,:52 today; spec fields use ai:false per dsl.ts:161).

ANTI-PATTERN GUARDS:
- Do NOT keep both the hand-rolled schema and the emitter behind a flag.
- Do NOT introduce a new schema-builder abstraction; emitSlidesArraySchema already exists.
- Do NOT change generateObject options (strictJsonSchema:false at route.ts:238 is load-bearing for OpenAI optionals).
```

---

## HP-2 — Wire the AI system prompt to the existing emitter (D3)

```text
/make-plan

GOAL: Generate the draft route's SYSTEM_PROMPT from per-block promptMeta via the existing emitter, replacing the hand-written prompt.

TARGET COMPONENT: buildSystemPrompt as the single source for the AI system prompt.
SINGLE ENTRY POINT: src/blocks/spec/emit/emitPromptSection.ts:69 (buildSystemPrompt), sections via emitPromptSection.ts:58.

CONTEXT FLOWCHART: PATHFINDER-2026-06-08/01-flowcharts/F6-ai-draft.md.

PREREQUISITE: Every AI-draftable block needs a promptMeta. Today only statement has it (src/blocks/spec/statement.ts:52-57). Author promptMeta for the other 7 AI-draftable blocks (cover, section, twoCols, cardGrid, stats, quotes, cta) mirroring the route's existing prose at route.ts:146-188 so wording is preserved.

EXACT CALL SITES TO REWRITE:
- DELETE hand-written prompt: src/app/(payload)/api/draft-presentation/route.ts:140-192
- REPLACE with: const SYSTEM_PROMPT = buildSystemPrompt(ALL_SPECS.flatMap(s => s.promptMeta ? [s.promptMeta] : []))
- UNCHANGED: generateObject({ system: SYSTEM_PROMPT }) at route.ts:235

VERIFICATION:
- pnpm test — src/blocks/spec/emit/__tests__/emitPromptSection.test.ts must stay green.
- Snapshot the generated prompt string and diff against the current route.ts:140-192 text; differences must be intentional (numbering/ordering only).
- The prompt is deliberately use-case-agnostic (see CLAUDE.md) — promptMeta must NOT inject domain vocabulary/company names.

ANTI-PATTERN GUARDS:
- Do NOT duplicate the intro/rules prose; they are emitter constants (emitPromptSection.ts:22-38).
- Do NOT keep the hand-written prompt as a fallback.
- Keep the block numbering stable so existing decks/tests are unaffected.
```

---

## HP-3 — Migrate the 8 hand-written blocks to the spec DSL (D1, D7; dissolves D8, D10)

```text
/make-plan

GOAL: Make src/blocks/spec/<name>.ts the single source of truth for all 9 blocks (statement is the template), deleting the parallel hand-maintained Payload configs, renderer types, and AI schemas.

TARGET COMPONENT: One BlockSpec per block + a spec registry.
SINGLE ENTRY POINTS:
- Per block: src/blocks/spec/<name>.ts exporting <name>Spec, <name>RenderSchema, <Name>BlockData (template: src/blocks/spec/statement.ts:1-69).
- New: src/blocks/spec/index.ts exporting ALL_SPECS: BlockSpec[] (plain array literal — NOT a factory/registry pattern).

CONTEXT FLOWCHARTS: PATHFINDER-2026-06-08/01-flowcharts/F4-F5-block-layers.md (SSOT coverage), F3-renderers.md (TYPE SOURCE SPLIT table), 03-unified-proposal.md.

BLOCKS TO MIGRATE (8): cover, section, twoCols, cardGrid, stats, quotes, cta, markdown.

EXACT CALL SITES TO REWRITE per block <name> (Cover shown; repeat for all 8):
- src/blocks/CoverBlock.ts:5-33 hand-written Block  ->  export const CoverBlock = emitPayloadBlock(coverSpec)  (template: StatementBlock.ts:4)
- src/export/blocks/cover.ts:4-14 local CoverBlockData  ->  import type { CoverBlockData } from '../../blocks/spec/cover'  (template: export/blocks/statement.ts:1)
- src/app/(payload)/api/draft-presentation/route.ts:26-34 coverSchema  ->  DELETE (covered by HP-1 via ALL_SPECS)
- raw text/textarea field boilerplate (CoverBlock.ts:12-29, etc.)  ->  authored once as rawField(...) in the spec
Registration stays a one-liner: src/collections/Presentations.ts:66-76 (unchanged array of emitted Blocks).
Renderer registry stays unchanged: src/export/renderers.ts:22.

ORDER: migrate ONE block at a time, in this order: cover, section, cta, twoCols, cardGrid, stats, quotes, markdown. After EACH block: pnpm generate:types, then git-diff src/payload-types.ts (field ORDER is load-bearing — dsl.ts:186-188), then pnpm test.

VERIFICATION (per block):
- pnpm generate:types produces NO unintended payload-types.ts diff (field order preserved).
- pnpm test green, including spec/emit/__tests__ parity tests.
- The renderer compiles against the spec-derived <Name>BlockData (mutual-assignability with the old local type — see dsl.ts:58-67 rationale).
- Live preview (/preview) and build job both still render the block (they share src/export/renderers.ts).

ANTI-PATTERN GUARDS:
- Do NOT migrate all 8 in one commit; one block per atomic commit.
- Do NOT add domain semantics to specs — fields describe VISUAL structure only (CLAUDE.md invariant).
- Preserve the render/AI duality: optional render fields use optionalRender (null|undefined, dsl.ts:99), AI optionals use optionalAi (plain .optional(), dsl.ts:103).
- Preserve AI omission of media/preview fields via ai:false (dsl.ts:161, statement.ts:50).
- Do NOT introduce a registry/factory; ALL_SPECS is a flat exported array.
- Do NOT change Slidev markdown output — renderer FUNCTIONS stay; only their TYPE source changes.
```

---

## HP-4 — Trivial consolidations: dedupe InferRender, eyebrow helper, adminFetch (D5, D9, D6)

```text
/make-plan

GOAL: Three small, independent cleanups that remove drift and dead code. Each is its own atomic commit.

CONTEXT: PATHFINDER-2026-06-08/02-duplication-report.md items D5, D9, D6.

1) InferRender single export (D5):
   - src/blocks/spec/emit/renderType.ts:17 currently re-declares `type InferRender`.
   - REPLACE the local declaration with: export type { InferRender } from '../dsl';  (canonical is src/blocks/spec/dsl.ts:295, used in production by statement.ts:18)
   - Keep renderType.ts's test-only Equal/Expect helpers.
   - VERIFY: src/blocks/spec/emit/__tests__/renderType.types.test.ts:23 still imports + compiles.

2) Centralize eyebrow rendering (D9):
   - Helper: src/export/utils.ts:20 (eyebrow). Already used by statement.ts:3, stats.ts:2, twoCols.ts:2.
   - Route these 4 bypassers through it: src/export/blocks/cover.ts:24-26, cardGrid.ts:18-20, quotes.ts:19-21, cta.ts:15-17.
   - Extend utils.eyebrow to accept the CTA dark variant (cta uses K.eyebrowDark) rather than hand-building.
   - VERIFY: pnpm test (export/__tests__/blocks.test.ts); Slidev markdown output unchanged (snapshot eyebrow HTML before/after).

3) adminFetch — adopt or delete (D6):
   - src/lib/adminFetch.ts:17 has NO importer (rg confirms only self-references).
   - RECOMMENDED: adopt it in src/components/DraftFromBriefButton.tsx:34 and src/components/ShareUrlField.tsx:32, which both hand-roll fetch with credentials + error handling.
   - ALTERNATIVE: delete src/lib/adminFetch.ts entirely.
   - VERIFY: admin draft + share-rotate still work; pnpm test green.

ANTI-PATTERN GUARDS:
- Do NOT bundle these three into one commit.
- For (2), do NOT change rendered output — this is a pure refactor; assert byte-identical eyebrow HTML.
- For (3), pick ONE of adopt/delete — do not leave adminFetch half-wired.
```

---

## Not handed off (intentionally)

- **D4 — the two SPA route handlers** are legitimate specialization (different trust models, already converging on `serveSpaFile` at `src/lib/spaFiles.ts:37`). No plan is emitted. Revisit only if a third SPA access mode is introduced.
- **CLAUDE.md staleness** — the doc claims `RENDERERS` maps live in both `buildSlidesMd.ts` and `preview/page.tsx`; the code already consolidated them into `src/export/renderers.ts:22`. Worth a one-line doc fix during HP-3, but not a standalone plan.
