# 04 — Handoff Prompts

One ready-to-run `/make-plan` prompt per unified system from `03-unified-proposal.md`. Copy a block directly into `/make-plan`. Systems A–C are independent and can run in any order; do System B before/with D so the field kit and zod fragments land together. Each must keep `pnpm test` green (`src/export/__tests__/*`) and re-run `pnpm generate:types` / `pnpm generate:importmap` where noted.

---

## System A — Single render core

```
/make-plan Consolidate the slide render core so the RENDERERS map and the per-slide frontmatter helpers exist in exactly one place.

Target component: src/export/ — keep src/export/buildSlidesMd.ts canonical; add src/export/preview.ts exporting one function `renderBlockPreview(block: SlideBlock): { html: string; layout: string }`.

Exact changes:
1. In src/export/buildSlidesMd.ts:16-42, export the `SlideBlock` union and the `RENDERERS` map (currently module-private).
2. Create src/export/preview.ts with renderBlockPreview(): call RENDERERS[block.blockType]; if missing return null/skip; else strip the per-slide frontmatter and extract the layout. Move these regexes here ONCE: /^---\n[\s\S]*?\n---\n*/ (strip) and /^---\n[\s\S]*?layout:\s*(\S+)/ (extract layout, default 'default').
3. Rewrite call sites to import from the export module and delete their local copies:
   - src/app/(frontend)/preview/page.tsx:19-29 (local RENDERERS), :37-39 (stripSlideFrontmatter), :42-45 (extractLayout), :47-56 (renderSlides) → use renderBlockPreview.
   - src/components/SlidePreview.tsx:18-28 (local RENDERERS), :30-32 (stripFrontmatter), :34-37 (extractLayout), :45-50 (inline render) → use renderBlockPreview.

Flowchart reference: PATHFINDER-2026-06-03/01-flowcharts/preview.md and markdown-export.md (the 3-copy table).

Anti-pattern guards: do NOT introduce a renderer registry/factory or plugin system — a plain exported Record is sufficient. Do NOT add a new abstraction layer; this is deletion + one helper. Preview output must remain byte-identical to today. Note SlidePreview.tsx is a client component referenced via importMap — keep the import graph buildable (preview.ts must be import-safe from a 'use client' file: no node-only APIs).
```

---

## System B — Shared block field kit

```
/make-plan Extract the repeated Payload block field definitions into one shared kit and one renderer helper, then compose every block from it.

Target component: new src/blocks/_shared.ts (plain exported field objects/factories — NOT a base class or block framework) + a small `eyebrow()` helper in src/export/utils.ts.

Exact changes:
1. Create src/blocks/_shared.ts exporting: `previewField` (the {name:'preview',type:'ui',admin:{components:{Field:'/components/SlidePreview#default'}}} object), `eyebrowField`, `surfaceField(opts?: {gradient?: boolean})` (dark/light, plus gradient when opts.gradient), and `imageFields()` returning [image upload (relationTo:'media'), imagePosition select with condition (_,s)=>Boolean(s?.image)].
2. Replace the duplicated fields:
   - preview field (9×): CoverBlock.ts:75, SectionBlock.ts:62, StatementBlock.ts:36, TwoColsBlock.ts:78, CardGridBlock.ts:69, StatsBlock.ts:57, QuotesBlock.ts:52, CtaBlock.ts:48, MarkdownBlock.ts:40 → previewField.
   - eyebrow (7×): CoverBlock.ts:9, StatementBlock.ts:9, TwoColsBlock.ts:9, CardGridBlock.ts:9, StatsBlock.ts:9, QuotesBlock.ts:9, CtaBlock.ts:9 → eyebrowField.
   - surface: CoverBlock.ts:40 → surfaceField({gradient:true}); SectionBlock.ts:28 + StatsBlock.ts:22 → surfaceField().
   - image+imagePosition: CoverBlock.ts:51-71, SectionBlock.ts:38-58, TwoColsBlock.ts:54-74 → ...imageFields().
3. Add `eyebrow(text, marginClass='mb-8')` to src/export/utils.ts and replace the 8 renderer ternaries: cover.ts:23-25 (mb-8), twoCols.ts:22-24 (mb-6), cardGrid.ts:19-21 (mb-4), statement.ts:12-14 (mb-8), stats.ts:18-20 (mb-10), quotes.ts:18-21 (mb-4), cta.ts:14-16 (k-eyebrow-dark mb-10 — keep extra class via param or leave inline). Preserve each block's exact margin/extra classes.

Flowchart reference: PATHFINDER-2026-06-03/01-flowcharts/content-authoring.md and 02-duplication-report.md D5/D6/D7.

Anti-pattern guards: do NOT create a block base-class or inheritance hierarchy — these are field factories returning plain config. Do NOT force the divergent card markup (cardGrid vs twoCols rightCards vs quotes) into a shared component; leave those inline. Keep field labels/descriptions/order identical so the admin UI and generated types are unchanged. Run `pnpm generate:types` and `pnpm generate:importmap` after; keep `pnpm test` green.
```

---

## System C — Share-link resolver

```
/make-plan Consolidate share-link token hashing and validation into one module used by all three share entry points.

Target component: new src/lib/shareLinks.ts exporting `sha256(value: string): string`, `resolveShareLink(payload, token: string): Promise<ShareLink | null>` (hash + find by tokenHash + return doc), and `isLive(link): boolean` (expiry check `new Date(link.expiresAt) >= new Date()`).

Exact changes:
1. ShareLinks.ts:7-9 — delete local sha256, import from src/lib/shareLinks.ts (beforeChange still calls sha256 at :29).
2. src/app/(frontend)/share/[token]/page.tsx — delete sha256 (:6-8); replace the lookup (:17-24) with resolveShareLink and the expiry (:41) with isLive. Preserve the TWO distinct UX messages: link == null ⇒ "Lien invalide"; link && !isLive ⇒ "Lien expiré". Keep the viewCount++/lastViewedAt update (:55-63).
3. src/app/(frontend)/share/[token]/spa/[...path]/route.ts — delete sha256 (:33-35); replace lookup (:47-55) + expiry (:63) with resolveShareLink+isLive ⇒ 403 for both. Keep the path-traversal guards (:78-87) and MIME serving (:92-102) untouched.

Flowchart reference: PATHFINDER-2026-06-03/01-flowcharts/share-links.md and 02-duplication-report.md D3/D4.

Anti-pattern guards: do NOT change the security model — only deduplicate. tokenHash stays sha256-hex; token entropy (randomBytes(32)) unchanged. resolveShareLink must use overrideAccess:true exactly as today (page.tsx:23, route.ts:53). Do NOT add caching. The page keeps invalid-vs-expired distinction; the route keeps single-403.
```

---

## System D — Close block-shape drift (targeted)

```
/make-plan Eliminate the silent drift between the Payload block schemas and the AI-draft Zod schemas, without introducing block codegen.

Target component: src/app/(payload)/api/draft-presentation/route.ts (the LLM contract / single source of the draftable block shape) plus shared zod fragments mirroring System B's field kit.

Exact changes:
1. CORRECTNESS FIX: cover and twoCols support image/imagePosition in the Block schema (CoverBlock.ts:51-71, TwoColsBlock.ts:54-74) and renderer types (cover.ts:11-12, twoCols.ts:13-14) but the Zod schemas omit them (route.ts:9-17 coverSchema, :35-49 twoColsSchema). Decide with the user: either add `image`/`imagePosition` to those Zod schemas so AI drafts can set images, OR add an explicit comment documenting the intentional exclusion. Default recommendation: document exclusion (images are uploaded by hand in admin), since the SlidePreview/image flow needs a media id, not a URL the LLM can invent.
2. Add shared zod fragments in route.ts — eyebrowZod, surfaceZod({gradient}), and (if 1 chose inclusion) imageZod — paired 1:1 with src/blocks/_shared.ts factories, and build each block schema from them. Keep schemas hand-written and explicit per block.
3. Confirm the markdown block stays excluded from slideBlockSchema (route.ts:108-117) — that exclusion is intentional (admin-only block); add a one-line comment.
4. Fold the SlideBlock union (buildSlidesMd.ts:16-25) consideration: it derives from the renderer *Data types, so it is not a true 4th copy — no change needed beyond System A's export.

Flowchart reference: PATHFINDER-2026-06-03/01-flowcharts/ai-draft-generation.md and 02-duplication-report.md D8.

Anti-pattern guards: do NOT build a single BlockDescriptor that generates Payload fields + TS types + Zod for 9 stable blocks — that abstraction would be more code than it removes and hide the admin config (rejected in 03-unified-proposal.md). Keep three explicit runtime representations; only remove the *drift* and share the small field fragments. Verify the draft route still returns valid blocks the renderers accept (round-trip via buildSlidesMd, covered by src/export/__tests__/buildSlidesMd.test.ts).
```
