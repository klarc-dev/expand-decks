# 00 — Feature Inventory

**Repo:** Expand Decks — Payload CMS 3 + Next.js 15 portal that turns typed slide *blocks* into Slidev SPAs + PDFs.
**Date:** 2026-06-03
**Method:** Feature Discovery subagent (Explore) + orchestrator consolidation. Discovery proposed 12 units; orchestrator merged cross-cutting/infra units into a single note and paired auth+access, hook+job into single happy-path features.

## Scope decisions

- **Merged `build-queue-trigger` + `slidev-build-job` → `build-pipeline`** — one continuous happy path (publish → hook → queue → job → artifacts).
- **Merged `admin-auth-oauth` + `access-control-roles` → `auth-and-access`** — one trust concern (who you are + what you may do).
- **Folded `live-preview-admin` + per-block `SlidePreview` → `preview`** — both reuse the same render core to show HTML in the admin.
- **Cross-cutting / infra (no dedicated happy-path flowchart):** `content-storage` (Postgres adapter + migrations), `media-asset-management` (Media collection upload, consumed by authoring + build), `deployment-services` (Dockerfile + docker-compose). These are noted where they intersect each feature's flow.

## Flowchartable features

### 1. content-authoring
Typed block schema + Presentations collection + admin form (3 tabs) where authors compose decks.
- **Entry:** `src/collections/Presentations.ts:15` (`Presentations: CollectionConfig`); blocks array `:63–73`
- **Core:** `src/collections/Presentations.ts`, `src/blocks/{Cover,Section,Statement,TwoCols,CardGrid,Stats,Quotes,Cta,Markdown}Block.ts`
- **Calls into:** auth-and-access (access predicates), media (image upload fields), preview (per-block `SlidePreview` UI field), build-pipeline (afterChange hook)

### 2. ai-draft-generation
Brief → Claude (LiteLLM proxy) → validated blocks patched onto the presentation.
- **Entry:** `src/app/(payload)/api/draft-presentation/route.ts:176` (`POST`); UI `src/components/DraftFromBriefButton.tsx:20` (`handleGenerate`)
- **Core:** `route.ts` (Zod schemas `:9–117`, `SYSTEM_PROMPT :123–174`), `DraftFromBriefButton.tsx`
- **Calls into:** auth-and-access (`payload.auth` `:181`), content-authoring (writes `slides`), build-pipeline (sets `skipBuildQueue` `:226`)

### 3. markdown-export
Pure functions: blocks → Slidev markdown (frontmatter + HTML). Shared render core.
- **Entry:** `src/export/buildSlidesMd.ts:61` (`buildSlidesMd`); 9 renderers e.g. `src/export/blocks/cover.ts:15`
- **Core:** `buildSlidesMd.ts` (RENDERERS map `:32–42`), `src/export/blocks/*.ts` (9), `src/export/utils.ts`, `src/export/headmatter.yaml`
- **Calls into:** none (pure)

### 4. build-pipeline
afterChange hook gates → queues `buildSlides` job → Slidev build/export → upload PDF + SPA → patch presentation.
- **Entry:** `src/hooks/afterPresentationChange.ts:20`; job `src/jobs/buildSlides.ts:49` (handler `:69–196`)
- **Core:** `afterPresentationChange.ts`, `buildSlides.ts`, `slidev-workspace/`
- **Calls into:** markdown-export (`buildSlidesMd :95`), media (PDF create `:142`), content-storage (status/URL patch), deployment (worker + media volume)

### 5. preview
Live full-deck preview (`/preview`) + per-block preview field, both client-rendered from the same renderers.
- **Entry:** `src/app/(frontend)/preview/page.tsx:60` (`PreviewPage`); `src/components/SlidePreview.tsx:39`
- **Core:** `preview/page.tsx`, `SlidePreview.tsx`, `src/export/style.css`; config `Presentations.ts:21–23`, `payload.config.ts:35–42`
- **Calls into:** markdown-export (renderers), auth-and-access (live-preview is admin-gated)

### 6. share-links
Tokenized expiring public links; only `sha256(token)` stored; gated SPA file serving with path-traversal guards.
- **Entry:** `src/collections/ShareLinks.ts:11`; `src/app/(frontend)/share/[token]/page.tsx:10`; `.../spa/[...path]/route.ts:40`
- **Core:** `ShareLinks.ts` (before/after hooks `:25–57`), share page, spa file route
- **Calls into:** auth-and-access (`isAdminOrAuthor`), content-storage (link lookup, viewCount), build-pipeline output (`media/spa/<slug>/`)

### 7. auth-and-access
Google OAuth login (payload-auth-plugin), boot-time admin seed, role-based access predicates wired into every collection.
- **Entry:** `src/payload.config.ts:46–62` (authPlugin), `:63–90` (onInit seed); `src/access/roles.ts:3–20`
- **Core:** `payload.config.ts`, `roles.ts`, `Users.ts`, `Accounts.ts`, `GoogleLoginButton.tsx`
- **Calls into:** content-storage (user upsert)

## Cross-cutting / infra (intersection notes only)
- **media-asset-management** — `src/collections/Media.ts`; consumed by content-authoring (block `image` fields) and produced by build-pipeline (PDF + thumbnail).
- **content-storage** — `src/payload.config.ts:91–95` (postgresAdapter), `src/migrations/index.ts` (empty barrel; schema in flux on this branch).
- **deployment-services** — `Dockerfile`, `docker-compose.yaml` (3 services: `postgres`, `payload`, `payload-worker`).
