# Plan — Duplication Consolidation (Systems A–D)

**Date:** 2026-06-03
**Source:** `PATHFINDER-2026-06-03/03-unified-proposal.md` + `04-handoff-prompts.md`
**Goal:** Remove the accidental duplications (RENDERERS ×3, strip/extractLayout ×2, sha256 ×3, per-block field repetition, renderer eyebrow ×8) and close the Zod block-shape drift — via **deletion + small shared exports**, no new abstraction layers.

Execution order: **Phase 1 (B+D) → Phase 2 (A) → Phase 3 (C) → Phase 4 (verify)**. Each phase is self-contained for a fresh context.

---

## Phase 0 — Discovery findings (READ FIRST; these are the facts each phase relies on)

### Allowed APIs / patterns (verified against source)
- Payload field config: `import type { Block, Field } from 'payload'`. Blocks today use inline field literals; **no** block imports `Field` yet. Factories return `Field` / `Field[]`.
- Pure render core: `src/export/utils.ts` and all 9 `src/export/blocks/*.ts` import **only** from `../utils` — **no node-only imports**. Safe for client bundles.
- `src/export/buildSlidesMd.ts:1-3` imports `node:fs`, `node:path`, `node:url` (for `loadHeadmatter`). **Anything a `'use client'` file imports must NOT transitively reach this file.**
- Scripts (`package.json`): `test` = `vitest run`; `generate:types` = `payload generate:types`; `generate:importmap` = `payload generate:importmap`.

### Bundle-safety conclusion (drives Phase 2 design)
The RENDERERS map is duplicated in 3 files **on purpose**: `preview/page.tsx` and `SlidePreview.tsx` are `'use client'` and import renderers directly from `@/export/blocks/*`, bypassing `buildSlidesMd.ts` to keep `node:fs` out of the browser bundle. **Therefore the consolidated map must live in a new node-free module, not be re-exported from `buildSlidesMd.ts`.**

### Exact field-text variants (drives Phase 1 factory signatures)
| Field | Identical? | Override needed |
|---|---|---|
| `preview` (9×) | byte-identical | none → constant |
| `imagePosition` (3×) | byte-identical (incl. `condition`) | none → constant inside `imageFields()` |
| `eyebrow` (7×) | 3 description variants | `description?` param. Default `'Texte court au-dessus du titre'`. Cover = `'Texte court au-dessus du titre principal'`. TwoCols = `'Texte court au-dessus du titre (ex. "01 · Conseil financier")'`. |
| `surface` (3×) | Cover has extra `gradient` option | `surfaceField({ gradient?: boolean })`. label `'Surface'`, defaultValue `'dark'`, description `'Apparence de fond de la diapositive'`, options Sombre/Clair (+ Dégradé/gradient when flag). |
| `image` (3×) | TwoCols description differs | `description?` param. Default (Cover/Section) = `'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)'`. TwoCols appends `'. Remplace les rightCards si renseignée.'` |

### Tests that must stay green (no edits to test files)
- `src/export/__tests__/blocks.test.ts` — imports renderers directly from `../blocks/*` and `escape`/`md` from `../utils`. Unaffected by any phase as long as those modules keep their exports.
- `src/export/__tests__/buildSlidesMd.test.ts` — imports `buildSlidesMd`, `Presentation` from `../buildSlidesMd` and `parseDeck` from `../parse`. Full-deck test (line ~124) includes a `markdown` block → `SlideBlock` union and `RENDERERS` **must keep `markdown`**.

---

## Phase 1 — System B (shared field kit) + System D (close Zod drift)

### 1A. Create `src/blocks/_shared.ts` (new file)
Plain exported field factories — **no base class, no inheritance**. Reproduce the verbatim text from Phase 0.
```ts
import type { Field } from 'payload';

export const previewField: Field = {
  name: 'preview',
  type: 'ui',
  admin: { components: { Field: '/components/SlidePreview#default' } },
};

export const eyebrowField = (description = 'Texte court au-dessus du titre'): Field => ({
  name: 'eyebrow', type: 'text', label: 'Accroche', admin: { description },
});

export const surfaceField = (opts?: { gradient?: boolean }): Field => ({
  name: 'surface', type: 'select', label: 'Surface', defaultValue: 'dark',
  admin: { description: 'Apparence de fond de la diapositive' },
  options: [
    { label: 'Sombre', value: 'dark' },
    { label: 'Clair', value: 'light' },
    ...(opts?.gradient ? [{ label: 'Dégradé', value: 'gradient' }] : []),
  ],
});

export const imageFields = (
  description = 'Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)',
): Field[] => ([
  { name: 'image', type: 'upload', relationTo: 'media', label: 'Image', admin: { description } },
  {
    name: 'imagePosition', type: 'select', label: 'Position de l’image', defaultValue: 'right',
    admin: {
      description: 'Côté où l’image s’affiche quand une image est renseignée',
      condition: (_, siblingData) => Boolean(siblingData?.image),
    },
    options: [ { label: 'Droite', value: 'right' }, { label: 'Gauche', value: 'left' } ],
  },
]);
```
**Verify the `'image'` apostrophe characters match the originals exactly** (the source uses the typographic `’` in `Position de l’image` / `s’affiche` and the `;` spacing in the image description). Copy from `CoverBlock.ts:52-71`, `TwoColsBlock.ts:55-74`.

### 1B. Rewrite the 9 block files to compose from the kit
For each, replace the inline fields, **preserving field order**:
- `preview` field → `previewField`: Cover:73-76, Section:60-63, Statement:34-37, TwoCols:76-79, CardGrid:67-70, Stats:55-58, Quotes:50-53, Cta:46-49, Markdown:38-41.
- `eyebrow` (Cover:9-13 → `eyebrowField('Texte court au-dessus du titre principal')`; TwoCols:9-13 → `eyebrowField('Texte court au-dessus du titre (ex. "01 · Conseil financier")')`; Statement/CardGrid/Stats/Quotes/Cta:9-13 → `eyebrowField()`).
- `surface` (Cover:40-50 → `surfaceField({ gradient: true })`; Section:28-37 & Stats:22-31 → `surfaceField()`).
- `image`+`imagePosition` (Cover:52-71 → `...imageFields()`; Section:39-58 → `...imageFields()`; TwoCols:55-74 → `...imageFields('Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left). Remplace les rightCards si renseignée.')`).

Use array spread inside the `fields: [...]` arrays so `...imageFields()` expands in place at the original position.

### 1C. Add `eyebrow()` renderer helper to `src/export/utils.ts`
```ts
export function eyebrow(text: string | null | undefined, marginClass = 'mb-8'): string {
  return text ? `\n<div class="k-eyebrow ${marginClass}">${escape(text)}</div>` : '';
}
```
Replace the 8 renderer ternaries **preserving each one's exact whitespace, margin class, and extra classes** — NOTE these are NOT all identical, so audit each before replacing:
- `statement.ts:12-14` → `eyebrow(block.eyebrow)` (mb-8, leading `\n`). Matches helper default.
- `twoCols.ts:22-24` → `eyebrow(block.eyebrow, 'mb-6')`.
- `cardGrid.ts:19-21` → indentation is `\n    <div ...>` (4 spaces) → **keep inline OR** extend helper with indent; simplest: leave cardGrid inline (its markup is indented differently). Document the skip.
- `quotes.ts:18-21` → also `\n    ` indented → leave inline or handle.
- `cover.ts:23-25` → `\n      ` (6-space indent) + `mb-8` → leave inline (cover is full-bleed, distinct indentation).
- `stats.ts:18-20` → `eyebrow(block.eyebrow, 'mb-10')`.
- `cta.ts:14-16` → has extra class `k-eyebrow-dark` and multi-line inner whitespace → **leave inline** (extra class).
**Decision:** only convert the three that match the helper's exact shape (`statement`, `twoCols` with mb-6, `stats` with mb-10). Leave `cover`, `cardGrid`, `quotes`, `cta` inline — forcing their distinct indentation/extra-class into the helper would add params "for flexibility" (anti-pattern). Record this in the phase summary.

### 1D. System D — Zod fragments + fix drift in `src/app/(payload)/api/draft-presentation/route.ts`
- Add shared fragments near the top of the schema section mirroring the field kit:
```ts
const eyebrowZod = z.string().optional();
const surfaceZod = (gradient: boolean) =>
  z.enum(gradient ? ['dark', 'light', 'gradient'] : ['dark', 'light']).optional();
// images use a Payload media id, not an LLM-inventable URL → intentionally NOT draftable
```
- Rebuild `coverSchema` (`:9-17`), `sectionSchema`, `statsSchema` to use `surfaceZod(true/false)` and `eyebrowZod`; keep each schema object explicit.
- **Fix the documented drift:** above `coverSchema` and `twoColsSchema`, add a comment: `// image/imagePosition are intentionally omitted from AI drafting — they require an uploaded media id, not an LLM-generated value; authors add images in the admin.` (Recommended: document, do NOT add image fields to Zod.)
- Above `slideBlockSchema` (`:108-117`), add: `// markdown is intentionally excluded — it is an admin-only escape-hatch block, not AI-draftable.`

### Phase 1 verification checklist
- [ ] `pnpm test` green (block renderer + buildSlidesMd tests unchanged).
- [ ] `pnpm generate:types` runs clean; `git diff src/payload-types.ts` shows **no change** (field labels/descriptions/order identical).
- [ ] `pnpm generate:importmap` runs clean; `git diff` on `importMap.js` shows no change (still references `/components/SlidePreview#default`).
- [ ] `grep -rn "name: 'preview'" src/blocks` → only inside `_shared.ts`.
- [ ] `grep -rn "Apparence de fond" src/blocks` → only inside `_shared.ts`.
- [ ] Manual: open one block of each kind in admin — labels/descriptions/conditions render identically.

### Phase 1 anti-pattern guards
- NO block base-class/inheritance — factories return plain `Field`/`Field[]`.
- Do NOT force cardGrid/twoCols/quotes card markup into shared components.
- Do NOT add image fields to the Zod schemas (document the exclusion instead).
- Field order and every label/description string must be byte-identical (typographic `’`, `·`, `;` spacing).

---

## Phase 2 — System A (single render core, node-free)

### 2A. Create `src/export/renderers.ts` (new, node-free module)
Move the `SlideBlock` union (currently `buildSlidesMd.ts:16-25`) and the `RENDERERS` map (`:32-42`) here. Import the 9 renderers + their `*BlockData` types from `./blocks/*` (those are pure — verified). Export both.
```ts
import { renderCover, type CoverBlockData } from './blocks/cover';
// …8 more…
export type SlideBlock = CoverBlockData | … | MarkdownBlockData;
export const RENDERERS: Record<string, (block: never) => string> = { cover: renderCover as …, … };
```
**Must keep all 9 keys including `markdown`** (buildSlidesMd full-deck test depends on it).

### 2B. Create `src/export/preview.ts` (new, node-free)
One function; the strip/extract regexes live here ONCE (copy from `preview/page.tsx:37-45`):
```ts
import { RENDERERS, type SlideBlock } from './renderers';
export function renderBlockPreview(block: SlideBlock): { html: string; layout: string } | null {
  const renderer = RENDERERS[(block as { blockType: string }).blockType];
  if (!renderer) return null;
  const md = renderer(block as never);
  const html = md.replace(/^---\n[\s\S]*?\n---\n*/, '');
  const layout = md.match(/^---\n[\s\S]*?layout:\s*(\S+)/)?.[1] ?? 'default';
  return { html, layout };
}
```
**No node imports** — only string ops, so it's client-safe.

### 2C. Update `src/export/buildSlidesMd.ts`
Replace the local `SlideBlock` union + `RENDERERS` literal with `import { RENDERERS, type SlideBlock } from './renderers';`. Keep `Presentation` type and `buildSlidesMd()` exactly as-is (public API unchanged → tests pass). It still imports `node:fs` for `loadHeadmatter` — fine, it's server-only.

### 2D. Rewrite the two client surfaces to use `renderBlockPreview`
- `src/app/(frontend)/preview/page.tsx`: delete local `RENDERERS` (19-29), `stripSlideFrontmatter` (37-39), `extractLayout` (42-45), and inline `renderSlides` mapping (47-56); import `renderBlockPreview` from `@/export/preview` and `SlideBlock` from `@/export/renderers`. `renderSlides` becomes `slides.map(renderBlockPreview).filter(Boolean)`. Keep all styling/JSX.
- `src/components/SlidePreview.tsx`: delete local `RENDERERS` (18-28), `stripFrontmatter` (30-32), `extractLayout` (34-37); replace inline render (45-50) with `const res = renderBlockPreview(data as never); if (!res) return null; const { html, layout } = res;`. Keep `useForm`/`getSiblingData` and styling.
- Both keep `import '@/export/style.css'`.

### Phase 2 verification checklist
- [ ] `pnpm test` green (buildSlidesMd public API + unknown-block throw still work; markdown still in union).
- [ ] `pnpm build` succeeds — **proves no `node:fs` leaked into client bundle** (the key risk). If build fails with a node-module-in-browser error, `preview.ts`/`renderers.ts` accidentally imported `buildSlidesMd.ts`.
- [ ] `grep -rn "const RENDERERS" src` → exactly ONE match (`renderers.ts`).
- [ ] `grep -rn "stripFrontmatter\|stripSlideFrontmatter\|extractLayout" src` → only inside `preview.ts`.
- [ ] `grep -n "node:" src/export/preview.ts src/export/renderers.ts` → no matches.
- [ ] `pnpm generate:importmap` clean (SlidePreview still wired).

### Phase 2 anti-pattern guards
- NO renderer registry/factory/plugin system — a plain exported `Record` is the consolidation.
- `renderers.ts` and `preview.ts` MUST NOT import `buildSlidesMd.ts` (would reintroduce `node:fs` in client).
- Preview HTML output must be byte-identical to today (same regexes).

---

## Phase 3 — System C (share-link resolver)

### 3A. Create `src/lib/shareLinks.ts` (new file)
```ts
import { createHash } from 'node:crypto';
import type { Payload } from 'payload';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function isLive(link: { expiresAt: string | Date }): boolean {
  return new Date(link.expiresAt) >= new Date();
}
export async function resolveShareLink(payload: Payload, token: string, depth = 0) {
  const { docs } = await payload.find({
    collection: 'share-links',
    where: { tokenHash: { equals: sha256(token) } },
    limit: 1, overrideAccess: true, depth,
  });
  return docs[0] ?? null;
}
```
(Server-only module — `node:crypto` is fine here; nothing client imports it.)

### 3B. Rewrite the three call sites (security model UNCHANGED)
- `src/collections/ShareLinks.ts:7-9`: delete local `sha256`, `import { sha256 } from '@/lib/shareLinks'`. `beforeChange` (`:29`) keeps calling `sha256(token)`.
- `src/app/(frontend)/share/[token]/page.tsx`: delete `sha256` (6-8). Replace lookup (17-24) with `const link = await resolveShareLink(payload, token)`; keep the **two distinct messages** — `!link` ⇒ "Lien invalide"; `link && !isLive(link)` ⇒ "Lien expiré" (was `:41`). Keep `viewCount++`/`lastViewedAt` update (55-63) and the iframe.
- `src/app/(frontend)/share/[token]/spa/[...path]/route.ts`: delete `sha256` (33-35). Replace lookup (47-55) with `const link = await resolveShareLink(payload, token, 1)` (depth:1 — it reads `link.presentation.slug`); collapse missing+expired to single `403` (`!link || !isLive(link)`). **Keep path-traversal guards (78-87) and MIME serving (92-102) untouched.**

### Phase 3 verification checklist
- [ ] `grep -rn "function sha256" src` → zero matches (all import from `@/lib/shareLinks`).
- [ ] `grep -rn "createHash('sha256')" src` → only inside `src/lib/shareLinks.ts`.
- [ ] `pnpm build` succeeds.
- [ ] Manual: create a share link in admin → open `/share/<token>` (renders) → open with bad token (Lien invalide) → set `expiresAt` in past (Lien expiré) → SPA asset path with `..` still 403.
- [ ] `viewCount` still increments on page view.

### Phase 3 anti-pattern guards
- Do NOT change token entropy (`randomBytes(32)`), hashing (`sha256` hex), or `overrideAccess: true`.
- Do NOT add caching to `resolveShareLink`.
- Keep page's invalid-vs-expired UX; keep route's single-403.

---

## Phase 4 — Final verification

1. `pnpm test` → all green (no test files were edited).
2. `pnpm build` → succeeds (client bundle clean of `node:fs`/`node:crypto`).
3. `pnpm generate:types && git diff --exit-code src/payload-types.ts` → no schema drift.
4. `pnpm generate:importmap && git diff --exit-code src/app/(payload)/admin/importMap.js` → unchanged.
5. Duplication greps all pass (one RENDERERS, one sha256, one strip/extractLayout, preview/eyebrow/surface/image only in `_shared.ts`).
6. Spot-check admin: each block's fields render with identical labels/descriptions; per-block preview + `/preview` live preview render identically to pre-refactor.
7. Confirm `route.ts` carries the two documenting comments (image exclusion, markdown exclusion).

### Net result
3 RENDERERS→1, 2 strip/extract→0 standalone, 3 sha256→1, 9 preview fields + repeated eyebrow/surface/image→1 kit, 3 renderer eyebrows→helper (4 left inline by design), Zod drift documented + fragment-shared. Mostly deletion; one new node-free `renderers.ts`/`preview.ts`, one `_shared.ts`, one `src/lib/shareLinks.ts`. No new abstraction layers, no codegen.
