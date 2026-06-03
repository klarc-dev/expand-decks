# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `.pnpmrc.json`). Node 20.

- `pnpm dev` — Next.js dev server (Payload admin at `/admin`, frontend at `/`).
- `pnpm build` — Production build. A `prebuild` step copies `@payloadcms/next/dist/prod/styles.css` into `src/app/(payload)/payload-admin.css`; don't edit that file by hand.
- `pnpm start` — Run production build.
- `pnpm test` — Vitest. Include pattern is `src/**/__tests__/**/*.test.ts`. Run a single file with `pnpm test src/export/__tests__/blocks.test.ts` and a single case with `-t "<name>"`.
- `pnpm payload` — Payload CLI (e.g. `pnpm payload migrate`, `pnpm payload migrate:create`).
- `pnpm generate:types` — Regenerate `src/payload-types.ts` after collection/block changes.
- `pnpm generate:importmap` — Regenerate `src/app/(payload)/admin/importMap.js` after adding custom admin components (run this when changing `admin.components` references).
- `pnpm jobs:run` — Run the default job queue once (used by the `payload-worker` service in Docker).

Migrations live in `src/migrations/` with an `index.ts` barrel. After changing schema run `pnpm payload migrate:create` then commit both the `.ts` and `.json` files.

## Architecture

This is a **Payload CMS 3 + Next.js 15 (App Router)** portal that lets authors compose deck content as typed blocks, then builds a [Slidev](https://sli.dev) SPA + PDF out-of-process.

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

   **Invariant:** when you add a new layout block, you must update *all* of: `src/blocks/<Name>Block.ts`, `src/collections/Presentations.ts` (add to the blocks array), `src/export/blocks/<name>.ts` (renderer + type), `src/export/buildSlidesMd.ts` (union + RENDERERS map), `src/app/(frontend)/preview/page.tsx` (RENDERERS map), and the Zod schema in the draft route if it should be AI-draftable. Keep new blocks **use-case-agnostic** — fields should describe visual structure (title, eyebrow, cards, columns…), never domain concepts (office, testimonial, contact row…).

### Slidev workspace isolation

`slidev-workspace/` is a **separate pnpm project** with its own `node_modules` for `@slidev/cli`, `@slidev/theme-default`, `vue`, and `playwright-chromium`. This keeps Slidev's deep Vue/Vite tree out of the Next.js bundle. The Dockerfile has a dedicated `slidev-deps` stage for it and installs the Chromium binary via `npx playwright-chromium install chromium` in the final image. The build job finds the binary via `join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev')` — do not replace this with `npx` or a global install.

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

`@ai-stack/payloadcms` is **not** wired up — it crashed the admin client-side render. AI drafting goes through the custom `draft-presentation` route, which is the single source of truth for the block Zod schemas the LLM must match. The `SYSTEM_PROMPT` in that file is deliberately use-case-agnostic — don't inject domain vocabulary, company names, or industry terms; the LLM is supposed to pick up tone from the user's brief.

## Environment

Required: `DATABASE_URL`, `PAYLOAD_SECRET`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SERVER_URL`. Optional: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. See `.env.example`.

Production runs three services (`docker-compose.yaml`): `postgres`, `payload` (web), `payload-worker` (runs `pnpm jobs:run` in a loop). Media is a shared host volume mounted at `/app/media` on both `payload` and `payload-worker` so the worker can write `spa/<slug>/` where the web process serves it.
