---
date: 2026-06-05
scope: whole-repo (src/)
command: compound refactor whole-repo
status: complete (Tiers 1+2+3 landed; Tier 4 deferred)
agents_dispatched:
  - discovery: authoring layer (blocks/collections/access/hooks/draft-route)
  - discovery: export/render/build layer
  - discovery: frontend/routes/components layer
  - discovery: cross-cutting constants/config/env
---

# Compound Refactor — whole-repo (src/)

## Summary

- Total deduped findings: 17 (13 actionable, 1 deferred Tier 4, 3 nice-to-have)
- LOC duplicated (estimated): ~230 LOC
- Expected reduction: ~110-130 LOC net (after adding ~40 LOC of shared consts/helpers)
- High-drift hazards (>=2): 11
- Severity-3 (silent breakage) hazards: 6
- Latent bugs surfaced: 2 (divergent MEDIA_DIR anchor; quotes can emit CSS-less k-grid-1)

This is the **second** SSOT pass. A prior pass (commits 7735993, 0e23459, 6decc71, 777570d + plan docs/plans/2026-06-03-001) already consolidated the big duplications: per-block field kit, RENDERERS map, strip/extract regexes, sha256/share-link resolver. Those are confirmed intact and listed under "Already well-consolidated". The findings below are what that pass **missed** — almost all are magic-string / constant SSOT violations with high silent-breakage risk.

Leverage = (sites_affected x drift_hazard_severity) / effort.

## Already-consolidated baseline (recent SSOT commits, do NOT redo)

- `777570d` — fix: resolve all 10 dogfood findings (authoring, AI draft, build, sharing)
- `6decc71` — refactor(share): single share-link resolver (Phase 3)
- `0e23459` — refactor(export): single node-free render core (Phase 2)
- `7735993` — refactor(blocks): shared field kit + close AI-draft Zod drift (Phase 1)
- `760909e` — refactor(ux): organize Presentations form into Contenu/Metadonnees/Sortie tabs
- `4bb35fe` — refactor: move admin seed into Payload onInit hook

## Tier 1 — trivial effort, high compound (auto-execute candidates)

| # | Finding | Sites | Hazard | Effort | Lev | Status |
|---|---|---|---|---|---|---|
| C3 | `buildSlides` task slug magic string | 2 | 3 | 1 | 6 | pending |
| C5 | Presentation/build status enums as literals | 18 | 3 | 1 | 54 | pending |
| C6 | `skipBuildQueue` / `shareToken` req.context keys | 8 | 3 | 1 | 24 | pending |
| C7 | `SLUG_RE` regex triplicated | 3 | 3 | 1 | 9 | pending |
| E2 | `cta.ts` hand-rolls `surfaceClass('dark')` output | 2 | 1 | 1 | 2 | pending |
| E4 | `quotes.ts` emits CSS-less `k-grid-1` (latent bug) | 2 | 2 | 1 | 4 | pending |

### C3 — `buildSlides` task slug magic string

**Sites** (2 authored + 1 already-indirected):
- `src/jobs/buildSlides.ts:50` — `slug: 'buildSlides'` (task definition)
- `src/hooks/afterPresentationChange.ts:44` — `task: 'buildSlides'` (enqueue, behind an `as Function` cast at :43 → zero type safety)

**Proposed SSOT**: `export const BUILD_SLIDES_TASK = 'buildSlides' as const;` in `src/jobs/buildSlides.ts`; import in the hook.

**Effort**: 1 · **Drift hazard**: 3 (typo/rename → hook enqueues a non-existent task slug; the `as Function` cast hides it → builds silently never run)

**Status**: pending

---

### C5 — Presentation & build status enums restated as literals

**Sites** (18): build-status `'idle'|'building'|'success'|'failed'` —
- `src/collections/Presentations.ts:153` (default), `:160-163` (options)
- `src/jobs/buildSlides.ts:78` `'building'`, `:171` `'success'`, `:187` `'failed'` (write-backs)
- `src/components/BuildStatusField.tsx:7` (hand-written union), `:86/:91/:101` (comparisons), `:12-17` (label map keys)

presentation-status `'draft'|'published'|'archived'` —
- `src/collections/Presentations.ts:212` (default), `:219-221` (options)
- `src/hooks/afterPresentationChange.ts:31` `!== 'published'`, `:35` `=== 'published'`

**Proposed SSOT**: `src/lib/status.ts` exporting `BUILD_STATUS` and `PRESENTATION_STATUS` const objects + derived types. Derive collection `options`/`defaultValue`, hook comparisons, job write-backs, and the `BuildStatusField` union from them.

**Effort**: 1-2 · **Drift hazard**: 3 (the publish gate at afterPresentationChange keys off bare `'published'`; rename it in the collection and the entire build pipeline silently stops queuing. The job writes raw `'success'`; a rename there leaves the admin badge stuck on "En attente" forever.)

**Status**: pending

---

### C6 — `skipBuildQueue` / `shareToken` req.context keys

**Sites** (8): `skipBuildQueue` — setter `src/jobs/buildSlides.ts:79,174,190` + `src/app/(payload)/api/draft-presentation/route.ts:251`; reader `src/hooks/afterPresentationChange.ts:27`. `shareToken` — setter `src/collections/ShareLinks.ts:82`; readers `:111,:114`.

**Proposed SSOT**: `src/lib/context.ts` exporting `CTX = { skipBuildQueue, shareToken } as const`; all setters/readers reference `CTX.*`. (`req.context` is untyped so a typo compiles.)

**Effort**: 1-2 · **Drift hazard**: 3 (a typo in any of the 4 `skipBuildQueue` setters reintroduces the infinite requeue loop the flag exists to prevent — the exact failure CLAUDE.md warns about).

**Status**: pending

---

### C7 — `SLUG_RE` regex triplicated

**Sites** (3, byte-identical `/^[a-z0-9-]{1,64}$/`):
- `src/collections/Presentations.ts:112` (field validate)
- `src/jobs/buildSlides.ts:22` (`SLUG_RE`)
- `src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:9` (`SLUG_RE`)

**Proposed SSOT**: `src/lib/slug.ts` → `export const SLUG_RE = /^[a-z0-9-]{1,64}$/;` (+ optional `isValidSlug`). The slugify `.slice(0,64)` at Presentations.ts:105 shares the `64` magic number.

**Effort**: 1 · **Drift hazard**: 3 (producer/consumer security boundary — loosen validation in one and a slug saves but the serve route 404s, or vice-versa).

**Status**: pending

---

### E2 — `cta.ts` hand-rolls `surfaceClass('dark')` output

**Sites** (2):
- `src/export/utils.ts:62` — `surfaceClass` returns `'relative k-dark'` for dark
- `src/export/blocks/cta.ts:47` — `classAttr: 'relative k-dark'` (byte-identical literal)

**Proposed SSOT**: `cta.ts:47` → `classAttr: surfaceClass('dark')`.

**Effort**: 1 · **Drift hazard**: 1 (rename `k-dark` and cta drifts from the helper).

**Status**: pending

---

### E4 — `quotes.ts` can emit CSS-less `k-grid-1` (latent bug)

**Sites** (2 divergent grid-class derivations):
- `src/export/blocks/quotes.ts:16` — `k-grid-${Math.min(quotes.length || 3, 4)}` → emits `k-grid-1` when there is exactly 1 quote
- `src/export/blocks/cardGrid.ts:17,43` — `k-grid-${block.columns ?? '4'}`
- CSS defines only `.k-grid-2/3/4` (`src/export/style.css:326-342`) — **no `.k-grid-1`** → single-quote slide renders unstyled.

**Proposed SSOT**: `gridClass(n)` helper in `src/export/utils.ts` clamping to `[2,4]`, used by both renderers. Fixes the latent bug AND consolidates the class-token format.

**Effort**: 1 · **Drift hazard**: 2 (real layout break on a 1-quote slide today).

**Status**: pending

## Tier 2 — small effort, high compound (confirm)

| # | Finding | Sites | Hazard | Effort | Lev | Status |
|---|---|---|---|---|---|---|
| C1 | Collection slugs as magic strings | 28 | 3 | 2 | 42 | pending |
| C8 | `MEDIA_DIR` divergent anchor + SPA path segments | ~18 | 2 | 2 | 18 | pending |
| C9 | `NEXT_PUBLIC_SERVER_URL` divergent fallback + env reads | 11 | 2 | 2 | 11 | pending |
| C2 | Role strings + rotate-endpoint inline predicates | 6 | 2 | 2 | 6 | pending |
| F2 | Payload REST `fetch` error/credentials pattern | 3 | 1 | 2 | 1.5 | pending |
| F3 | Inline admin-UI style objects (panel/error/hint/button) | 4 | 1 | 2 | 2 | pending |
| F4 | Slide-preview frame chrome + `#1a1a2e` stage bg | 2 | 2 | 2 | 2 | pending |

### C1 — Collection slugs as magic strings (the jackpot)

**Sites** (28 across 9 files): `'presentations'` ×11, `'media'` ×5, `'share-links'` ×5, `'users'` ×7, `'accounts'` ×2 — in `slug:`, `collection:`, `relationTo:`, plugin `usersCollectionSlug`/`accountsCollectionSlug`, and `find/findByID/create/update/count` calls. Full list in the discovery reports; anchors are the 5 `slug:` definitions in `src/collections/*.ts`.

**Proposed SSOT**: `src/lib/collections.ts` → `COLLECTIONS = { presentations, media, shareLinks: 'share-links', users, accounts } as const`. Each collection `slug:` references its const; every `collection:`/`relationTo:` imports it.

**Effort**: 2 (mechanical, wide) · **Drift hazard**: 3 (a typo'd slug compiles, returns empty/throws at runtime; no compile guard).

**Status**: pending

---

### C8 — `MEDIA_DIR` divergent anchor + SPA path segments (latent bug)

**Sites**: `MEDIA_DIR` computed two ways — `src/jobs/buildSlides.ts:25` `resolve(__dirname, '../../media')` vs `src/lib/spaFiles.ts:6` `resolve(process.cwd(), 'media')`. The job WRITES `media/spa/<slug>` (buildSlides.ts:156) and spaFiles READS it (:48); they must point to the same dir. Plus `'spa'` segment, `'index.html'` default, and `/spa/<slug>/index.html` URL shape restated in buildSlides.ts:156,170, spaFiles.ts:41,48, share page :69.

**Proposed SSOT**: `src/lib/paths.ts` — single `MEDIA_DIR`, `SPA_DIR`, `INDEX_HTML`, `spaUrl(slug)`, `spaDir(slug)`, plus `ARTIFACTS` for the tmpdir filenames (slides.md/style.css/headmatter.yaml/fonts/slides.pdf/dist). Unify the `MEDIA_DIR` anchor FIRST.

**Effort**: 2 · **Drift hazard**: 2 (Docker worker vs web CWD divergence → builds succeed but decks 404; "works locally, breaks in prod").

**Status**: pending

---

### C9 — `NEXT_PUBLIC_SERVER_URL` divergent fallback + scattered env reads

**Sites** (11): `NEXT_PUBLIC_SERVER_URL` read with **conflicting** fallbacks — `src/payload.config.ts:44` `|| 'http://localhost:3000'` vs `src/collections/ShareLinks.ts:9` `|| ''`. Plus OPENAI_* (route.ts:226-230), GOOGLE_* (config:51-52), SEED_ADMIN_* (config:64-65), DATABASE_URL/PAYLOAD_SECRET.

**Proposed SSOT**: `src/lib/env.ts` — typed reads + canonical fallbacks. Priority is `SERVER_URL` (the divergent `''` produces a malformed share URL in dev). OPENAI cluster is single-file; lower priority but co-locate.

**Effort**: 2 · **Drift hazard**: 2 (divergent fallback → broken `/share/<token>` URL when var unset).

**Status**: pending

---

### C2 — Role strings + rotate-endpoint inline predicates

**Sites** (6 outside the canonical `access/roles.ts` functions): `src/collections/ShareLinks.ts:35` re-implements `isAdminOrAuthor` inline (negated), `:58` re-implements `isAdmin` inline; seed `payload.config.ts:77,83` writes `role: 'admin'`; Users option values `Users.ts:22,23`.

**Proposed SSOT**: `ROLES` const in `src/access/roles.ts` + reusable `userIsAdminOrAuthor(user)` / `userIsAdminOrSelf(user, createdBy)` predicates the rotate endpoint calls (instead of inline negated logic).

**Effort**: 2 · **Drift hazard**: 2-3 (security predicate restated by hand; if the role model gains a new privileged role, collection `access` updates but the rotate endpoint silently keeps the old rule → auth bug).

**Status**: pending

---

### F2 — Payload REST `fetch` error/credentials pattern ×3

**Sites** (3): `DraftFromBriefButton.tsx:26-49`, `ShareUrlField.tsx:24-38`, `BuildStatusField.tsx:35-43` — all repeat `credentials:'include'` + JSON parse + `!res.ok` branch + the verbatim `err instanceof Error ? err.message : 'Erreur réseau'` fallback.

**Proposed SSOT**: `src/lib/adminFetch.ts` (client) — `adminFetch<T>(path, init)` injecting credentials, parsing JSON, throwing a typed error with `{error, detail}`.

**Effort**: 2 · **Drift hazard**: 1.

**Status**: pending

---

### F3 — Inline admin-UI style objects (panel / error / hint / button)

**Sites** (4 patterns): error box byte-identical in `DraftFromBriefButton.tsx:155-164` + `ShareUrlField.tsx:154-164`; dashed hint byte-identical `DraftFromBriefButton.tsx:56-64` + `ShareUrlField.tsx:54-62`; card panel ×3; primary green button ×2; muted helper-text span ×~5.

**Proposed SSOT**: `src/components/adminUi/styles.ts` exporting `panelStyle`, `errorBoxStyle`, `dashedHintStyle`, `primaryButtonStyle(loading)`, `mutedTextStyle`. Error box + dashed hint are zero-risk exact-copy extractions.

**Effort**: 2 · **Drift hazard**: 1.

**Status**: pending

---

### F4 — Slide-preview frame chrome + `#1a1a2e` stage bg

**Sites** (2): `src/components/SlidePreview.tsx:35,50,69` and `src/app/(frontend)/preview/page.tsx:58,74,98,105,116` both restate the `slidev-layout ${layout==='cover'?'k-cover':''}` className ternary, the `padding:'3rem 4rem'` slide box, and the `#1a1a2e` stage background (4 literal occurrences). The prior pass consolidated the *render/strip* logic (renderBlockPreview) but NOT this presentational frame.

**Proposed SSOT**: a `<SlideFrame html layout />` presentational component (or `slideFrameProps(layout)` + `SLIDE_STAGE_BG` const) consumed by both surfaces.

**Effort**: 2 · **Drift hazard**: 2 (cover-class ternary + padding must stay in lockstep with cover.ts/style.css or the two previews disagree).

**Status**: pending

## Tier 3 — medium effort / low-risk kit extensions (confirm)

| # | Finding | Sites | Hazard | Effort | Lev | Status |
|---|---|---|---|---|---|---|
| A14 | `titleField` + card `{title,description}` not in kit | 8+2 | 1 | 2 | 5 | pending |
| F6 | KlarcIcon vs KlarcLogo = same asset, size differs | 2 | 1 | 1 | 2 | pending |
| E10 | `k-*` CSS class tokens have no TS SSOT | ~15 | 2 | 3 | 10 | pending |

### A14 — `titleField` + card `{title,description}` pair not in the field kit

**Sites**: every block restates `{ name:'title', type:'text', required:true, label:'Titre', admin:{description} }` (8 blocks). The card sub-field pair `{title,description}` is identical in `TwoColsBlock.ts:36-48` + `CardGridBlock.ts:48-60`.

**Proposed SSOT**: extend `src/blocks/_shared.ts` with `titleField(description)` and `cardTitleDescFields()`. Natural follow-on to the existing kit.

**Effort**: 2 · **Drift hazard**: 1 (pure repetition; high LOC payoff).

**Status**: pending

---

### F6 — KlarcIcon vs KlarcLogo same asset, only size differs

**Sites** (2): `KlarcIcon.tsx` (28×28) and `KlarcLogo.tsx` (120×120) are identical but for the numeric size; both restate `/brand/klarc-logomark.svg` + `alt="Klarc"`.

**Proposed SSOT**: one `<KlarcMark size={number} />`; keep thin re-export wrappers if named imports must stay.

**Effort**: 1 · **Drift hazard**: 1.

**Status**: pending

---

### E10 — `k-*` CSS class tokens have no TS SSOT

**Sites** (~15): `'k-eyebrow'` (5 sites), `'k-card'` (3), `'k-dark'` (3), `'k-btn'` (2), `'k-grid-N'` — all bare strings in renderers, decoupled from their `style.css` definitions; a CSS rename silently breaks renderer output.

**Proposed SSOT**: `src/export/classNames.ts` exporting a `K` token object imported by renderers. Caps the blast radius (can't fully enforce CSS sync without tooling).

**Effort**: 3 (touches every renderer) · **Drift hazard**: 2. **Note**: weigh churn vs payoff; consider deferring or doing only after the renderer-touching Tier-1 E2/E4 land.

**Status**: pending

## Tier 4 — defer to /ce-plan

- **4.A — Block field shape defined in 3 layers** (Payload block field × renderer `*BlockData` type × Zod schema, ×9 blocks = 27 definitions; +`payload-types.ts` generated 4th copy). Drift hazard 3 (a field added in one layer, forgotten in another, silently drops data or breaks AI drafting — exactly the manual invariant CLAUDE.md documents). **Deferred**: effort tier 4, architecturally invasive (needs a schema-as-source generator, e.g. Zod-as-source → Payload field generator). Within-layer sharing (`_shared.ts`, `eyebrowZod`/`surfaceZod`) already exists; the cross-layer sync is the remaining structural debt. Hand to `/ce-plan`.

- **4.B — surface default asymmetry** (block `surfaceField` defaults `'dark'`; Zod `surfaceZod` is `.optional()` with no default). Latent today (renderers treat `undefined`===`'dark'`). Fold the `DEFAULT_SURFACE` const fix into 4.A or a small follow-up; not urgent.

## Already well-consolidated (do NOT redo)

- **Field factories** `previewField`/`eyebrowField`/`surfaceField`/`imageFields` — `src/blocks/_shared.ts`; every block imports them.
- **RENDERERS map + SlideBlock union** — single node-free `src/export/renderers.ts`; reused by buildSlidesMd + preview.ts + both client preview surfaces.
- **strip-frontmatter / extract-layout** — `src/export/preview.ts` (one stray sibling regex in buildSlidesMd.ts:60 noted but low value).
- **sha256 / resolveShareLink / isLive** — `src/lib/shareLinks.ts`; reused by ShareLinks collection + both share routes.
- **serveSpaFile (MIME map + path-traversal guard + cache split)** — `src/lib/spaFiles.ts`; adopted by BOTH SPA routes. No traversal/MIME duplication — the highest-risk class is clean.
- **Access predicate functions** `isAdmin/isAdminOrAuthor/isLoggedIn/isAdminOrSelf` — `src/access/roles.ts`; used by every collection `access` block. (Only the rotate endpoint re-implements inline — C2.)
- **eyebrowZod / surfaceZod** — `route.ts:9-14`; cardGrid.columns enum matches the block option list.
- **eyebrow() renderer helper** — 4 inline eyebrows (cover/cardGrid/quotes/cta) verified byte-distinct → intentional exception holds.
- **Slidev `---` separator + headmatter merge** — single owner `buildSlidesMd.ts:53-65`.
- **`escape()` / `md()`** — universal; no inline HTML escaping anywhere.
- **Google brand SVG** — single copy in GoogleLoginButton.tsx.

## Execution log

- 2026-06-05 — Phase 0 clean tree (restored generated tsconfig.tsbuildinfo)
- 2026-06-05 — Phase 2 dispatched 4 parallel discovery agents (authoring / export / frontend / cross-cutting)
- 2026-06-05 — Phase 3 deduped + ranked; verified MEDIA_DIR divergence, SLUG_RE triple, k-grid-1 latent bug, context-key sites
- 2026-06-05 — Phase 4 audit written
- 2026-06-05 — User approved Tiers 1+2+3 (atomic commits, no push)
- 2026-06-05 — Wave 1 (parallel): export `00751e2`, blocks `9f726bd`, admin-ui `c8850f9`
- 2026-06-05 — Wave 2a: paths/slug `d40f873`
- 2026-06-05 — Wave 2b: backend constants `3695ca1`
- 2026-06-05 — Final verify: tsc clean, 53/53 tests, payload-types.ts byte-identical, `pnpm build` passes (no node imports in client bundle)

## Resolution map

| Finding | Status | Commit |
|---|---|---|
| C1 collection slugs | resolved | `3695ca1` |
| C2 roles + rotate predicates | resolved | `3695ca1` |
| C3 task slug | resolved | `3695ca1` |
| C5 status enums | resolved | `3695ca1` |
| C6 req.context keys | resolved | `3695ca1` |
| C7 SLUG_RE | resolved | `d40f873` |
| C8 MEDIA_DIR + paths (latent bug) | resolved | `d40f873` |
| C9 SERVER_URL fallback | resolved | `3695ca1` |
| E2 cta surfaceClass | resolved | `00751e2` |
| E4 k-grid-1 (latent bug) | resolved | `00751e2` |
| E10 k-* class tokens | resolved (partial — 2 cover sites left literal by design) | `00751e2` |
| F2 adminFetch | helper created, NOT adopted (divergent error fallbacks — deferred) | `c8850f9` |
| F3 admin-UI styles | resolved | `c8850f9` |
| F4 slide-frame + stage bg | resolved | `c8850f9` |
| F6 KlarcMark | resolved | `c8850f9` |
| A14 titleField + card pair | resolved | `9f726bd` |
| 4.A block-shape ×3 layers | deferred to /ce-plan | — |
| 4.B surface default asymmetry | deferred (fold into 4.A) | — |
