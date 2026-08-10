# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pinned by `packageManager`; workspace settings live in `pnpm-workspace.yaml`). Node 20.

- `pnpm dev` — Next.js dev server (Payload admin at `/admin`, frontend at `/`).
- `pnpm build` — Production build. A `prebuild` step copies `@payloadcms/next/dist/prod/styles.css` into `src/app/(payload)/payload-admin.css`; don't edit that file by hand.
- `pnpm start` — Serve the previously generated production build.
- `pnpm test` — Vitest. Include pattern is `src/**/__tests__/**/*.test.ts`. Run a single file with `pnpm test src/export/__tests__/blocks.test.ts` and a single case with `-t "<name>"`.
- `pnpm payload` — Payload CLI (e.g. `pnpm payload migrate`, `pnpm payload migrate:create`).
- `pnpm generate:types` — Regenerate `src/payload-types.ts` after collection/block changes.
- `pnpm generate:importmap` — Regenerate `src/app/(payload)/admin/importMap.js` after adding custom admin components **or richText fields** (run this when changing `admin.components` references, or after adding/removing a `type: 'richText'` field — the Lexical editor's admin components must be in the import map or the field silently fails to render with "PayloadComponent not found in importMap").
- `pnpm jobs:run` — Run the default job queue once (used by the `payload-worker` service in Docker).

Migrations live in `src/migrations/` with an `index.ts` barrel. After changing schema run `pnpm payload migrate:create` then commit both the `.ts` and `.json` files.

## Architecture

This is a **Payload CMS 3 + Next.js 16 (App Router)** portal that lets authors compose deck content as typed blocks, then builds a [Slidev](https://sli.dev) SPA + PDF out-of-process.

### Content pipeline (the main flow)

1. **Authoring** — `Presentations` collection (`src/collections/Presentations.ts`) uses Payload's `blocks` field. Blocks are **layout primitives, not use-case templates** — purely visual arrangements with no domain semantics. The nine types in `src/blocks/*Block.ts` are: Cover, Section, Statement, TwoCols, CardGrid, Stats, Quotes, Cta (also serves as the closing/thank-you slide), Markdown. The form is organized into three admin tabs: **Contenu**, **Métadonnées**, **Sortie** (readonly build artifacts).

2. **AI draft** — `POST /api/draft-presentation` (`src/app/(payload)/api/draft-presentation/route.ts`) takes `{ presentationId, brief }`, calls Claude via an OpenAI-compatible LiteLLM proxy (`OPENAI_BASE_URL` / `OPENAI_API_KEY`) using `generateObject` with a Zod discriminated union mirroring the block schemas, and patches `presentation.slides`. The `DraftFromBriefButton` UI field in the Contenu tab triggers this.

3. **Queue trigger** — `afterPresentationChange` hook (`src/hooks/afterPresentationChange.ts`) queues a `buildSlides` job on create/update **only when** `status === 'published'` AND (freshly published OR slides content hash changed). The hook short-circuits when `req.context.skipBuildQueue === true` — **always set that flag when patching a presentation from inside the build job or the AI route** to avoid requeue loops.

4. **Build job** — `buildSlidesTask` (`src/jobs/buildSlides.ts`) runs in the Payload job queue (cron `*/1 * * * *`, `deleteJobOnComplete: true`). It:
   - calls `buildSlidesMd(presentation)` to produce a single `slides.md` string,
   - writes it to a tmpdir with `style.css`, `headmatter.yaml`, and optional `fonts/` copied from `src/export/`,
   - shells out to Slidev via `execFile` against `slidev-workspace/node_modules/.bin/slidev` (build + export PDF),
   - uploads the PDF to the `media` collection, copies the SPA `dist/` to `media/spa/<slug>/`, and patches `spaUrl` / `pdfFile` / `lastBuildStatus` back onto the presentation.
   - On failure it writes `lastBuildStatus: 'failed'` + `lastBuildError`. The tmpdir is always cleaned up in `finally`.

5. **Rendering** — Block renderers in `src/export/blocks/*.ts` are **pure functions** that return Slidev-flavored markdown strings (per-slide frontmatter + HTML). `buildSlidesMd.ts` wires them through a `RENDERERS` record keyed by `blockType` and joins slides with `---`. The same renderers are reused by:
   - the build job (markdown → Slidev),
   - the **live preview** page at `/preview` (`src/app/(frontend)/preview/page.tsx`), which uses `useLivePreview` (depth:2 to hydrate nested blocks) and strips per-slide frontmatter before injecting HTML.

   **Invariant — adding a new layout block.** Blocks are now driven by the single-source **block-spec DSL** in `src/blocks/spec/` (one `BlockSpec` projects to four artifacts: L1 Payload field config, L2 renderer type, L3 AI draft Zod schema, L4 AI prompt prose). To add a block you:
   1. author `src/blocks/spec/<name>.ts` — the render Zod consts + `BlockSpec` (with `aiDraftable` and, if draftable, a `promptMeta`) + a precise `<name>RenderSchema` literal + `export type <Name>BlockData`;
   2. add `src/blocks/<Name>Block.ts` = `emitPayloadBlock(<name>Spec)`;
   3. register the emitted block in `src/collections/Presentations.ts` (blocks array) **and** add the spec to `src/blocks/spec/index.ts` `ALL_SPECS`;
   4. add the renderer `src/export/blocks/<name>.ts` importing `<Name>BlockData` from its spec, and wire it into `src/export/renderers.ts` (`RENDERERS` map + `SlideBlock` union — these were consolidated here; `buildSlidesMd.ts` and `/preview` both consume this one registry);
   5. **nothing to touch in the draft route** — its schema and `SYSTEM_PROMPT` are auto-derived from `ALL_SPECS` (see `src/lib/draftPresentation.ts`), so an `aiDraftable` block with a `promptMeta` is picked up automatically.

   Keep new blocks **use-case-agnostic** — fields should describe visual structure (title, eyebrow, cards, columns…), never domain concepts (office, testimonial, contact row…).

### Slidev workspace isolation

`slidev-workspace/` is a **separate pnpm project** with its own `node_modules` for `@slidev/cli`, `@slidev/theme-default`, `vue`, and `playwright-chromium`. This keeps Slidev's deep Vue/Vite tree out of the Next.js bundle. The Dockerfile has a dedicated `slidev-deps` stage for it and installs the Chromium binary via `npx playwright-chromium install chromium` in the final image. The build job finds the binary via `join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev')` — do not replace this with `npx` or a global install. Staged temp workdirs symlink `slidev-workspace/node_modules`; this intentionally preserves Slidev/Vite's default `node_modules/.vite` cache across builds, so do not add a custom cache directory unless timing logs prove dependency pre-bundling is still expensive.

### Export tuning and smoke verification

Slidev export knobs live in env only for operational tuning:
- `SLIDEV_EXPORT_TIMEOUT_MS` defaults to `120000` and feeds Slidev `export --timeout`.
- `SLIDEV_EXPORT_WITH_TOC=1` adds `--with-toc`; default is off.
- `SLIDEV_EXPORT_PER_SLIDE=1` restores slower `--per-slide` PDF export; default is off because single-pass export now has baked `kPage` / `kTotal` footer data.
- `SLIDEV_EXPORT_INCREMENTAL_PDF=0` is default-off phase 2. `SLIDEV_EXPORT_INCREMENTAL_MIN_SLIDES` and `SLIDEV_EXPORT_INCREMENTAL_MAX_DIRTY_RATIO` are only for deliberate partial-PDF smoke/testing, not normal production.

`outputPolicy` is a per-job input, not an env var. Valid values are `both` (default publish/update path), `pdf`, and `spa`; targeted `pdf` / `spa` rebuilds leave the skipped artifact on its previous fingerprint and surfaced as stale where relevant.

Worker replicas are constrained by Chromium + Vite memory/CPU. Keep `WORKER_REPLICAS <= host cores - 1` and within container memory (`payload-worker` defaults assume about 2g per replica). Do not increase replicas to mask slow exports before checking timing logs.

Cache posture: staged workdirs symlink `slidev-workspace/node_modules`, intentionally reusing Slidev/Vite's default `node_modules/.vite` cache across builds. Do not add custom cache directories unless timing logs prove dependency pre-bundling is still the bottleneck.

Smoke commands before changing export plumbing:
- Export CLI help: `pnpm --dir slidev-workspace exec slidev export --help`
- Full PDF smoke from a temp deck: `pnpm --dir slidev-workspace exec slidev export /tmp/slides.md --format pdf --output /tmp/slides.pdf`
- Range PDF smoke: `pnpm --dir slidev-workspace exec slidev export /tmp/slides.md --format pdf --range 1-2 --output /tmp/slides-range.pdf`
- PNG smoke: `pnpm --dir slidev-workspace exec slidev export /tmp/slides.md --format png --output /tmp/slides-png`
- Docker config smoke: `docker compose config`
- Focused args tests: `pnpm test src/jobs/__tests__/slidevExportArgs.test.ts`
- Typecheck: `pnpm typecheck`

### Sharing

`ShareLinks` collection stores only `sha256(token)`; the raw token is generated in `beforeChange`, stashed on `req.context.shareToken`, and exposed once in `afterChange` as `shareUrl`. `/share/[token]/page.tsx` hashes the incoming token, looks up the link, checks `expiresAt`, increments `viewCount`, and iframes `/share/<token>/spa/index.html`.

### Migrations

`src/migrations/index.ts` exports an empty array — the schema is still in flux on this feature branch. Run `pnpm payload migrate:create` against an empty dev DB to generate a fresh initial migration when you're ready to lock it in. After any change to collections or blocks, regenerate types with `pnpm generate:types` (it reads the config, doesn't need a live DB — just set `DATABASE_URL` to any dummy value).

### Access control

`src/access/roles.ts` defines `isAdmin`, `isAdminOrAuthor`, `isLoggedIn`, `isAdminOrSelf` (admin OR `createdBy == user.id`). Collections wire these into their `access` blocks. `Presentations.createdBy` is stamped in a `beforeChange` field hook on `create` only.

### Routing layout

Next.js route groups separate concerns:
- `src/app/(payload)/` — Payload admin (`/admin/[[...segments]]`) and REST/GraphQL (`/api/[...slug]`), plus the custom `draft-presentation` route. The `importMap.js` here is generated.
- `src/app/(frontend)/` — public portal: `/`, `/preview`, `/share/[token]`.

The `@/*` and `@payload-config` path aliases are defined in `tsconfig.json`.

### Google OAuth

`payload-auth-plugin` with `GoogleAuthProvider` handles Google login. The plugin adds API endpoints at `/api/auth/oauth/authorization/google` and `/api/auth/oauth/callback/google`. With `useAdmin: true`, a successful OAuth callback sets the Payload admin cookie directly. The `Accounts` collection (`src/collections/Accounts.ts`) stores linked OAuth accounts (sub, tokens, issuer). `allowOAuthAutoSignUp: true` creates a user on first Google login. The Google callback URL to register in Google Cloud Console is `{NEXT_PUBLIC_SERVER_URL}/api/auth/oauth/callback/google`.

### Admin seed

`payload.config.ts` `onInit` upserts an admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` on every boot (creates if missing, otherwise resets password + role). Skips silently if the env vars are absent.

### AI drafting

`@ai-stack/payloadcms` is **not** wired up — it crashed the admin client-side render. AI drafting goes through the custom `draft-presentation` route. The block Zod schema and system prompt are **not** hand-written there: they are derived from the block-spec SSOT (`src/blocks/spec`) by `src/lib/draftPresentation.ts`, which exports `SLIDES_SCHEMA` (`emitSlidesArraySchema(ALL_SPECS)`), `DRAFT_SYSTEM_PROMPT` (`buildSystemPrompt(...)` over each spec's `promptMeta`), and `draftPresentationSlides(brief)`. The route and the `scripts/draft-smoke.mjs` live check both call that one surface. The provider (`src/lib/ai.ts`) targets any OpenAI-compatible endpoint (9router by default) and uses **tool calling** rather than `response_format: json_schema` (most proxies don't implement structured outputs) — see that file's header. The prompt is deliberately use-case-agnostic — keep `promptMeta` free of domain vocabulary, company names, or industry terms; the LLM picks up tone from the user's brief.

### Source-aware agentic builds

There are **two generation paths**. The single-shot `draft-presentation` route above is the quick path. The richer path is the Mastra **`deckWorkflow`** (`src/agents/workflow.ts`), invoked by `POST /api/agent-draft` and surfaced by the `AgentDraftButton` field — it runs gather → structure → draft → validate → assemble with a critique/revise loop.

Authors can attach **external knowledge sources** per draft (the brief is the same; sources just ground it). Sources are **runtime-configured**, not a Payload collection: the `AGENT_SOURCE_REGISTRY_JSON` env var holds a JSON array of source descriptors (`src/lib/sources/types.ts` — discriminated on `transport: 'stdio' | 'http'`, MCP being the first connector family). The registry layer lives in `src/lib/sources/`:

- `registry.ts` — parses/caches the env, exposes `listSourceDescriptors()` (full, server-only) and `listSourceOptions()` (id/label only, safe to send to the browser).
- `resolve.ts` — `resolveSources(ids)` validates+dedups+caps selection (`MAX_SELECTED_SOURCES = 8`), throwing `UnknownSourceError` (→ HTTP 400) on unknown ids.
- `mcpConnector.ts` — `openSourceToolsets(sources)` opens a Mastra `MCPClient` and returns `{ toolsets, disconnect }`.

**Only `gather` and `structure` get source tools** (`src/agents/agents/research.ts`); the per-slide writers stay small-context with no tools. To keep secrets (commands, urls, env) out of Mastra's PostgresStore step snapshots, the workflow threads only plain `sourceIds: string[]` — the research helper resolves, opens, and `disconnect()`s the MCP client **locally** in the web process (the route's fire-and-forget `run.stream`, not the worker). Collected evidence is persisted as build metadata only (`draftSources` / `draftEvidence` on the presentation), not as visible slide citations. The admin source picker is fed by `GET /api/agent-sources` (auth-gated; returns options + `maxSelected`).

## Environment

Required: `DATABASE_URL`, `PAYLOAD_SECRET`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SERVER_URL`. Optional: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `AGENT_SOURCE_REGISTRY_JSON` (runtime external source registry for agentic drafts; defaults to no sources). See `.env.example`.

Production runs three services (`docker-compose.yaml`): `postgres`, `payload` (web), `payload-worker` (runs `pnpm jobs:run` in a loop). Media is a shared host volume mounted at `/app/media` on both `payload` and `payload-worker` so the worker can write `spa/<slug>/` where the web process serves it.
