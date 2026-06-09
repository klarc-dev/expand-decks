# Reusable-Components Fix Plan — Slides Deck

Goal: (a) fix the confirmed visual defects and (b) restructure renderers + block-spec DSL + collection model so every layout composes from a small set of shared primitives, and the 8 monotonous `statement` slides gain variety through a **variant-as-data** model rather than new rigid blocks.

All paths absolute under `/Users/joachimbrindeau/Development/expand/production/slides/`.

---

## 1. Executive read — root causes (not symptoms)

Four root causes generate essentially all 26 findings:

**RC1 — `statement` is the only narrative block with ZERO layout knobs.**
`src/export/blocks/statement.ts` is fully hardcoded: every statement → `wrapSlide({ layout: 'center', body })` with one `max-w-4xl px-12` wrapper, one `<h1>`, one `text-xl` body. `src/blocks/spec/statement.ts` carries only `eyebrow/title/body/footer` — it does **not** even have the `surface` factory that cover/section already use. So 8 of 26 slides (31%) are byte-for-byte identical layouts differing only in text (findings: monotony, wasted vertical space, weak hierarchy, no focal point, filler-not-emphasis). The variant machinery already exists (`surface`→`surfaceClass`, `image`/`imagePosition`→`wrapSlide` layout override, `.k-split` in CSS) — `statement` just never opted in.

**RC2 — The slide *frame* (header + body wrapper + padding + footer) is copy-pasted per renderer instead of being shared primitives.** Each of the ~9 content renderers hand-assembles `eyebrow + <hN>` with a different heading size (`text-4xl` vs `text-5xl` vs `<h1>`), a different wrapper (`px-14 pt-24` vs `px-12` vs `max-w-4xl`), and ad-hoc crowding heuristics. There is no shared `slideHeader`, `card`, `cardStack`, `contentFrame`, or `heroFrame`. This is the direct cause of: title floating at 3 vertical origins, left margin wandering 112→238px, eyebrow over-treatment divergence, header markup divergence across 8 renderers, magic-number padding scattered across 9 files.

**RC3 — Two footer layers render on top of each other, and chrome/color expresses hierarchy via opacity instead of tokens.** The deck-level footer (`src/export/chrome.ts` → `.k-slide-footer`, a 3-cell flex) collides with the per-block `K.foot` div that `statement.ts:18-21` emits inline at `.k-foot { bottom: 1.2rem }` — two strings stacked at the same Y (the garbled "LE POINT LE PLUS RENTABLE… / E2E ORG" overlap). Separately, `style.css` expresses de-emphasis through `opacity: 0.45/0.5/0.6` and `rgba(255,255,255,0.5)` on colored grounds (findings: AA failures on captions/footers/sub-labels, eyebrow pill contrast flipping by tone). There is no `--fg-*-muted` / `--fg-footer` solid-token scale and no single `--bg`/`--fg` per-slide pair.

**RC4 — Light/dark polarity and pacing track `blockType` accident, not slide ROLE.** `surfaceClass()` defaults everything-not-`light` to dark, and each spec picks a default surface independently, producing the incoherent 1-dark/2-light/…/7-light-wall sequence. The `Section` divider block exists but is wired into **nothing** (used in 0/26 slides) because the AI prompt never emits it. There is no `slideTone` resolver and no "no 2 identical consecutive blockTypes" rule in `src/lib/draftPresentation.ts`'s prompt.

---

## 2. Reusable component layer

Three tiers: **render primitives** (`src/export/`), **block-spec field factories** (`src/blocks/spec/dsl.ts` + `src/blocks/_shared.ts`), and **collection-model** change (variant-as-field).

### 2A. CSS token layer — `src/export/style.css` (foundation for everything)

| Token group | New tokens | Replaces |
|---|---|---|
| **Tone pair** | `--bg` / `--fg` set per-slide; `.k-dark{--bg:teal;--fg:#fff}` light default `{--bg:#fff;--fg:ink}` | `surfaceClass` dark-default scatter |
| **Muted text** | `--fg-dark-muted:#B8CCCC`, `--fg-light-muted:#5A6B6B`, `--fg-footer` (verified ≥4.5:1) — **solid, no rgba** | `opacity:0.45/0.5/0.6/0.7/0.75`, `rgba(255,255,255,0.5)` at lines 561,573,259,600,627 etc. |
| **Type ramp** | `--t-display`(6rem) `--t-hero`(3.2rem) `--t-title`(text-5xl) `--t-sub`(text-4xl) `--t-body` `--t-caption` | free-form `text-4xl`/`text-5xl`/`text-6xl`/`text-xl` per renderer |
| **Content rail** | `--content-inset:112px` (one left/right rail) | `px-14`(5 renderers) vs `px-12`(4 renderers) vs statement `238px` indent |
| **Header anchor** | `--header-top` (fixed title baseline Y) | `pt-24`/`pt-28`/`pt-16`/`pt-20` + statement center-float |
| **Eyebrow/pill** | `--pill-bg`/`--pill-fg`/`--pill-border` per tone; drop `::before` coral dot OR promote `--accent` (rose) to a repeated role | `.k-eyebrow::before` (line 153), tone-flipping pill |
| **Accent rule** | `--accent-rule` (shared by statement anchor + quotes) | none today |

### 2B. Render primitives — `src/export/utils.ts` (peers of existing `eyebrow()`/`wrapSlide()`)

1. **`slideHeader({ eyebrow, title, size?, sidebar? })`** → returns the `eyebrow + <hN>` unit at a **fixed top anchor** and a 2-value size scale (`'lg'`=`--t-title`, `'md'`=`--t-sub`). Optional right sidebar via `flex items-end justify-between`.
   *Collapses:* the hand-rolled header in `cardGrid.ts:48-52`, `twoCols.ts:46-47/77-79`, `table.ts`, `timeline.ts`, `quotes.ts` (+ statement/stats via hero variant). Eliminates the `<h1>`/`<h2>`/`<h3>` + size divergence.

2. **`card({ number?, title, body?, footer? })`** → owns the `K.card` box, optional `K.num` badge, the `<h3>`, and the null-safe `richTextToHTML(body)`-or-empty slot.
   *Collapses:* the inline card markup in `cardGrid.ts:27-34` and `twoCols.ts:54-62` (and `quoteCard()` thin wrapper for `quotes.ts`). Fixes the `<h3>` vs `<h3 class="text-sm">` silent divergence.

3. **`cardStack(cards, { layout:'grid'|'column', cols?, count })`** → maps `card()`, picks `gridClass(cols)` vs `space-y` container, centralizes the **one** crowding heuristic (gap/tightness from count + 720px canvas).
   *Collapses:* the two unrelated `crowded` blocks (`cardGrid.ts:40-44` `rows>2`/`pt-16` vs `twoCols.ts:68-71` `len>=4`/`pt-20`/`space-y-2`).

4. **`contentFrame(body, { topPad?, wFull? })`** → the `--content-inset` + `--header-top` grid frame. *Replaces* the per-renderer `<div class="px-14 pt-NN w-full">` opener in cardGrid/twoCols/table/timeline/quotes. No raw `px-14`/`pt-NN` literal survives.

5. **`heroFrame({ eyebrow, title, body, footer, scale, align, surface })`** → centered/left/split emphasis surface; delegates its header to `slideHeader`, owns `--content-inset` + scale token + optional `.k-split`. *Replaces* the 4 near-duplicate centered wrappers in `statement.ts:23-29`, `section.ts`, `cta.ts`, `stats.ts`. This is the **single primitive every statement variant calls** (so variant = one call with different `scale`/`align`/`surface`).

6. **`slideTone(block, index) → 'light'|'dark'`** in `src/export/buildSlidesMd.ts` → role-based polarity: `section/cover/cta/divider`→dark; `table/twoCols/cardGrid/stats`→light; `statement`→index-seeded toggle so no two adjacent statements share a tone. Drives `--bg`/`--fg`. *Replaces* the blockType-accident default in `surfaceClass()`.

### 2C. Chrome primitive — `src/export/chrome.ts` + renderers

7. **Single `DeckFooter`** = the existing `.k-slide-footer` 3-cell flex (`left | center | right`) is the **only** footer. **Delete the inline `K.foot` per-block footer** (`statement.ts:18-21`, and any other renderer emitting `K.foot`). The block's `footer` field content routes into the deck footer's `center` cell (or a reserved caption row above the rule) so slug/caption/page can never overlap. *Fixes* both blocking footer-collision findings.

### 2D. Block-spec field factories — `src/blocks/spec/dsl.ts` + `src/blocks/_shared.ts`

8. **`headerFieldSpecs`** — `eyebrowSpec()`, `titleSpec(desc)`, `surfaceSpec(opts)` returning a **full `FieldSpec`** (render Zod + AI Zod + factory) in one call, plus exported shared render-Zod consts (`eyebrowRender`, `titleRender`, `surfaceRender`) so the precise `renderSchema` literal reuses the *same* value. *Replaces* the copy-pasted `const eyebrow = optionalRender(z.string()); const title = z.string(); const surface = …` opening duplicated across all 11 specs (`statement.ts:27-30`, `cover.ts:13-20`, `cardGrid.ts:13-16`, etc.). L1 was already shared via `_shared.ts`; this closes L2/L3.

9. **`cardArrayField(name, itemDescriptor, payloadMeta)`** — takes ONE item descriptor and derives all three projections (L1 nested-`fields` array Field, L2 render array Zod, L3 AI array Zod dropping `ai:false` sub-fields). Plus a shared `cardTitleDescItem` descriptor matching the existing `cardTitleDescFields()`. *Replaces* the 15-line raw-array incantation duplicated in cardGrid/twoCols/stats/quotes, making render/AI key sets impossible to drift.

10. **`emphasisFields` bundle** — `{ surface, variant, image?, imagePosition? }` packaged once and spread into any narrative block's `fields[]`. *Replaces* the ad-hoc per-block adoption of surface/image. Same pattern as existing `_shared` factories, just bundled.

### 2E. Collection-model change — variant as DATA, not new blockTypes

11. **`StatementVariant`** = a `select` field on `statementSpec.fields` with values `centered-hero | pull-quote | big-statement | split`, projected automatically through the existing `renderSchemaOf`/`aiSchemaOf`/`buildSystemPrompt` pipeline. `renderStatement` switches on `block.variant` → one `heroFrame(...)` call per branch. **No new block types**, no new `ALL_SPECS` entries, no draft-route changes (schema + prompt auto-derived per CLAUDE.md). The `Presentations.slides` blocks array is unchanged — only `statement`'s fields grow. Layout = `block.type × block.variant × block.surface` (small Cartesian product as data). Later generalize the same `emphasisFields` bundle to `quotes`/`cta`.

---

## 3. Per-defect fixes, grouped by priority

### P0 — blocking, ship first (correctness + AA + the chrome that breaks every slide)

- **Footer collision (× both blocking findings, slides 2,10,12,16, deck-wide)** → **#7 DeckFooter**: delete inline `K.foot` from `statement.ts:18-21`; route `footer` field → `.k-slide-footer` center cell; verify slug/caption/page in separate flex cells with `gap`+`min-width`. *Files:* `statement.ts`, `chrome.ts`, `style.css` (`.k-foot` removed, `.k-slide-footer` cells).
- **AA failures on captions/footers/sub-labels (slides 4,6,17,25, footer deck-wide)** → **#2A muted tokens**: replace every `opacity:`/`rgba(...,0.x)` text rule (`style.css` lines 259,561,573,600,627,638) with solid `--fg-dark-muted`/`--fg-light-muted`/`--fg-footer`. Verify each ≥4.5:1.
- **Title floats at 3 vertical origins (blocking, deck-wide)** → **#1 slideHeader + #2A `--header-top`**: lock title baseline to one Y across all block types; statement keeps centered *body* but header originates at the shared Y.

### P1 — major structural + the monotony the user explicitly called out

- **8 identical statement slides / no variety (× 4 findings)** → **#11 StatementVariant + #5 heroFrame + #6 slideTone**. Add `variant` + `surface` to `statementSpec`; branch `renderStatement` to `heroFrame({scale,align,surface})`; `slideTone` alternates adjacent statements. Route quote-shaped statements (slide 11, 16) to the `quotes` block.
- **No focal point / no emphasis primitive (statements + twoCols 9,20,22)** → **#5 heroFrame `scale`** + a `--accent-rule`/pull-quote treatment (a `pull-quote` variant) shared with `twoCols`.
- **No pacing beats / Section unused (deck-wide)** → wire `Section` into `src/lib/draftPresentation.ts` prompt as a **mandatory divider** between topic groups + cap "no >2 identical consecutive blockTypes"; `slideTone` makes section/cover/cta dark.
- **Header markup divergence across 8 renderers** → **#1 slideHeader** in cardGrid/twoCols/table/timeline/quotes; statement/stats use `heroFrame`.
- **Left margin wanders / no content rail** → **#4 contentFrame + #2A `--content-inset`**; pull statement onto the same 112px rail (remove the 238px over-indent).
- **Header field Zods copy-pasted across 11 specs** → **#8 headerFieldSpecs**.
- **Card-array fields re-defined per block** → **#9 cardArrayField** + `cardTitleDescItem`.
- **Variant mechanism applied inconsistently** → **#10 emphasisFields** bundle into statement/cta/quotes.

### P2 — major polish + the remaining DRY collapses

- **Eyebrow over-treated / pill contrast flips by tone (slides 1,4,6,13,25)** → **#2A pill tokens** (`--pill-bg/-fg/-border` per tone, drop capsule stroke, cap length); decide coral: promote `--accent` to a repeated role or remove the `::before` dot (line 153).
- **Wasted vertical space (statements)** → **#5 heroFrame** scale-to-fill for short text + accent-rule anchor.
- **Weak type hierarchy** → **#2A type ramp** tokens; body-length guard in prompt diverts >2-line statements to twoCols/markdown.
- **Light/dark noise (deck-wide)** → **#6 slideTone** drives `--bg`/`--fg`.
- **`card()` markup hand-emitted 3×** → **#2 card**. **Card-stack crowding duplicated** → **#3 cardStack**. **Magic padding numbers in 9 files** → **#4 contentFrame + #2A tokens**. **Outer wrapper reconstructed per renderer** → **#4 contentFrame + #5 heroFrame**.
- **Tables: scannable vs paragraph-wall, one renderer (slides 3,7,8,19,21)** → add `tableVariant: 'reference'|'matrix'` to table spec (via **#11** variant-as-field pattern) + a shared **`StatusPill`** primitive (ok/warn/blocked) replacing inline ✅⚠️❌; matrix = status-pill column + note-treatment detail column.

---

## 4. Sequencing (each step composes on the prior)

1. **CSS token foundation (#2A).** Introduce `--bg/--fg`, `--fg-*-muted`, `--fg-footer`, type ramp, `--content-inset`, `--header-top`, pill + accent-rule tokens in `style.css`. Nothing reads them yet — pure addition, zero behavior change. *Unblocks every later visual step and the two P0 AA/anchor fixes.*
2. **DeckFooter single-render (#7).** Delete inline `K.foot`; route block `footer` → deck footer. *P0; isolated; needs only #1's `--fg-footer`.*
3. **Frame + header + card primitives (#1 slideHeader, #2 card, #3 cardStack, #4 contentFrame, #5 heroFrame) in `utils.ts`.** Build pure functions consuming the #1 tokens. *No renderer changed yet — add tests against existing snapshot output where shapes match.*
4. **Migrate content renderers onto the primitives.** cardGrid → slideHeader+cardStack+contentFrame; twoCols → same; table/timeline/quotes → slideHeader+contentFrame; stats/section/cta → heroFrame. *Now title anchor, content rail, header markup, padding all unify (closes RC2 findings). Run `pnpm test` snapshot diffs.*
5. **`slideTone` resolver (#6) in `buildSlidesMd.ts`.** Drive `--bg/--fg` per slide by role. *Composes on #1 tone pair + #4 migrated renderers. Closes RC4 polarity findings.*
6. **DSL field factories (#8 headerFieldSpecs, #9 cardArrayField, #10 emphasisFields) in `dsl.ts`/`_shared.ts`.** Refactor the 11 specs to call them. *Type-level only — run `pnpm generate:types` and diff `payload-types.ts` for zero drift; the A4-style assertion that `renderSchemaOf(spec)` matches the literal still holds.*
7. **StatementVariant (#11).** Add `variant` + `surface` (via #10 bundle) to `statementSpec`; switch `renderStatement` on `heroFrame` (from #5). Add one `promptMeta` line. `pnpm generate:types` + `pnpm generate:importmap`. *This is the payoff: 8 identical statements become varied, AI gets variety for free, draft route untouched.*
8. **Draft-prompt pacing rules** in `src/lib/draftPresentation.ts`: mandatory `Section` divider between topic groups, "no >2 consecutive identical blockTypes", body-length guard diverting long statements to twoCols/markdown, route quote-shaped statements to `quotes`.
9. **Tables + StatusPill (#P2 table work).** `tableVariant` field + `StatusPill` primitive — last because it reuses the variant-as-field pattern proven in step 7 and the token layer from step 1.

**Verification gates between steps:** `pnpm test` (snapshot renderers) after steps 3-5; `pnpm generate:types` clean diff after 6-7; `/preview` live-preview spot check (it shares `RENDERERS`) after 4 and 7; one `pnpm jobs:run`/`scripts/draft-smoke.mjs` build after 7-8. Per CLAUDE.md, set `req.context.skipBuildQueue` when patching from the build job/AI route.

**Why this order:** tokens (1) are read by primitives (3), which are consumed by renderers (4); tone (5) needs migrated renderers; the DSL factories (6) and variant model (7) sit on top because the renderer must already accept `heroFrame(scale/align/surface)` before the spec can offer a `variant` enum that selects them. Steps 1-5 are render/CSS-only (no schema change, no migration); steps 6-9 touch specs and require `generate:types`/`generate:importmap` but **no Payload migration** (the blocks array is unchanged; only `statement`/`table` field sets grow).
```

Plan complete. Key file anchors confirmed during analysis:
- Root cause RC1 lives in `/Users/joachimbrindeau/Development/expand/production/slides/src/export/blocks/statement.ts` (hardcoded `wrapSlide({layout:'center'})`) and `/Users/joachimbrindeau/Development/expand/production/slides/src/blocks/spec/statement.ts` (fields lack `surface`/`variant`).
- RC3 footer collision is concretely: `chrome.ts` `.k-slide-footer` (deck-level, `bottom:1.1rem`) vs `statement.ts:18-21` inline `K.foot` (`.k-foot { bottom:1.2rem }` in `style.css:489`) — two layers at the same Y.
- AA tokens to replace: `style.css` lines 259, 561, 573, 600, 627, 638 (opacity/rgba on text).
- DSL factory surface: `src/blocks/spec/dsl.ts` (`FieldSpec`, `optionalRender`/`optionalAi`) + `src/blocks/_shared.ts` (`eyebrowField`/`titleField`/`surfaceField`/`cardTitleDescFields` — L1 already shared, L2/L3 not).
- Variant-as-field projects through the existing `renderSchemaOf`/`aiSchemaOf`/`buildSystemPrompt` pipeline, so the draft route (`src/lib/draftPresentation.ts`) needs no schema edits — only prompt-pacing prose.