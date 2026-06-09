# Pathfinder — Feature Inventory

**Repo:** `slides` (Payload CMS 3 + Next.js 15 App Router + out-of-process Slidev build)
**Date:** 2026-06-08
**Method:** Source-tree walk + import-graph trace (one Feature Discovery subagent), boundaries reviewed and adjusted by orchestrator.

## How features were grouped

The discovery pass surfaced **12 raw modules**. For flowchart fan-out they collapse to **7 flow-bearing features** plus **2 structural concerns** (auth/config, lib utilities) that are dependency leaves with no interesting happy-path flow of their own. The structural concerns are documented here but not given dedicated flowcharts.

The single most important architectural finding is in **F4 / F5**: `src/blocks/spec/` is a **stalled SSOT refactor** — it was built to generate Payload configs, renderer types, AI draft schemas, and prompt prose from one `BlockSpec` per block, but only the `statement` block was migrated. Everything else is still hand-maintained in 3–4 parallel layers. This is the primary unification target for Phase 3.

---

## Flow-bearing features (get a flowchart in Phase 1)

### F1 — Presentation Authoring & Collection
Authors compose decks as typed blocks; collection holds content, metadata, output artifacts.
- **Entry:** `src/collections/Presentations.ts:18` (collection def), `:62` (`slides` blocks field), `:212` (status field), `:228` (`createdBy` stamp)
- **Core:** `src/collections/Presentations.ts`, `src/components/DraftFromBriefButton.tsx`, `src/components/BuildStatusField.tsx`
- **Depends on:** F2 (build trigger), F4 (block configs), F6 (AI drafting), Auth, Lib

### F2 — Build Trigger → Job → Artifact Publishing (content pipeline core)
`afterChange` hook queues a `buildSlides` job; job renders `slides.md`, shells out to Slidev, uploads PDF + SPA, patches artifacts back.
- **Entry:** `src/hooks/afterPresentationChange.ts:24`, `src/jobs/buildSlides.ts:74` (handler), `:99` (`buildSlidesMd`), `:142` (Slidev exec), `:166` (patch back)
- **Core:** `src/hooks/afterPresentationChange.ts`, `src/jobs/buildSlides.ts`, `slidev-workspace/`, `src/export/headmatter.yaml`, `src/export/style.css`
- **Depends on:** F3 (renderers), Lib (`status`, `context`, `paths`, `slug`)

### F3 — Export Renderers & Markdown Build
Pure block→Slidev-markdown renderers behind one `RENDERERS` registry; consumed by both build and preview.
- **Entry:** `src/export/renderers.ts:22` (`RENDERERS`), `src/export/buildSlidesMd.ts:32`
- **Core:** `src/export/renderers.ts`, `buildSlidesMd.ts`, `blocks/*.ts` (9 renderers), `utils.ts`, `classNames.ts`, `types.ts`, `parse.ts`
- **Depends on:** block data contracts, Lib (`paths`)

### F4 — Content Authoring Blocks (Payload field-config layer)
The 9 Payload `Block` configs that drive the `slides` field + admin form.
- **Entry:** `src/blocks/_shared.ts:5` (factories), `src/blocks/CoverBlock.ts:5` (hand-written), `src/blocks/StatementBlock.ts:4` (spec-generated — the ONE migrated block)
- **Core:** `src/blocks/_shared.ts`, `CoverBlock.ts`, `SectionBlock.ts`, `StatementBlock.ts`, `TwoColsBlock.ts`, `CardGridBlock.ts`, `StatsBlock.ts`, `QuotesBlock.ts`, `CtaBlock.ts`, `MarkdownBlock.ts`
- **Depends on:** F5 (spec DSL — for `statement` only), Auth (admin-only fields), Lib

### F5 — Block Spec DSL & Emitters (the stalled SSOT)
DSL + emitters intended to derive L1 Payload configs / L2 renderer types / L3 AI schema / L4 prompt prose from one `BlockSpec`. **Only `statement` is migrated; emitters for L3/L4 exist but are NOT wired into the live route.**
- **Entry:** `src/blocks/spec/dsl.ts:189` (`BlockSpec`), `src/blocks/spec/statement.ts:29` (only spec), `emit/emitPayloadBlock.ts:80`, `emit/emitDraftSchema.ts:30` (dormant), `emit/emitPromptSection.ts:58` (dormant)
- **Core:** `src/blocks/spec/dsl.ts`, `statement.ts`, `emit/emitPayloadBlock.ts`, `emit/emitDraftSchema.ts`, `emit/emitPromptSection.ts`, `emit/renderType.ts`
- **Live consumers:** `src/blocks/StatementBlock.ts:1-4`, `src/export/blocks/statement.ts:1` (ONLY these two in production)

### F6 — AI Draft Generation
Admin button → `POST /api/draft-presentation` → `generateObject` with a **hand-rolled** Zod union + **hand-written** system prompt → patches slides (with `skipBuildQueue`).
- **Entry:** `src/components/DraftFromBriefButton.tsx:27`, `src/app/(payload)/api/draft-presentation/route.ts:194` (POST), `:232` (`generateObject`), `:249` (patch)
- **Core:** `route.ts` (schemas `:12-138`, `SYSTEM_PROMPT` `:140-192`), `DraftFromBriefButton.tsx`
- **Depends on:** F1, Auth, Lib (`collections`, `context`). **Does NOT use F5 emitters** (the duplication).

### F7 — Sharing & SPA Serving (public + private)
Token-hashed share links + two SPA file routes (public token-gated, private auth-gated) converging on one `serveSpaFile`.
- **Entry:** `src/collections/ShareLinks.ts:15`, `:77` (token hash on create), `src/app/(frontend)/share/[token]/page.tsx:25`, `share/[token]/spa/[...path]/route.ts:11`, `spa/[slug]/[[...path]]/route.ts:16`
- **Core:** `ShareLinks.ts`, `ShareUrlField.tsx`, `share/[token]/page.tsx`, the two SPA routes, `src/lib/spaFiles.ts`, `src/lib/shareLinks.ts`
- **Depends on:** Auth, F2 artifacts, Lib

---

## Structural concerns (no dedicated flowchart)

### S1 — Auth, Roles, Google OAuth & Payload Config
- `src/access/roles.ts:3` (`isAdmin`/`isAdminOrAuthor`/`isLoggedIn`/`isAdminOrSelf`), `src/collections/Users.ts:6`, `Accounts.ts:6`, `src/components/GoogleLoginButton.tsx:5`, `src/payload.config.ts:50` (OAuth plugin), `:104` (jobs/cron)
- Pure dependency leaf consumed by F1/F6/F7; no multi-step happy path worth diagramming.

### S2 — Cross-Feature Lib Utilities
- `lib/collections.ts` (slugs), `lib/context.ts` (`skipBuildQueue`/`shareToken`), `lib/status.ts`, `lib/paths.ts`, `lib/slug.ts`, `lib/env.ts`, `lib/shareLinks.ts`, `lib/spaFiles.ts`, `lib/formStateToBlockData.ts`
- **Flag:** `lib/adminFetch.ts:17` — **no consumer found** in `src/**/*.{ts,tsx}`. Possible dead code (verify in Phase 2).

---

## Duplication hotspots flagged by discovery (Phase 2 will prove with ≥2 file:line each)

1. **Block shape defined in 3–4 layers** — Payload config (`blocks/*Block.ts`), AI route schema (`route.ts:12-138`), renderer types (`export/blocks/*.ts`), spec DSL (`spec/`). `statement` is the only one unified.
2. **AI draft Zod schema** hand-rolled in `route.ts:120-138` while `emitDraftSchema.ts:30-45` exists to generate it.
3. **AI system prompt** hand-written in `route.ts:140-192` while `emitPromptSection.ts:58-77` + `buildSystemPrompt` exist to generate it.
4. **Two SPA route handlers** (`share/[token]/spa`, `spa/[slug]`) — *suspected legitimate specialization* (different trust models), converge at `serveSpaFile`. Verify divergence is access-only.
5. **`InferRender`** type alias duplicated: `spec/dsl.ts:295` and `emit/renderType.ts:17`.
6. **`adminFetch`** possibly unused.

## Known gaps to close in Phase 1/2
- Discovery read only `cover` + `statement` renderers fully; the other 7 `export/blocks/*.ts` need full reads by the F3 flowchart agent.
- `Media.ts`, `export/utils.ts`, `export/classNames.ts`, `export/types.ts` not yet read in full.
