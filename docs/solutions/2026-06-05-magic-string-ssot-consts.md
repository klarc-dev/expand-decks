# Solution — Magic-string SSOT via `as const` modules in `src/lib`

**Date:** 2026-06-05
**Origin:** second compound-refactor pass (audit `docs/audits/2026-06-05-compound-refactor-whole-repo.md`)
**Commits:** `00751e2`, `9f726bd`, `c8850f9`, `d40f873`, `3695ca1`

## Pattern

When a literal value (collection slug, status enum, `req.context` key, task slug, CSS class token, regex, path anchor) is restated as a bare string across many files, promote it to a single `as const` export in `src/lib/` and import everywhere. No abstraction layer, no codegen — just deletion + one const.

### The const modules now in place (do NOT re-propose extracting these)

| Module | Owns | Replaces |
|---|---|---|
| `src/lib/collections.ts` | `COLLECTIONS` (collection slugs) | 28 magic-string `collection:`/`relationTo:`/`slug:` sites |
| `src/lib/status.ts` | `BUILD_STATUS`, `PRESENTATION_STATUS`, `BUILD_SLIDES_TASK` + types | hand-written `BuildStatusField` union, job write-backs, publish gate, task slug |
| `src/lib/context.ts` | `CTX` (`skipBuildQueue`, `shareToken`) | untyped `req.context` magic keys |
| `src/lib/slug.ts` | `SLUG_RE`, `SLUG_MAX`, `isValidSlug` | 3 inline slug-regex copies |
| `src/lib/paths.ts` | `MEDIA_DIR`, `SPA_DIR`, `INDEX_HTML`, `spaDir`, `spaUrl`, `ARTIFACTS` | divergent MEDIA_DIR anchors + scattered path segments |
| `src/lib/env.ts` | `SERVER_URL` | divergent `NEXT_PUBLIC_SERVER_URL` fallbacks |
| `src/access/roles.ts` | `ROLES` + `userIsAdmin`/`userIsAdminOrAuthor` | inline negated role checks in the rotate endpoint |
| `src/export/classNames.ts` | `K` (k-* CSS class tokens) | ~15 bare class-string literals in renderers |
| `src/components/adminUi/styles.ts` | shared admin field styles | duplicated inline style objects |
| `src/components/SlideFrame.tsx` | slide-preview chrome + `SLIDE_STAGE_BG` | duplicated preview frame + `#1a1a2e` literals |

## Two latent bugs this pass fixed

1. **Divergent `MEDIA_DIR` anchor** — the build job wrote to `resolve(__dirname,'../../media')` while the serve layer read `resolve(process.cwd(),'media')`. Unified on `process.cwd()` in `lib/paths.ts`. Symptom would have been "builds succeed, decks 404" when the worker CWD differs from the web process.
2. **`k-grid-1` with no CSS** — `quotes.ts` emitted `k-grid-${quotes.length||3}`, producing `k-grid-1` for a single-quote slide; only `.k-grid-2/3/4` exist in `style.css`. Fixed via `gridClass(n)` clamping to `[2,4]` in `export/utils.ts`.

## Key constraints honored (repeat on future runs)

- **Byte-identical persisted values.** Const VALUES must equal the prior literals exactly. Proof: `pnpm generate:types` must leave `src/payload-types.ts` with a zero diff after slug/status consolidation.
- **Client-bundle safety.** `lib/status.ts`, `lib/context.ts`, `lib/collections.ts`, `lib/env.ts` are node-free so client components (e.g. `BuildStatusField.tsx`) can import them. Verified with `pnpm build` (any `node:` leak fails the browser bundle). Do NOT add node imports to these modules.
- **Byte-identical rendered HTML.** `src/export/__tests__/blocks.test.ts` asserts rendered markup literally — it is the regression guard for any renderer-touching const adoption.

## Verification toolbox (no lint script exists)

```
npx tsc --noEmit            # typecheck
pnpm test                   # vitest, 53 tests
pnpm generate:types && git diff --stat src/payload-types.ts   # schema-drift guard
pnpm build                  # proves no node import leaked to client bundle
```

## Deferred (do NOT re-propose as quick wins)

- **Block field shape defined in 3 layers** (Payload block field × renderer `*BlockData` × Zod schema, ×9 = 27 defs). Tier 4 — needs a schema-as-source generator. Escalated to `/ce-plan`. Within-layer sharing (`_shared.ts`, `eyebrowZod`/`surfaceZod`) already exists.
- **F2 `adminFetch`** — helper exists in `src/lib/adminFetch.ts` but is intentionally unadopted: the two call sites have field-specific error fallbacks (`'Erreur lors de la génération'` etc.) and bespoke `data.detail` append logic. Adopting would require a `fallbackMessage` param; low leverage (1.5). Leave until a call site with a generic `'Erreur réseau'` fallback appears.
