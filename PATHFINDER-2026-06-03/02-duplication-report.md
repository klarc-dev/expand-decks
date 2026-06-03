# 02 — Duplication Report

Synthesis of cross-feature hunter (subagent) + within-feature evidence (orchestrator grep, since the within-feature subagent returned no cited report and was not accepted). Every claim cites ≥2 `file:line`.

## Verdict legend
🔴 **Accidental** — consolidate. 🟡 **Structural** — one source-of-truth would help but needs care. 🟢 **Legitimate specialization** — leave alone.

---

## D1 🔴 `RENDERERS` map defined 3× (identical)
The same 9-key `Record<string,(block:never)=>string>` mapping blockType→renderer, byte-identical:
- `src/export/buildSlidesMd.ts:32-42`
- `src/app/(frontend)/preview/page.tsx:19-29`
- `src/components/SlidePreview.tsx:18-28`

**Why diverged:** none — copy-pasted when preview surfaces were added. **Consolidate:** export one `RENDERERS` (+ `SlideBlock` union) from `src/export/buildSlidesMd.ts` (or a new `src/export/renderers.ts`), import in all three.

## D2 🔴 `stripFrontmatter` + `extractLayout` defined 2× (identical logic)
- `preview/page.tsx:37-39` (`stripSlideFrontmatter`) & `:42-45` (`extractLayout`)
- `SlidePreview.tsx:30-32` (`stripFrontmatter`) & `:34-37` (`extractLayout`)

Same regex, only the strip fn is renamed. **Consolidate:** one `src/export/frontmatter.ts` exporting `stripFrontmatter` + `extractLayout`.

## D3 🔴 `sha256` helper defined 3× (identical)
`createHash('sha256').update(value).digest('hex')` repeated:
- `src/collections/ShareLinks.ts:7-9`
- `src/app/(frontend)/share/[token]/page.tsx:6-8`
- `src/app/(frontend)/share/[token]/spa/[...path]/route.ts:33-35`

**Consolidate:** one `src/utils/hash.ts` `sha256()`.

## D4 🔴 Share-link lookup + expiry repeated 2× (within share feature)
`page.tsx` and `spa/[...path]/route.ts` each independently: hash token → `find({where:{tokenHash:{equals:hash}}})` → expiry check `new Date(expiresAt) < new Date()`:
- lookup: `page.tsx:19-24` vs `route.ts:49-55`
- expiry: `page.tsx:41` vs `route.ts:63`

**Consolidate:** one `resolveShareLink(token): Promise<ShareLink | null>` returning the live (non-expired) link; both call sites reuse it. (Subsumes D3 for the share feature.)

## D5 🔴 Per-block `preview` UI field repeated 9× (identical)
Identical `{name:'preview',type:'ui',admin:{components:{Field:'/components/SlidePreview#default'}}}` in every block:
- `CoverBlock.ts:75`, `SectionBlock.ts:62`, `StatementBlock.ts:36`, `TwoColsBlock.ts:78`, `CardGridBlock.ts:69`, `StatsBlock.ts:57`, `QuotesBlock.ts:52`, `CtaBlock.ts:48`, `MarkdownBlock.ts:40`

**Consolidate:** a `previewField` constant (or `withPreview(fields)` helper) in a shared `src/blocks/_shared.ts`.

## D6 🔴 Shared block field definitions repeated across blocks
The same field objects are re-declared per block:
- **`eyebrow`** text field — `CoverBlock.ts:9`, `StatementBlock.ts:9`, `TwoColsBlock.ts:9`, `CardGridBlock.ts:9`, `StatsBlock.ts:9`, `QuotesBlock.ts:9`, `CtaBlock.ts:9` (7×)
- **`surface`** select — `CoverBlock.ts:40` (dark/light/gradient), `SectionBlock.ts:28` (dark/light), `StatsBlock.ts:22` (dark/light)
- **`image` + `imagePosition`** pair (incl. identical `condition: (_, s) => Boolean(s?.image)`) — `CoverBlock.ts:51-71`, `SectionBlock.ts:38-58`, `TwoColsBlock.ts:54-74`

**Consolidate:** field factories in `src/blocks/_shared.ts` (`eyebrowField`, `surfaceField({gradient?})`, `imageFields()`). Note `surface` legitimately varies on whether `gradient` is offered — a param, not a fork.

## D7 🔴 Renderer "optional fragment" pattern repeated ~8×
Every renderer hand-writes `block.X ? \`<div class="k-eyebrow …">${escape(block.X)}</div>\` : ''` with only the margin class differing:
- `cover.ts:24`, `twoCols.ts:23`, `cardGrid.ts:20`, `statement.ts:13`, `stats.ts:19`, `quotes.ts:19`, `cta.ts:15` (+ `section.ts` number variant)

And array-fragment `(items ?? []).map(...).join('\n\n')` repeated in `cardGrid.ts:33`, `twoCols.ts:60`, `quotes.ts:29`, `stats.ts:26`.

**Consolidate (light touch):** small helpers in `utils.ts` — `eyebrow(text, marginClass)` and keep the `.map().join()` inline (it's idiomatic; only the eyebrow helper is worth extracting). Don't over-abstract card markup — the three card shapes genuinely differ.

---

## D8 🟡 The "block shape" expressed 4× (structural — partial drift)
A single block is independently defined as: (i) Payload Block schema `src/blocks/<X>Block.ts`; (ii) `*BlockData` TS type + renderer `src/export/blocks/<x>.ts`; (iii) Zod schema `src/app/(payload)/api/draft-presentation/route.ts`; (iv) `SlideBlock` union `src/export/buildSlidesMd.ts:16-25`.

Evidence of **real drift** (not just representation):
- **cover** — Payload schema has `image`+`imagePosition` (`CoverBlock.ts:51-71`); renderer type has them (`cover.ts:11-12`); **Zod omits both** (`route.ts:9-17`). So AI-drafted covers can never carry an image.
- **twoCols** — same: `TwoColsBlock.ts:54-74` + `twoCols.ts:13-14` have image fields; **Zod omits them** (`route.ts:35-49`).
- **markdown** — exists as Block (`MarkdownBlock.ts`), type (`markdown.ts:1-6`), union member (`buildSlidesMd.ts:25`), but is **deliberately excluded** from the Zod union (`route.ts:108-117`).

**Verdict:** Layer (iv) is just a TS union of (ii) — not a true 4th copy, fold into (ii). Layers (i)/(ii)/(iii) serve different runtimes (Payload admin / pure renderer / LLM contract) so some divergence is legitimate — BUT the image-field omission in Zod looks **accidental** (a missed update when image support was added), and the field *names/enums* must stay in lockstep by hand today. This is the highest-leverage structural risk: it's exactly the "touch 6 places to add a block" invariant from `CLAUDE.md`. A single per-block descriptor that derives the renderer type + Zod schema (image fields included or explicitly excluded) would remove the silent-drift class. Treat as a *careful* refactor, not a mechanical dedup.

## D9 🟢 `parse.ts` + `types.ts` in `_reusable/` vs `src/export/`
Byte-identical pairs: `src/export/parse.ts` ≡ `_reusable/parse.ts`; `src/export/types.ts` ≡ `_reusable/types.ts`. `_reusable` is **excluded from tsconfig** (`tsconfig.json:23`) and **imported nowhere** in `src/` (grep returns none). **Verdict:** standalone reference copy outside the Next build; not live duplication. *Minor:* if it's truly dead, delete it; if it's a shared-lib seed, document why. Low priority — no runtime risk.

## D10 🟢 `wrapSlide` adds frontmatter / preview strips it back
`utils.ts:83-103` (`wrapSlide`) emits `---\nlayout…\n---` then preview removes it (`preview/page.tsx:37-39`, `SlidePreview.tsx:30-32`). **Verdict:** legitimate — the markdown string is the deliberate serialization contract shared with the Slidev build; preview renders HTML only and correctly discards Slidev-only frontmatter. (Consolidating the strip helper is D2; the asymmetry itself is correct.)

## D11 🟢 `context:{skipBuildQueue:true}` on every internal presentation patch
Set by AI draft (`route.ts:226`) and build job (`buildSlides.ts:79, 169, 185`); honored at `afterPresentationChange.ts:27`. **Verdict:** legitimate loop-breaker — both features patch presentations and must not requeue. Not a smell; it's the documented contract.

---

## Consolidation priority
| ID | Concern | Verdict | Effort | Risk if ignored |
|----|---------|---------|--------|-----------------|
| D8 | block shape drift (4×) | 🟡 structural | M–L | silent feature gaps (AI can't set images), 6-place edits |
| D1 | RENDERERS ×3 | 🔴 | S | renderer added to 1 surface, missing in others |
| D5/D6 | block field repetition ×9/×7 | 🔴 | S | inconsistent fields/labels across blocks |
| D2 | strip/extractLayout ×2 | 🔴 | S | preview parsers drift from export format |
| D3/D4 | sha256 ×3 + share lookup/expiry ×2 | 🔴 | S | security logic drift across share entry points |
| D7 | renderer eyebrow fragment ×8 | 🔴 | S | cosmetic; low risk |
| D9/D10/D11 | _reusable, wrap/strip, skipBuildQueue | 🟢 | — | leave |
