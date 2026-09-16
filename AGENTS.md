# AGENTS.md

Repository guidance for coding agents.

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues for `klarc-dev/expand-decks`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the canonical `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Commands

Package manager is **pnpm** (pinned by `packageManager`; workspace settings live in `pnpm-workspace.yaml`). Node 22.13.1 or newer.

- `pnpm dev` — Next.js dev server (Payload admin at `/admin`, frontend at `/`).
- `pnpm build` — Production build. A `prebuild` step copies `@payloadcms/next/dist/prod/styles.css` into `src/app/(payload)/payload-admin.css`; don't edit that file by hand.
- `pnpm start` — Serve the previously generated production build.
- `pnpm test` — Vitest. Include pattern is `src/**/__tests__/**/*.test.ts`. Run a single file with `pnpm test src/export/__tests__/blocks.test.ts` and a single case with `-t "<name>"`.
- `pnpm payload` — Payload CLI (e.g. `pnpm payload migrate`, `pnpm payload migrate:create`).
- `pnpm generate:types` — Regenerate `src/payload-types.ts` after collection/block changes.
- `pnpm generate:importmap` — Regenerate `src/app/(payload)/admin/importMap.js` after adding custom admin components **or richText fields** (run this when changing `admin.components` references, or after adding/removing a `type: 'richText'` field — the Lexical editor's admin components must be in the import map or the field silently fails to render with "PayloadComponent not found in importMap").
- `pnpm jobs:run` — Run the default job queue once (used by the `payload-worker` service in Docker).
- `pnpm prod <status|run|pull>` — Operate the live Coolify deployment over the `klarc` ssh alias (`scripts/prod.mjs`). `status` prints containers, deployed sha vs local HEAD and the job queue. `run scripts/<file>.ts [args]` executes a repo script inside the production payload container, deployed or not (names starting with `seed-`/`set-` need `--yes`; an uncommitted file needs `--allow-dirty`). `pull` restores a production dump into a fresh local database (`slides_prod_<date>`) and rsyncs media into `./media`; it never writes to production.

Migrations live in `src/migrations/` with an `index.ts` barrel. After changing schema run `pnpm payload migrate:create` then commit both the `.ts` and `.json` files.

Production deployment and environment synchronization are documented in `docs/deployment/coolify.md`.

## Architecture

This is a **Payload CMS 3 + Next.js 16 (App Router)** portal that lets authors compose deck content as typed blocks, then builds a [Slidev](https://sli.dev) SPA + PDF out-of-process.

### Content pipeline (the main flow)

1. **Authoring** — `Presentations` collection (`src/collections/Presentations.ts`) uses Payload's `blocks` field. Blocks are **layout primitives, not use-case templates** — purely visual arrangements with no domain semantics. The 12 types in `src/blocks/*Block.ts` are: Cover, Section, Statement, TwoCols, CardGrid, Stats, Quotes, Cta (also serves as the closing/thank-you slide), Table, Timeline, Mermaid, Agenda. The form is organized into four admin tabs: **Contenu**, **IA**, **Réglages**, **Sortie** (readonly build artifacts).

2. **AI draft** — `POST /api/agent-draft` (`src/app/(payload)/api/agent-draft/route.ts`) takes a presentation/document id plus a brief and optional knowledge-base ids, then launches the durable Mastra `deckWorkflow` (`src/agents/workflow.ts`). The workflow gathers evidence, structures a template-aware page plan, drafts and validates pages, assembles them, and patches the presentation with build-queue suppression. The `AgentRunControls` field starts, monitors, resumes, restarts, and cancels durable runs in the admin.

3. **Queue trigger** — `afterPresentationChange` hook (`src/hooks/afterPresentationChange.ts`) stamps a build token/status and queues a `buildSlides` job on every external presentation create/update. Internal patches short-circuit when `req.context.skipBuildQueue === true` — **always set that flag when patching a presentation from inside the build job or an AI route** to avoid requeue loops.

4. **Build job** — `buildSlidesTask` (`src/jobs/buildSlides.ts`) runs in the Payload job queue (cron `*/1 * * * *`, `deleteJobOnComplete: true`). It:
   - calls `buildSlidesMd(presentation)` to produce a single `slides.md` string,
   - writes it to a tmpdir with `style.css`, `headmatter.yaml`, and optional `fonts/` copied from `src/export/`,
   - shells out to Slidev via `execFile` against `slidev-workspace/node_modules/.bin/slidev` (build + export PDF),
   - uploads generated files to `media`, copies the SPA `dist/` to `media/spa/<slug>/`, and patches the canonical ordered `artifacts` array plus `lastBuildStatus` back onto the presentation.
   - On failure it writes `lastBuildStatus: 'failed'` + `lastBuildError`. The tmpdir is always cleaned up in `finally`.

5. **Rendering** — Block renderers in `src/export/blocks/*.ts` are **pure functions** that return Slidev-flavored markdown strings (per-slide frontmatter + HTML). `buildSlidesMd.ts` wires them through a `RENDERERS` record keyed by `blockType` and joins slides with `---`. The same renderers are reused by:
   - the build job (markdown → Slidev),
   - the admin per-slide preview, which calls `/api/slide-preview` and renders the same HTML/CSS through `SlideFrame`.

   **Invariant — adding a new layout block.** Blocks are now driven by the single-source **block-spec DSL** in `src/blocks/spec/` (one `BlockSpec` projects to four artifacts: L1 Payload field config, L2 renderer type, L3 AI draft Zod schema, L4 AI prompt prose). To add a block you:
   1. author `src/blocks/spec/<name>.ts` — the render Zod consts + `BlockSpec` (with `aiDraftable` and, if draftable, a `promptMeta`) + a precise `<name>RenderSchema` literal + `export type <Name>BlockData`;
   2. add `src/blocks/<Name>Block.ts` = `emitPayloadBlock(<name>Spec)`;
   3. register the emitted block in `src/collections/Presentations.ts` (blocks array) **and** add the spec to `src/blocks/spec/index.ts` `ALL_SPECS`;
   4. add the renderer `src/export/blocks/<name>.ts` importing `<Name>BlockData` from its spec, and wire it into `src/export/renderers.ts` (`RENDERERS` map + `SlideBlock` union — these were consolidated here; `buildSlidesMd.ts` and `/preview` both consume this one registry);
   5. **nothing to touch in the draft route** — draft schemas and prompt catalogues are derived from `ALL_SPECS`, so an `aiDraftable` block with `promptMeta` is picked up automatically.

   Keep new blocks **use-case-agnostic** — fields should describe visual structure (title, eyebrow, cards, columns…), never domain concepts (office, testimonial, contact row…).

### Slidev workspace isolation

`slidev-workspace/` is a **separate pnpm project** with its own `node_modules` for `@slidev/cli`, `@slidev/theme-default`, `vue`, and `playwright-chromium`. This keeps Slidev's deep Vue/Vite tree out of the Next.js bundle. The Dockerfile has a dedicated `slidev-deps` stage for it and installs the Chromium binary via `npx playwright-chromium install chromium` in the final image. The build job finds the binary via `join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev')` — do not replace this with `npx` or a global install. Staged temp workdirs symlink `slidev-workspace/node_modules`; this intentionally preserves Slidev/Vite's default `node_modules/.vite` cache across builds, so do not add a custom cache directory unless timing logs prove dependency pre-bundling is still expensive.

### Export smoke verification

Every build produces the canonical PDF, SPA, and first-slide cover through the native Slidev CLI. PDF export is single-pass with baked `kPage` / `kTotal` footer data. Keep the fixed image/Mermaid settling policy in `slidevExportArgs.ts`; do not add operator tuning, partial-output modes, page caches, or PDF assembly without measured production evidence.

Worker replicas are constrained by Chromium + Vite memory/CPU. Keep `WORKER_REPLICAS <= host cores - 1` and within container memory (`payload-worker` defaults assume about 2g per replica). Do not increase replicas to mask slow exports before checking timing logs.

Cache posture: staged workdirs symlink `slidev-workspace/node_modules`, intentionally reusing Slidev/Vite's default `node_modules/.vite` cache across builds. Do not add custom cache directories unless timing logs prove dependency pre-bundling is still the bottleneck.

Smoke commands before changing export plumbing:
- Export CLI help: `pnpm --dir slidev-workspace exec slidev export --help`
- Full PDF smoke from a temp deck: `pnpm --dir slidev-workspace exec slidev export /tmp/slides.md --format pdf --output /tmp/slides.pdf`
- PNG smoke: `pnpm --dir slidev-workspace exec slidev export /tmp/slides.md --format png --output /tmp/slides-png`
- Docker config smoke: `docker compose config`
- Focused args tests: `pnpm test src/jobs/__tests__/slidevExportArgs.test.ts`
- Typecheck: `pnpm typecheck`

### Migrations

`src/migrations/index.ts` is the ordered production migration history. After collection or field changes, run `pnpm payload migrate:create` against a current development database and commit both generated `.ts` and `.json` files plus the barrel update. Regenerate `src/payload-types.ts` with `pnpm generate:types`; do not replace the migration history with a fresh initial migration.

### Collections

- `Users` is the authenticated admin collection. It stores roles, membership status, organisation memberships and the optional default organisation used by authoring flows.
- `Organisations` owns reusable brand settings: colours, logos, fonts and public contact details. Presentation and knowledge access is scoped through organisation membership.
- `Accounts` stores OAuth provider links created by `payload-auth-plugin`; it is infrastructure for Google sign-in rather than an author-facing content collection.
- `Presentations` stores document metadata, typed page blocks, AI run options and readonly build artifacts. Its hooks own build queueing and cleanup of related agent runs.
- `Media` stores uploads and generated document artifacts. Generated files link back to their presentation so read access follows deck ownership.
- `AgentRuns` is the durable, immutable execution ledger for Mastra workflows: input fingerprint, source policy, events, evidence, command state and terminal result.
- `KnowledgeBases` groups organisation-scoped grounding material and exposes readiness derived from its indexed documents.
- `KnowledgeDocuments` stores uploaded source files and ingestion state; lifecycle hooks enqueue extraction/vector indexing and maintain knowledge-base readiness.

### Document layer

`src/documents/` is the template and artifact contract between authoring, agents and export. `templates.ts` defines canvas/page-count/chrome rules, `payload.ts` projects those rules into Payload fields, `presentationContract.ts` validates documents, `exportPlan.ts` declares native outputs, and `artifacts.ts` maps built files/URLs back onto a presentation.

### Access control

`src/access/roles.ts` centralizes role checks, organisation membership filters and user self-access. Collections wire these into their `access` blocks; presentation access is organisation-scoped rather than creator-stamped.

### Routing layout

Next.js route groups separate concerns:
- `src/app/(payload)/` — Payload admin (`/admin/[[...segments]]`), REST/GraphQL (`/api/[...slug]`), and custom routes for durable agent runs, Google Fonts, health, slide revision, and slide preview. The `importMap.js` here is generated.
- `src/app/(frontend)/` — public portal routes `/`, `/membership-pending`, and `/spa/[slug]/[[...path]]` for built SPA assets.

The `@/*` and `@payload-config` path aliases are defined in `tsconfig.json`.

### Google OAuth

`payload-auth-plugin` with `GoogleAuthProvider` handles Google login. The plugin adds API endpoints at `/api/auth/oauth/authorization/google` and `/api/auth/oauth/callback/google`. With `useAdmin: true`, a successful OAuth callback sets the Payload admin cookie directly. The `Accounts` collection (`src/collections/Accounts.ts`) stores linked OAuth accounts (sub, tokens, issuer). `allowOAuthAutoSignUp: true` creates a user on first Google login. The Google callback URL to register in Google Cloud Console is `{NEXT_PUBLIC_SERVER_URL}/api/auth/oauth/callback/google`.

### Admin seed

`payload.config.ts` `onInit` upserts an admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` on every boot (creates if missing, otherwise resets password + role). Skips silently if the env vars are absent.

### Source-aware agentic builds

The Mastra `deckWorkflow` (`src/agents/workflow.ts`) is invoked by `POST /api/agent-draft` and surfaced by `AgentRunControls`. It runs gather → structure → draft → validate → visual → assemble, with optional plan approval and critique/revise loops.

Authors can select organisation-scoped `KnowledgeBases` for grounding. The route translates relationships to `knowledge_<id>` source ids, validates readiness and access, and stores the immutable source policy on `AgentRuns`. Only gather and structure receive search tools; per-slide writers stay small-context. `src/lib/sources/knowledgeConnector.ts` exposes bounded vector-search results while recording server-side evidence provenance.

## Environment

Required in production: `DATABASE_URL`, `PAYLOAD_SECRET`, `CLIPROXYAPI_BASE_URL`, `CLIPROXYAPI_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_FONTS_API_KEY`, `NEXT_PUBLIC_SERVER_URL`. `OPENAI_MODEL` optionally overrides the proxy's stable `high` alias. Optional operational values include `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `MASTRA_DISABLE_INIT`, and `WORKER_REPLICAS`. See `.env.example`.

`GOOGLE_FONTS_API_KEY` is a Google Cloud key with the **Web Fonts Developer API** enabled. It is server-only (`src/lib/googleFonts.ts`; the `/api/google-fonts` route returns family names/categories only). There is **no silent fallback** — a missing key, a non-ok upstream status, a network failure, or an empty catalog all throw `GoogleFontsUnavailableError`, which surfaces as HTTP 503 in the admin font picker and as a failed draft in the AI font-pair path (`src/agents/fonts.ts`). Failures are not cached, so fixing the key takes effect on the next request. `assertGoogleFontsKey()` (`src/lib/env.ts`, called at the top of `payload.config.ts`) refuses to boot in production without it; the value is deliberately not exported from `env.ts` because that module is client-importable. `LOCAL_FONTS` in `googleFonts.ts` lists only families bundled as webfont files (`src/export/style.css` ships Gilroy) — an asset inventory, not a degraded catalog. Like every other secret the key flows through the reusable Coolify environment sync workflow to `docker-compose.yaml` for both web and worker services.

Production runs three services (`docker-compose.yaml`): `postgres`, `payload` (web), `payload-worker` (runs `pnpm jobs:run` in a loop). Media is a shared host volume mounted at `/app/media` on both `payload` and `payload-worker` so the worker can write `spa/<slug>/` where the web process serves it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
