# KISS build/export hard cut audit

Date: 2026-08-12
Scope: Payload build job, Slidev PDF/SPA/cover export, operator controls, tests and dependencies.
Baseline: HEAD `1caa84e`; clean tree; `pnpm typecheck` passed; `pnpm test` passed with 451 tests.

## Confirmed hard cuts

1. **Delete the default-off incremental PDF experiment.**
   - Remove `pdfPageCache.ts`, `pdfPageHash.ts`, `pdfAssemble.ts`, their tests, `PAGE_CACHE_DIR`, `pdf-lib`, and all `SLIDEV_EXPORT_INCREMENTAL_*` controls.
   - Evidence: explicitly Phase 2/default-off, no cache state exists, no warm-cache production evidence, native full Slidev PDF export is already the production path.

2. **Delete targeted output policy.**
   - Remove `outputPolicy.ts`, its tests and job input, the PDF/SPA selector, endpoint parsing and all conditional runner branches.
   - Canonical behavior: every author build produces PDF + SPA + cover. This matches normal publish/update behavior and removes stale mixed-artifact states.

3. **Delete unused tuning switches and timing framework.**
   - Remove `SLIDEV_EXPORT_PER_SLIDE`, `SLIDEV_EXPORT_TIMEOUT_MS`, `SLIDEV_EXPORT_WITH_TOC`, `buildTiming.ts`, its tests and stage plumbing.
   - Canonical behavior: fixed, tested native Slidev command policy. Keep the proven Mermaid/image wait and `NODE_ENV=development` correctness fixes.

4. **Run native Slidev commands sequentially.**
   - Replace concurrent SPA/PDF/cover processes sharing one staged workdir with the obvious sequence: `slidev build`, `slidev export` PDF, `slidev export` first-slide PNG.
   - Rationale: correctness and deterministic parity over speculative throughput. The preview is the visual reference.

## Retained invariants

- Same renderers, render context, stylesheet, theme and hydrated relationship data as preview.
- Native Slidev CLI for SPA, PDF and PNG.
- `NODE_ENV=development` for Slidev mounting.
- Mermaid/image settling policy proven by regressions.
- Stale token and content fingerprint check before artifact publication.
- Presentation-scoped artifact access, opaque media filenames, automatic cover generation.
- Metadata updates through `patchPresentationBuildMetadata` and temporary workdir cleanup.

## Verification

- Focused unit tests for the simplified CLI, task schema, hook queueing, staging, cover and metadata patch.
- Full tests and typecheck.
- Next production build and Docker compose config.
- Real Slidev PDF, SPA and PNG smoke exports, plus dogfood one-PNG-per-template test.
- Authenticated Payload build flow and preview/final visual comparison where environment permits.

## Result

Status: resolved.

- Removed 1,610 lines and added 111, net `-1,499` lines.
- Removed `pdf-lib`, the incremental page cache/assembly stack, targeted output policy, timing framework, duplicate rebuild menu, and six operator tuning inputs.
- Preserved the Slidev workspace Chromium installation and runtime posture, including `NODE_ENV=development`, Playwright-compatible Chromium, and the production `libxfixes3` requirement.
- `pnpm typecheck`, `pnpm build`, `docker compose config`, and the full suite passed.
- Full suite: 408 tests passed, 9 opt-in/live tests skipped.
- `RUN_SLIDEV_SMOKE_TESTS=1` real Slidev/Chromium PNG smoke passed; its subprocess still strips `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`.
- Real one-PNG-per-template dogfood export passed.
- Strict native sequential `slidev build` then `slidev export` smoke produced both SPA and PDF.
