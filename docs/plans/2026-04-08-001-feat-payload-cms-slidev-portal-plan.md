---
title: "feat: Payload CMS presentation portal with Slidev export"
type: feat
status: active
date: 2026-04-08
origin: PRD.md
---

# Payload CMS Presentation Portal with Slidev Export

## Stack Decision

**This plan supersedes the PRD §1 stack decision.** The PRD recommended forking `allweonedev/presentation-ai` as the primary path. After evaluation, the fork was rejected in favor of Payload CMS because:

1. The user explicitly chose Payload CMS + `@ai-stack/payloadcms` over the fork
2. The presentation-ai fork (15k lines, Plate.js + Prisma + NextAuth + LangChain) requires deep understanding of an opinionated codebase to constrain and extend
3. Payload CMS provides the same building blocks (Blocks field, admin UI, auth, Jobs Queue) with clearer documentation and a simpler customization surface
4. The PRD itself listed Payload as a viable fallback (§12) and the entire data model (§7) was already written in Payload collection terms

**The PRD should be updated to reflect this decision** before implementation. The effort estimate increases from "~1 week" (fork path) to "~2-3 weeks" (Payload from scratch), because we are building block schemas, renderers, and the build pipeline ourselves rather than constraining existing code.

## Overview

Build a Payload CMS 3.x application that implements the PRD's vision: an internal presentation portal where the Expand team creates slide decks via typed block fields, Claude AI assists with drafting/rewriting, and a builder worker deterministically exports blocks to Slidev markdown → SPA + PDF. Self-hosted on Coolify.

## Problem Frame

Slidev is developer-first. The Expand team (lawyers, accountants, IP consultants) cannot create, browse, or share presentations without Joachim manually building each deck. The PRD identifies that Slidev has no hosted editor, no cloud, no collaboration layer. The solution: layer a proper CMS (Payload) on top, keep Slidev as the renderer, and let typed blocks + deterministic export bridge the two. See `PRD.md` sections 1–5 for full context.

## Requirements Trace

- R1. Team browses all presentations with thumbnails, titles, clients, dates (PRD §5 Browsing) — Units 2, 4
- R2. Team creates decks via typed block fields — no markdown, no YAML, no Vue (PRD §3 Goals #2) — Unit 2
- R3. Same blocks always produce the same `slides.md` — deterministic template export (PRD §3 Goals #3) — Unit 3
- R4. Builder worker: blocks → slides.md → `slidev build` → SPA + PDF → upload to storage (PRD §7 Builder Worker) — Unit 4
- R5. Claude AI per-field drafting/rewriting via payload-ai plugin (PRD §9). **Note:** The PRD's MVP success test ("Claude drafts the blocks from a brief") requires deck-level AI drafting that payload-ai does not provide. Per-field Compose/Proofread/Translate is delivered in Unit 5. Deck-level "Draft from Brief" is delivered in Unit 5b as a custom endpoint. — Units 5, 5b
- R6. French-language admin UI including custom block field labels (PRD §6 Language) — Units 1, 2
- R7. External sharing via signed, expiring links with pre-signed SPA URLs (PRD §5 Sharing externally) — Unit 7
- R8. Self-hosted on Coolify with docker-compose (PRD §8) — Unit 8
- R9. Klarc theme pack — output visually matches existing Klarc deck (PRD §3 Goals #8) — Unit 3
- R10. Auth for 5–10 team members, email/password MVP (PRD §6 Auth) — Unit 1

## Scope Boundaries

- No WYSIWYG visual slide editing (editing happens on the typed form)
- No LLM in the build hot path (Claude is on-demand for drafting/rewriting, not in the export pipeline)
- No PPTX round-trip
- No Google Workspace OIDC (v1.1)
- No commenting (v1.1) — interim review workflow: team uses Slack threads referencing slide numbers until v1.1 adds native comments
- No deck requests (v1.1)
- No Proof SDK integration (v1.2)
- No MCP plugin (v1.1) — deferred alongside Claude agent features
- No version history — MVP stores only current build artifacts (pdfFile, spaUrl, coverImage). Version history with retention policy added in v1.1
- Concurrent editing is document-level last-write-wins (Payload's default). Acceptable for 5-10 users where simultaneous editing of the same deck is rare

## Resolved PRD Contradictions

The PRD contains conflicting statements about AI in MVP:
- §3 Non-goals: "LLM-in-the-loop assembly for MVP. AI drafting is v1.1."
- §1: "Claude — core, not optional."
- §9 Success test: "Claude drafts the blocks from a brief."

**Resolution:** Both per-field AI (plugin) AND deck-level "Draft from Brief" (custom endpoint) are in MVP scope. The §3 non-goal about "LLM-in-the-loop assembly" refers to the build pipeline (no AI in the hot path), not the drafting step. Drafting is on-demand, not in the build loop.

## Context & Research

### Relevant Code and Patterns

- **Klarc theme**: `../work/tasks/2026-04-07-klarc-slidev/style.css` (374 lines) and `slides.md` (667 lines, 12 slides using `center` and `default` layouts)
- **Slidev parser** (reusable): current repo's `src/libs/slidev/parse.ts` — 80 lines, well-tested. **Must be extracted before repo cleanup in Unit 1.**
- **Payload 3.x (v3.82.0)**: runs inside Next.js, Blocks field for polymorphic content, built-in Jobs Queue, native auth with roles, i18n admin UI, Live Preview for real-time form preview
- **@ai-stack/payloadcms v3.2.26**: per-field Claude-powered Compose/Proofread/Translate/Rephrase on Lexical RichText fields. Uses `@ai-sdk/anthropic`. Note: bundles stale `ai@5.1.0-beta.9`
- **Payload Jobs Queue**: built-in task/worker system. Define tasks in config, queue from `afterChange` hooks, run via `pnpm payload jobs:run`

### External References

- Payload CMS 3.x Blocks field docs: https://payloadcms.com/docs/fields/blocks
- Payload Jobs Queue docs: https://payloadcms.com/docs/jobs-queue/overview
- Payload Live Preview: https://payloadcms.com/docs/live-preview/overview
- payload-ai plugin: https://github.com/ashbuilds/payload-ai
- Slidev export CLI: https://sli.dev/guide/exporting

## Key Technical Decisions

- **Payload CMS over presentation-ai fork**: See Stack Decision section above.
- **Payload Jobs Queue with separate worker process in production**: The builder worker runs `slidev build` (Vite SSG) + `slidev export` (Playwright/Chromium), which are CPU- and memory-intensive. Running in-process would block the admin UI. Production uses a separate `pnpm payload jobs:run` process (same Docker image, different CMD). Dev uses `autoRun: true` for convenience.
- **Local filesystem for MVP storage, not MinIO**: Payload's default disk storage is sufficient for 5-10 users. Avoids MinIO infrastructure complexity. SPAs served via a catch-all Next.js route. Swap to Cloudflare R2 or MinIO when geographic distribution or scale justifies it.
- **Build on Publish only, not every save**: Full `slidev build` + PDF export runs only when status changes to "published" (explicit action), not on every save. Saves update only the block data. A lightweight Live Preview renders the block HTML in real-time during editing for instant feedback.
- **Deterministic template export**: `buildSlidesMd()` is a pure function: same blocks → same `slides.md`. Build artifact determinism (same SPA/PDF byte-for-byte) is NOT guaranteed due to Vite/Chromium variability.
- **Flat block renderers for MVP**: All renderers live in `src/export/blocks/` with a single `style.css`. No theme dispatch abstraction until a second theme is needed (v1.1).
- **Pre-signed URLs for SPA access**: Built SPAs stored in a non-public directory. Share page generates a time-limited pre-signed URL (or serves via authenticated proxy route) so share-link expiry is enforced at the storage level.

## Security Decisions

- **Shell injection prevention**: All shell commands use `execFile` with argument arrays (never string interpolation). Presentation `slug` validated as `^[a-z0-9-]{1,64}$` at the collection level.
- **MarkdownBlock XSS**: MarkdownBlock restricted to `admin` role via Payload field-level access control. Authors and viewers cannot create or edit raw markdown blocks.
- **Block renderer escaping**: All user-provided text is HTML-escaped before insertion into Slidev templates. An `escape()` utility handles `<>&"'`. A `md()` utility converts simple inline markdown to HTML while escaping the rest.
- **Share link tokens**: Stored as SHA-256 hashes in the database. Token comparison via hash lookup prevents timing attacks and limits exposure from DB breaches.
- **API key management**: `ANTHROPIC_API_KEY` and S3 credentials injected via Coolify secrets, never baked into Docker images. Builder worker subprocess environment is stripped of API keys not needed by Slidev.

## Open Questions

### Resolved During Planning

- **Auth provider**: Payload native auth (email/password). No external provider for MVP.
- **Object storage**: Local filesystem for MVP. Cloudflare R2 for production scale (PRD §10 Q7).
- **Database**: PostgreSQL via `@payloadcms/db-postgres`.
- **Block field or collection?**: Blocks field on the Presentations collection.
- **Build trigger**: On explicit "Publish" action only (status → published), not every save.
- **SPA access control**: Pre-signed URLs generated at share-page request time, not public-read bucket.

### Deferred to Implementation

- Exact Slidev version compatibility with the Klarc theme CSS — validate in Unit 3 by building the reference deck
- Whether `slidev build` needs specific Vite config for SSG in a Docker environment — validate in Unit 1 Dockerfile
- Benchmark actual `slidev build` + `slidev export` time on the Klarc reference deck in Docker

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
┌──────────────────────────────────────────────────────────────────┐
│                         Coolify host                              │
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │      Payload CMS (Next.js 15+)       │                        │
│  │                                       │                        │
│  │  Collections:                         │                        │
│  │    Presentations (slides: Block[])    │                        │
│  │    Clients                            │                        │
│  │    Media (uploads → local disk)       │                        │
│  │    ShareLinks                         │                        │
│  │    Users (auth)                       │                        │
│  │                                       │                        │
│  │  Plugins:                             │                        │
│  │    @ai-stack/payloadcms (Claude AI)   │                        │
│  │                                       │                        │
│  │  Live Preview ──► HTML preview route  │                        │
│  │                                       │                        │
│  │  afterChange (status=published) ──►   │                        │
│  │    Jobs Queue                         │                        │
│  └─────────┬─────────────────────────────┘                        │
│            │                                                      │
│  ┌─────────▼─────────────────────────────┐                        │
│  │  Builder Worker (same image, jobs:run)│                        │
│  │    1. buildSlidesMd()                 │                        │
│  │    2. slidev build (in slidev-ws/)    │                        │
│  │    3. slidev export → PDF             │                        │
│  │    4. screenshot → cover.png          │                        │
│  │    5. save artifacts to Media         │                        │
│  │    6. patch Presentation record       │                        │
│  └─────────┬─────────────────────────────┘                        │
│            │              ┌────────────────────┐                  │
│            └──────────────► PostgreSQL          │                  │
│                           └────────────────────┘                  │
└───────────────────────────────────────────────────────────────────┘
        ▲                                 ▲
        │ HTTPS                           │ HTTPS
   ┌────┴──────────────┐          ┌───────┴──────────┐
   │  Team (Payload    │          │  External client  │
   │  admin UI)        │          │  (signed link)    │
   └───────────────────┘          └──────────────────┘
```

**Data flow — write path:**
1. Team opens Payload admin → creates Presentation → picks blocks from dropdown (with French labels and descriptions)
2. Fills typed fields per block. Live Preview shows real-time HTML rendering of the slides
3. When satisfied, sets status to "Published" → `afterChange` hook detects status change → queues `buildSlides` job
4. Builder worker (separate process) runs `buildSlidesMd(doc)` → writes to `slidev-workspace/` → `slidev build` → `slidev export` → cover screenshot
5. Saves PDF + cover + SPA dist to Payload Media (local filesystem)
6. Patches Presentation record with `pdfFile`, `spaUrl`, `coverImage`, `lastBuildStatus: success`

**Data flow — AI draft path (Unit 5b):**
1. Team clicks "Draft from Brief" button on a new Presentation
2. Custom admin component sends the brief to `/api/draft-presentation` endpoint
3. Endpoint calls Claude API with block schemas as tool definitions → receives structured blocks array
4. Writes blocks to the Presentation via Payload Local API → admin refreshes to show populated blocks

## Implementation Units

- [ ] **Unit 1: Clean repo, bootstrap Payload CMS, and validate Docker build**

**Goal:** Remove the ixartz boilerplate, bootstrap a Payload 3.x project with PostgreSQL, French i18n, basic auth, and a working Dockerfile that proves Payload + Slidev + Playwright run in Docker.

**Requirements:** R6, R8, R10

**Dependencies:** None

**Files:**
- Extract to `_reusable/`: `src/libs/slidev/parse.ts`, `src/libs/slidev/types.ts` (before deleting src/)
- Remove: `src/` (entire ixartz app), `migrations/`, `drizzle.config.ts`, `vitest.config.mts`, boilerplate configs
- Keep: `PRD.md`, `specs/`, `.specify/`, `.git/`, `docs/`, `services/`
- Create: `src/payload.config.ts`, `src/app/(payload)/`, `src/collections/Users.ts`
- Create: `package.json` (Payload-based)
- Create: `Dockerfile` (Node.js 20 + Payload + Slidev workspace + Playwright)
- Create: `slidev-workspace/package.json` (isolated Slidev + Playwright deps)

**Approach:**
- Bootstrap via `npx create-payload-app` scaffold
- Configure `@payloadcms/db-postgres` with existing local Postgres
- `i18n: { supportedLanguages: { fr, en }, fallbackLanguage: 'fr' }`
- Users collection with `auth: true`, `role` select field (`admin` | `author` | `viewer`), access control functions per role
- Create `slidev-workspace/` with its own `package.json` containing `@slidev/cli`, `vue`, `playwright-chromium` — isolated from Payload's deps to avoid Vite version conflicts
- Dockerfile: multi-stage build that installs both Payload deps and Slidev workspace deps
- Validate: `docker build` succeeds, Payload starts, admin loads, `slidev build` runs in the workspace

**Test scenarios:**
- Happy path: Payload starts, admin UI loads at `/admin` in French, login works
- Happy path: `slidev build` runs successfully inside the Docker container on the reference Klarc deck
- Benchmark: measure `slidev build` + `slidev export` time on the Klarc deck in Docker

**Verification:**
- Admin panel accessible, French UI, auth works
- Docker build produces a working image
- Slidev build time benchmarked and documented

---

- [ ] **Unit 2: Define collections + 11 block types with French labels and role-based access**

**Goal:** Create Payload collections matching the PRD data model. Every custom field has a French label and description. MarkdownBlock restricted to admin role. Access control matrix enforced.

**Requirements:** R1, R2, R6

**Dependencies:** Unit 1

**Files:**
- Create: `src/collections/Presentations.ts`
- Create: `src/collections/Clients.ts`
- Create: `src/collections/Media.ts`
- Create: `src/blocks/CoverBlock.ts` through `src/blocks/MarkdownBlock.ts` (11 files)
- Create: `src/access/roles.ts` (access control functions)
- Modify: `src/payload.config.ts`

**Approach:**
- Block fields match PRD §7 schemas. Each field gets a French `label` and `description` (e.g., field `eyebrow` → label: `Accroche`, description: `Texte court au-dessus du titre principal`)
- MarkdownBlock: field-level access `{ create: isAdmin, update: isAdmin }` — only admins can use the escape hatch
- Presentations: title, slug (validated `^[a-z0-9-]{1,64}$`), client, status (draft/published/archived), tags, language, slides (blocks[]), pdfFile, spaUrl, coverImage, lastBuildStatus, lastBuildError. **No `versions[]` for MVP.**
- Access control matrix:
  - Admin: full CRUD on all collections
  - Author: CRUD on Presentations + Clients they created; read-only on others' Presentations
  - Viewer: read-only on all collections
- Block picker: each block has a French `label` and `description` for discoverability (e.g., `Grille de cartes` / `Disposition en colonnes avec cartes numérotées`)
- Add a "Starter Template" option: pre-populate a new Presentation with a recommended block sequence (Cover + 3 content + End)

**Test scenarios:**
- Happy path: Create a Presentation with 3 block types, save, verify persistence
- Happy path: All block field labels display in French in the admin UI
- Edge case: MarkdownBlock visible only to admin role; author cannot add one
- Edge case: Author cannot edit another author's Presentation
- Edge case: Viewer can browse but not create or edit
- User validation: have a non-technical team member attempt to create a 5-slide deck

**Verification:**
- Block picker shows 11 types with French labels and descriptions
- Access control prevents unauthorized operations
- A non-developer can create a basic deck using the block picker

---

- [ ] **Unit 3: Slidev exporter — `buildSlidesMd()` + block renderers + escaping utilities**

**Goal:** Write the deterministic export function plus one renderer per block type. All renderers escape user input. Flat file structure (no theme abstraction for MVP).

**Requirements:** R3, R9

**Dependencies:** Unit 2

**Files:**
- Create: `src/export/buildSlidesMd.ts`
- Create: `src/export/utils.ts` (`escape()`, `md()` helpers)
- Create: `src/export/headmatter.yaml`
- Create: `src/export/style.css` (copy from Klarc reference)
- Create: `src/export/blocks/cover.ts` through `src/export/blocks/markdown.ts` (11 files)
- Copy: `_reusable/parse.ts` → `src/export/parse.ts` (for round-trip validation)
- Test: `src/export/__tests__/buildSlidesMd.test.ts`
- Test: `src/export/__tests__/blocks.test.ts`

**Approach:**
- Each renderer: `(block: CoverBlock) => string` — pure function producing Slidev markdown
- `escape(text)`: HTML-encodes `<>&"'` characters
- `md(text)`: converts inline markdown (bold, italic, links) to HTML, escapes the rest
- Array-bearing blocks (CardGrid, Stats, Testimonials, etc.) compute `v-motion` animation delays dynamically based on item index (e.g., `STAGGER_DELAY_MS = 100 * index`)
- Port HTML structures directly from `../work/tasks/2026-04-07-klarc-slidev/slides.md`
- Self-host fonts: download Inter + Fraunces into `src/export/fonts/` and reference via local paths in headmatter (eliminates network dependency during builds, improves determinism)
- `buildSlidesMd(presentation)` — no theme parameter for MVP. Single Klarc style.

**Test scenarios:**
- Happy path: CoverBlock with all fields → valid Slidev markdown with `layout: cover` and Klarc HTML
- Happy path: Full Klarc reference deck → `buildSlidesMd` output matches structurally (same slides, layouts, CSS classes)
- Happy path: Round-trip `parseDeck(buildSlidesMd(doc))` preserves slide count
- Edge case: Block with HTML special characters in fields (`<script>`, `---`, `&amp;`) → escaped correctly, no injection
- Edge case: Empty optional fields → clean HTML without dangling empty elements
- Edge case: MarkdownBlock → raw content passed through (admin-only, accepted risk)
- Edge case: CardGrid with 6 cards → v-motion delays computed correctly for all 6

**Verification:**
- All renderers produce valid Slidev markdown
- `buildSlidesMd()` is pure — same input → same output
- Escaping prevents XSS in generated HTML

---

- [ ] **Unit 4: Builder worker — slidev build + export pipeline**

**Goal:** Implement the Jobs Queue task that builds a Slidev SPA + PDF when a Presentation is published. Runs in a separate process. Infinite-loop prevention via hook guard.

**Requirements:** R4

**Dependencies:** Unit 3

**Files:**
- Create: `src/jobs/buildSlides.ts`
- Create: `src/hooks/afterPresentationChange.ts`
- Modify: `src/payload.config.ts` (register job + hook)
- Test: `src/jobs/__tests__/buildSlides.test.ts`

**Approach:**
- **Hook guard**: `afterChange` hook only queues a build when `doc.status === 'published' && (previousDoc.status !== 'published' || slidesChanged(doc, previousDoc))`. Compares `doc.slides` vs `previousDoc.slides` via JSON hash. Builder-managed fields (pdfFile, spaUrl, coverImage, lastBuildStatus) are updated with `context: { skipBuildQueue: true }`, and the hook checks for this flag.
- **Shell safety**: All CLI calls use `execFile` with argument arrays. Slug validated at collection level.
- **Workdir**: Use `os.mkdtemp()` for temp directory (random path, no user data in path). Copy `slides.md` + `style.css` + `fonts/` into it. Symlink `slidev-workspace/node_modules` for Slidev deps. Delete workdir in `finally` block.
- **Pipeline**:
  1. Fetch presentation from Payload
  2. Run `buildSlidesMd(presentation)` → write to temp workdir
  3. `execFile('npx', ['slidev', 'build', '--base', `/${slug}/`])` in the workdir
  4. `execFile('npx', ['slidev', 'export', '--format', 'pdf'])` in the workdir
  5. Screenshot cover: use Playwright (already installed for `slidev export`) to load `dist/index.html`, take screenshot of slide 1
  6. Upload PDF + cover to Payload Media collection (local filesystem)
  7. Copy SPA `dist/` to `media/spa/<slug>/` (served via catch-all route)
  8. Patch Presentation: `pdfFile`, `spaUrl`, `coverImage`, `lastBuildStatus: 'success'`
  9. On failure: `lastBuildStatus: 'failed'`, `lastBuildError: stackTrace`
- **Concurrency**: Before starting a build, check if a newer pending job exists for the same presentation ID. If so, skip this job (last-queued-wins).
- **Worker process**: `pnpm payload jobs:run` as a separate Docker CMD in production. `autoRun: true` in dev.

**Test scenarios:**
- Happy path: Publish a 3-block presentation → `slides.md` written → `slidev build` succeeds → PDF + SPA exist → record updated
- Error path: `slidev build` fails → `lastBuildStatus: 'failed'` + `lastBuildError` populated
- Edge case: Save without publishing → no build triggered
- Edge case: Hook guard: updating `pdfFile` via builder does not re-trigger build
- Edge case: Two rapid publishes → only the latest build runs

**Verification:**
- Publishing triggers a build, saving a draft does not
- PDF and SPA available after build completes
- No infinite build loops

---

- [ ] **Unit 5: payload-ai plugin for per-field Claude actions**

**Goal:** Install `@ai-stack/payloadcms` with Claude as provider. Enable Compose/Proofread/Translate/Rephrase on block RichText fields.

**Requirements:** R5 (partial — per-field AI)

**Dependencies:** Unit 2

**Files:**
- Modify: `src/payload.config.ts`
- Modify: `.env` (`ANTHROPIC_API_KEY`)
- Modify: Block definitions with RichText fields (add Lexical AI feature)

**Approach:**
- `payloadAiPlugin({ collections: { presentations: true } })`
- Block fields that are RichText (e.g., `subtitle`, `intro`, `body` on Statement/TwoCols/etc.): add `PayloadAiPluginLexicalEditorFeature()` to their Lexical editor config
- Verify Claude generates content in French by default (configure system prompt in plugin or via env)

**Test scenarios:**
- Happy path: Compose action on a RichText field → Claude generates content
- Happy path: Translate action → text translated
- Error path: Missing API key → clear error

**Verification:**
- AI buttons appear in Lexical toolbar
- Claude generates content successfully

---

- [ ] **Unit 5b: "Draft from Brief" — deck-level AI drafting**

**Goal:** Custom admin button + API endpoint that takes a natural-language brief and populates the entire blocks array via Claude structured output.

**Requirements:** R5 (full — deck-level drafting, per PRD success test)

**Dependencies:** Unit 2, Unit 5

**Files:**
- Create: `src/app/api/draft-presentation/route.ts`
- Create: `src/components/DraftFromBriefButton.tsx` (Payload custom admin component)
- Modify: `src/collections/Presentations.ts` (add custom admin component to edit view)

**Approach:**
- Custom admin component: a button + text input that appears at the top of the Presentation edit view when the slides array is empty
- User enters a brief (e.g., "Pitch de 10 slides pour Klarc sur la stratégie PI biotech")
- Button calls `POST /api/draft-presentation` with `{ presentationId, brief }`
- Endpoint calls Claude API via `@ai-sdk/anthropic` with `generateObject()`:
  - System prompt describes the block schemas as structured output tools
  - Claude returns a JSON array of typed blocks matching the Payload blocks schema
- Endpoint writes the blocks array to the Presentation via Payload Local API
- Admin page refreshes to show populated blocks that the user can then edit

**Test scenarios:**
- Happy path: Enter a brief → Claude returns 8-10 blocks → blocks appear in the editor, editable
- Happy path: Generated blocks include appropriate types (Cover, Section, content blocks, End)
- Edge case: Claude returns invalid block structure → graceful error, no data corruption
- Edge case: Brief in French → blocks generated in French

**Verification:**
- PRD success test: colleague clicks "Draft from Brief", types a prompt, Claude populates blocks, colleague tweaks fields, publishes → PDF + SPA within 60 seconds of publish

---

- [ ] **Unit 6: Live Preview for instant editing feedback**

**Goal:** Configure Payload's Live Preview to render blocks as styled HTML in real-time during editing, without requiring a full Slidev build.

**Requirements:** R2 (editing UX)

**Dependencies:** Unit 3

**Files:**
- Create: `src/app/(frontend)/preview/page.tsx` (preview route)
- Modify: `src/payload.config.ts` (Live Preview config)
- Modify: `src/collections/Presentations.ts` (enable Live Preview)

**Approach:**
- Preview route receives the Presentation document from Payload Live Preview, runs `buildSlidesMd()`, renders the HTML output with the Klarc `style.css` in a simple HTML page
- NOT a full Slidev render — just the block HTML with theme CSS applied. Good enough for content and layout validation
- Payload Live Preview updates the iframe on every field change (no save needed)
- This replaces the "20-30 second wait per save" feedback loop with instant visual feedback

**Test scenarios:**
- Happy path: Edit a block field → preview updates in real-time showing styled slide HTML
- Edge case: Empty presentation → preview shows placeholder message

**Verification:**
- Editing a field instantly reflects in the preview pane
- Preview is visually close to the final Slidev output (same CSS classes, same HTML structure)

---

- [ ] **Unit 7: ShareLinks collection + public share page with pre-signed URLs**

**Goal:** Signed, expiring share links for external clients. SPA access gated by pre-signed URLs so link expiry is enforced at the storage level.

**Requirements:** R7

**Dependencies:** Unit 4

**Files:**
- Create: `src/collections/ShareLinks.ts`
- Create: `src/app/(frontend)/share/[token]/page.tsx`
- Modify: `src/payload.config.ts`

**Approach:**
- ShareLinks collection: presentation (relationship), tokenHash (SHA-256 hash of the token), expiresAt, createdBy, viewCount, lastViewedAt
- Token generated as `crypto.randomBytes(32).toString('base64url')`, stored as `sha256(token)` in DB
- Share page: looks up `sha256(requestToken)` in DB, checks expiry, increments viewCount, renders the SPA
- SPA access: share page serves the built SPA files via a proxy route (`/share/[token]/spa/[...path]`) that reads from the Media directory on disk. Only accessible through a valid, non-expired share token — no public-read directory
- Rate limiting: 20 req/min per IP on the share route (Next.js middleware)

**Test scenarios:**
- Happy path: Generate share link → open in incognito → SPA loads
- Happy path: View count increments
- Edge case: Expired link → "Link expired" message
- Edge case: Invalid token → 404
- Edge case: Direct access to SPA files without a valid share token → 403

**Verification:**
- External user views presentation via share link without login
- Expired links are rejected
- SPA files are not publicly accessible without a valid token

---

- [ ] **Unit 8: Coolify deployment — docker-compose**

**Goal:** docker-compose with 3 services (payload, payload-worker, postgres) for Coolify deployment.

**Requirements:** R8

**Dependencies:** Units 1–7

**Files:**
- Create: `docker-compose.yml`
- Finalize: `Dockerfile` (from Unit 1)
- Create: `.env.example`

**Approach:**
- 3 services:
  - `payload`: Payload CMS app (Next.js), `CMD ["pnpm", "start"]`
  - `payload-worker`: Same image, `CMD ["pnpm", "payload", "jobs:run"]` — isolated process for CPU-intensive builds
  - `postgres`: PostgreSQL 16
- Local filesystem storage: named Docker volume for `media/` directory shared between `payload` and `payload-worker` services
- Secrets: `PAYLOAD_SECRET`, `ANTHROPIC_API_KEY` via Coolify secret injection
- TLS via Coolify's Let's Encrypt on `decks.expand.fr`

**Test scenarios:**
- Happy path: `docker compose up` → all services start → admin accessible → create + publish → PDF available
- Error path: Postgres connection fails → clear error
- Edge case: Worker restarts mid-build → build resumes or retries

**Verification:**
- Full stack runs from `docker compose up`
- End-to-end: create → publish → build → PDF + SPA → share link works

## System-Wide Impact

- **Interaction graph:** Payload admin → afterChange hook (only on publish) → Jobs Queue → builder worker (separate process) → Slidev CLI in `slidev-workspace/` → Media upload → Presentation record patch (with `skipBuildQueue` context flag). Share page validates token → serves SPA files via proxy.
- **Error propagation:** Build failures captured in `lastBuildStatus` + `lastBuildError`. Admin UI shows error badge.
- **State lifecycle risks:** Hook guard prevents infinite loops. Concurrent builds deduplicated via last-queued-wins check. Temp workdir cleaned up in `finally` block.
- **Unchanged invariants:** Slidev receives a standard `slides.md` and theme CSS. No modifications to Slidev itself.

## Security Threats

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Shell injection via slug in `slidev build --base` | Critical | `execFile` with arg arrays, slug validated `^[a-z0-9-]{1,64}$` |
| Stored XSS via MarkdownBlock in shared SPA | Critical | MarkdownBlock restricted to admin role |
| SPA bypass (direct access without share token) | High | SPAs served via proxy route gated by token validation, not public directory |
| Anthropic API key leaked in builder subprocess | Medium | Builder subprocess env stripped of `ANTHROPIC_API_KEY` |
| Brute-force share token guessing | Low | 256-bit tokens + SHA-256 hash storage + rate limiting (20 req/min/IP) |

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| payload-ai plugin v3.2.26 bundles stale `ai@5.1.0-beta.9` | Pin version. Test Lexical toolbar rendering. Consider beta v3.76.0 if stable version has issues |
| `slidev build` time may exceed 60 seconds for large decks | Benchmark in Unit 1. Build only on publish (not every save). Consider `--timeout` flag |
| Klarc theme CSS may need Slidev version adjustments | Validate in Unit 3 by building the reference deck |
| Payload Blocks field UX may overwhelm non-technical users | French labels + descriptions on all blocks. Starter template. User validation milestone in Unit 2 |
| Concurrent document-level saves can overwrite changes | Acceptable for 5-10 users. Document locking in v1.1 if needed |
| Effort estimate: 2-3 weeks (not 1 week as PRD stated for fork path) | Calibrated for Payload from scratch. Update PRD |

## Roadmap Impact (Payload vs Fork Path)

| v1.1 Feature | Impact under Payload |
|-------------|---------------------|
| Two more theme presets | Add `src/export/themes/` directory structure at that point. Low effort — same renderer pattern, different CSS |
| Drag-and-drop block reordering | **Free** — Payload Blocks field supports this natively |
| Claude draft button | **Delivered in MVP** (Unit 5b) |
| Comments on specific slides | New collection, moderate effort (same in either architecture) |
| Google Workspace OIDC | Payload auth plugins support this |
| MCP plugin | Install `@payloadcms/plugin-mcp`, configure collection exposure and API key. Low effort |

## Sources & References

- **Origin document:** [PRD.md](PRD.md) — note: PRD §1 stack decision should be updated to reflect Payload choice
- **Klarc theme files:** `../work/tasks/2026-04-07-klarc-slidev/` (style.css, slides.md, slides-export.pdf)
- **Payload CMS 3.x:** https://payloadcms.com/docs
- **Payload Live Preview:** https://payloadcms.com/docs/live-preview/overview
- **payload-ai plugin:** https://github.com/ashbuilds/payload-ai
- **Payload Jobs Queue:** https://payloadcms.com/docs/jobs-queue/overview
- **Slidev export:** https://sli.dev/guide/exporting
