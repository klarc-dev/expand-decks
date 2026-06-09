# Duplication Report

Synthesized from a within-feature duplication pass and a cross-feature duplication pass (two parallel subagents), each cross-checked against the Phase 1 flowcharts. Every claim cites ≥2 `file:line` locations. Each item is classified **ACCIDENTAL** (should be consolidated) or **LEGITIMATE SPECIALIZATION** (leave as-is).

## The headline: a stalled single-source-of-truth refactor

`src/blocks/spec/` is a half-finished SSOT migration. The DSL (`spec/dsl.ts:1-10`) declares four projection layers it intends to derive from one `BlockSpec` per block: **L1** Payload config, **L2** renderer type, **L3** AI draft Zod schema, **L4** AI prompt prose. Only the `statement` block was migrated, and only for L1+L2. The L3/L4 emitters were written and tested but never wired in. As a result, **8 of 9 blocks declare their shape independently in 3–4 places**, and the new-block tax in `CLAUDE.md` is the lived cost of that drift.

Every duplication below is a symptom of this one stalled migration except #4 (SPA routes) and #6 (dead code).

---

## D1 — Block shape declared across up to 4 layers — ACCIDENTAL

**Concern:** The same block's field shape is independently maintained in the Payload config, the AI route Zod schema, the renderer `*BlockData` type, and (intended) the spec DSL.

**Evidence — `cover`:**
- Payload config: `src/blocks/CoverBlock.ts:5-33`
- AI Zod schema: `src/app/(payload)/api/draft-presentation/route.ts:26-34`
- Renderer type: `src/export/blocks/cover.ts:4-14`
- Spec DSL: only documented as example (`src/blocks/spec/dsl.ts:42-56`) — **no concrete `spec/cover.ts` exists**

**Evidence — `twoCols`:**
- Payload config: `src/blocks/TwoColsBlock.ts:5-35` (nested `rightCards` `:25-32`)
- AI Zod schema: `src/app/(payload)/api/draft-presentation/route.ts:53-67` (nested `:59-66`)
- Renderer type: `src/export/blocks/twoCols.ts:4-16`

**The one unified block — `statement`:** L1 emitted from spec (`src/blocks/StatementBlock.ts:4`), L2 imported from spec (`src/export/blocks/statement.ts:1` ← `src/blocks/spec/statement.ts:69`). But L3 is STILL hand-rolled (`route.ts:38-44`) — even the pilot block is not fully migrated.

**Legitimate sub-part:** AI schemas intentionally omit media/upload fields (`route.ts:25`, `:52`) because LLMs can't produce Payload media IDs; renderer types include hydrated media (`cover.ts:12-13`, `twoCols.ts:14-15`). This projection difference is real and must be preserved — but the repeated declarations of `title`/`subtitle`/`rightCards` are accidental.

**Verdict:** ACCIDENTAL duplication wrapping a legitimate multi-projection need. Consolidate via the spec DSL (the four projections become `emitPayloadBlock`, `InferRender`, `aiSchemaOf`, `promptMeta`).

---

## D2 — AI draft Zod schema: hand-rolled vs dormant emitter — ACCIDENTAL

**Concern:** The route hand-rolls the full block-schema union; an emitter exists to generate it.
- Hand-rolled: `src/app/(payload)/api/draft-presentation/route.ts:120-138` (per-block `:26-118`)
- Emitter: `src/blocks/spec/emit/emitDraftSchema.ts:30-35` (`emitDraftSchema`) + `:41-44` (`emitSlidesArraySchema`)
- Route does NOT import the emitter — grep for `emitDraftSchema`/`emitSlidesArraySchema` in `route.ts:1-12` imports: no match.

**Verdict:** ACCIDENTAL. The emitter's own header comment names the route schema as the thing it replaces.

---

## D3 — AI system prompt: hand-written vs dormant emitter — ACCIDENTAL

**Concern:** The route hard-codes the system prompt; an emitter exists to assemble it from per-block `promptMeta`.
- Hand-written: `src/app/(payload)/api/draft-presentation/route.ts:140-192`
- Emitter: `src/blocks/spec/emit/emitPromptSection.ts:58-62` (`emitPromptSection`) + `:69-77` (`buildSystemPrompt`)
- Per-block prompt data already exists for the pilot: `src/blocks/spec/statement.ts:52-57` (`promptMeta`)
- Route does NOT import it — grep confirms only test importer.

**Verdict:** ACCIDENTAL. Fixed intro/rules as emitter constants is fine; the full hand-maintained prompt is drift risk.

---

## D4 — Two SPA route handlers — LEGITIMATE SPECIALIZATION

**Concern:** Two route handlers serve built SPA files.
- Public token-gated: `src/app/(frontend)/share/[token]/spa/[...path]/route.ts:11-32`
- Private auth-gated: `src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:16-43`
- Both converge on: `src/lib/spaFiles.ts:37-79` (`serveSpaFile`)

**Why they differ:** public route resolves an anonymous share token + expiry → presentation slug; private route validates slug + authenticates a Payload user + checks existence. The actual file serving (MIME, cache, traversal protection) is already centralized.

**Verdict:** LEGITIMATE SPECIALIZATION. Different trust models, already sharing the low-level primitive. No consolidation needed. (Optional: a tiny "resolve-authorized-slug-or-response" helper if a third access mode is added — not now.)

---

## D5 — `InferRender` type alias duplicated — ACCIDENTAL

**Concern:** The same `type InferRender<T> = z.infer<T>` alias is exported twice.
- `src/blocks/spec/dsl.ts:295` (used in production by `src/blocks/spec/statement.ts:18`)
- `src/blocks/spec/emit/renderType.ts:17` (used only by tests: `src/blocks/spec/emit/__tests__/renderType.types.test.ts:23`)

**Verdict:** ACCIDENTAL. One should re-export the other. The DSL copy is the client-safe canonical one; `renderType.ts` should re-export it (and keep only its test-only `Equal`/`Expect` helpers).

---

## D6 — `adminFetch` is dead code — ACCIDENTAL (not duplication)

**Concern:** `adminFetch`/`AdminFetchError` have no importer.
- Definition: `src/lib/adminFetch.ts:17-26` (`AdminFetchError` `:9-15`)
- `rg "adminFetch|AdminFetchError" src` → only self-references (`adminFetch.ts:5`, `:9`, `:17`, `:21`)

**Verdict:** ACCIDENTAL dead code. Delete, or adopt it in the admin components that currently hand-roll `fetch` (e.g. `DraftFromBriefButton.tsx:34`, `ShareUrlField.tsx:32`).

---

## D7 — The "new block = touch N files" tax — ACCIDENTAL (the meta-symptom)

**Concern:** Adding one layout block requires synchronized edits across independent registries/shapes. Verified touch points (note: `CLAUDE.md` is partly stale — preview/build renderer maps were already consolidated into `src/export/renderers.ts`):

1. Payload config — `src/blocks/<Name>Block.ts` (e.g. `CoverBlock.ts:5`)
2. Collection registration — `src/collections/Presentations.ts:66-76`
3. Renderer + type — `src/export/blocks/<name>.ts` (e.g. `cover.ts:4` type, `:16` fn)
4. Renderer registry + union — `src/export/renderers.ts:11` (union), `:22` (`RENDERERS`) — consumed by build `src/export/buildSlidesMd.ts:7`/`:39` AND preview `src/export/preview.ts:1`/`:13` (already shared)
5. AI Zod schema + union — `src/app/(payload)/api/draft-presentation/route.ts:26-138`
6. AI prompt section — `src/app/(payload)/api/draft-presentation/route.ts:140-192`

**Stale-doc note:** CLAUDE.md claims `RENDERERS` maps live in both `buildSlidesMd.ts` and `preview/page.tsx`. Current code consolidated both into `src/export/renderers.ts:22` (proof: `buildSlidesMd.ts:7` and `preview.ts:1` both import it). So registry duplication is ALREADY solved — the remaining tax is layers 1/3/5/6.

**Verdict:** ACCIDENTAL. The spec DSL is designed to collapse layers 1, 3 (type), 5, 6 to one `spec/<name>.ts` + one registration. Layer 2 (collection registration) and layer 4 (registry) stay as thin one-liners.

---

## Lower-value within-feature duplications (consolidate opportunistically, not blocking)

### D8 — Raw Payload `text`/`textarea` field boilerplate — ACCIDENTAL (minor)
Identical `{ name, type, label, admin:{ description } }` shapes repeat across blocks not covered by `_shared.ts` factories:
- `src/blocks/CoverBlock.ts:12-17`, `:18-23`, `:24-29`
- `src/blocks/SectionBlock.ts:10-15`, `:17-22`
- `src/blocks/TwoColsBlock.ts:12-17`, `:18-23`
- `src/blocks/CardGridBlock.ts:12-17`, `:36-41`
(ast-grep confirmed the `textarea` shape across CardGrid/Cover/Section/TwoCols.)
**Fix:** add `textField`/`textareaField` factories to `src/blocks/_shared.ts` (alongside `eyebrowField:11`, `titleField:18`). Or — better — fold into spec `rawField` once migrated.

### D9 — Renderers bypass centralized `utils.eyebrow` — ACCIDENTAL (minor)
Helper exists (`src/export/utils.ts:20`); used by `statement.ts:3`, `stats.ts:2`, `twoCols.ts:2` but bypassed by:
- `src/export/blocks/cover.ts:24-26`, `src/export/blocks/cardGrid.ts:18-20`, `src/export/blocks/quotes.ts:19-21`, `src/export/blocks/cta.ts:15-17`
**Fix:** route all through `renderEyebrow`; extend the helper for the CTA dark variant.

### D10 — AI route optional-string repetition — ACCIDENTAL (dissolves with D2)
`z.string().optional()` and `title: z.string()` repeat across every block schema; `eyebrowZod` (`route.ts:18`) exists but isn't used consistently (`:46`, `:55`, `:71`, `:103`, `:118` re-inline it). Nested `{ title, description? }` repeats at `route.ts:62-63` and `:79-80`.
**Fix:** disappears entirely when D2 replaces the hand-rolled schemas with `emitSlidesArraySchema`.

---

## Consolidation priority (compound impact ÷ effort)

| # | Concern | Verdict | Impact | Effort | Notes |
|---|---|---|---|---|---|
| D2 | AI schema → emitter | ACCIDENTAL | High | Low | emitter+tests already exist; wire 1 import |
| D3 | AI prompt → emitter | ACCIDENTAL | High | Low | needs `promptMeta` for 8 blocks |
| D1/D7 | Migrate 8 blocks to spec | ACCIDENTAL | Very High | High | the real fix; collapses D1/D5/D8/D10 |
| D9 | eyebrow helper | ACCIDENTAL | Low | Trivial | 4 renderers |
| D5 | InferRender dedupe | ACCIDENTAL | Low | Trivial | 1 re-export |
| D6 | adminFetch | ACCIDENTAL | Low | Trivial | delete or adopt |
| D4 | SPA routes | LEGITIMATE | — | — | leave as-is |

**The compound win:** completing the spec migration (D1/D7) is the consolidation that ripples across the most files; D2/D3 are the cheap unblockers that prove the emitters work before the full migration.
