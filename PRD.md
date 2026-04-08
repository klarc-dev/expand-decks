# PRD — Expand Decks

**Owner:** Joachim Brindeau
**Status:** Draft v0.4
**Last updated:** 2026-04-08
**Location:** `expand/production/slides/`

---

## 1. Summary

A self-hosted presentation portal where the Expand team (lawyers, accountants, IP consultants) can **create, edit, browse, view, share, and comment on** presentations through an AI-assisted block editor — then publish them as Slidev-rendered SPAs and PDFs, without ever touching markdown, git, or Vue.

**The stack decision:** **fork [`allweonedev/presentation-ai`](https://github.com/allweonedev/presentation-ai)** (2,714★, MIT, Next.js 16 + Plate.js + Prisma + NextAuth + Vercel AI SDK + Postgres) — an open-source Gamma clone that already includes every major subsystem we'd otherwise build: block editor, auth, DB, AI pipeline, 38 themes, sharing, presentation mode, image generation. **Our work reduces to ~20% of the original PRD scope.**

**Division of labor:**
- **presentation-ai fork (base)** — provides: Next.js 16 + React 19 shell, Plate.js block editor, NextAuth v5 auth with roles, Prisma/Postgres schema, Vercel AI SDK integration with LangChain/LangGraph, 38 themes + theme editor, public sharing, image generation (fal.ai/OpenAI/Together/Ollama), presentation mode, PPTX export. MIT licensed.
- **Our custom work** — (1) swap OpenAI → Claude via `@ai-sdk/anthropic`, (2) constrain the Plate block schema to a curated set of Slidev-compatible blocks, (3) write a **Slidev exporter** that walks the Plate document and emits `slides.md` with a Klarc-themed renderer per block type, (4) build a `klarc` theme pack that matches the existing deck at `tasks/2026-04-07-klarc-slidev/`, (5) French-language UI, (6) Coolify deployment config.
- **Slidev** — rendering engine (unchanged). Receives the generated `slides.md` and produces the SPA + PDF.
- **Claude** — **core, not optional.** Powers: initial deck drafting from a brief, per-block rewriting (shorten, formalize, translate), theme suggestions, slide reordering suggestions. Uses structured tool calls via Vercel AI SDK v6 against our constrained block schema.
- **Coolify** — deploys the Next.js + Postgres + MinIO stack as one `docker-compose.yml`.

**The revised bet:** stop designing a bespoke CMS. Fork a popular, MIT-licensed, actively-maintained AI slide generator that already wires block editor + AI + auth + DB + sharing + themes. Spend the saved time on the parts that are unique to Expand: Slidev output fidelity, the Klarc theme pack, and French/IP-consulting-specific workflows.

---

## 2. Problem

Slidev is a developer-first, markdown-based presentation tool. The authoring experience is excellent for the engineer (me), but the rest of the Expand team has no way to:

- **Find** presentations that already exist
- **View** them without asking me for a PDF
- **Comment** on a deck during review
- **Request** a new deck with a structured brief
- **Share** a link with a client securely

Research (see `tasks/2026-04-07-klarc-slidev/` conversation log) confirmed:

- Slidev has **no hosted editor, no cloud, no collaboration layer** (verdict v52.14.2, April 2026).
- Only one community visual-editor PoC exists (`slidev-addon-visual-editor`, 0 stars, abandoned).
- Round-trip editing from PPTX back to markdown is impossible — PPTX exports are rasterized.
- There is no working Notion/Google Docs → Slidev converter.

**Conclusion:** Slidev alone cannot be the editor. We layer a proper collaborative markdown editor (**Proof**) on top, keep Slidev as the renderer, and let AI agents bridge the two.

---

## 3. Goals & non-goals

### Goals

1. **One URL** the team opens to find any presentation Expand has ever made.
2. **Structured editing** — the team picks a layout from a dropdown, fills typed fields, and sees a published deck in seconds. No markdown syntax, no Vue, no frontmatter.
3. **Deterministic builds** — the same Payload state always produces the same `slides.md`. No AI in the hot path.
4. **Reduce custom coding** — Payload's Blocks field and admin UI do 90% of the work. We write one `blocksToSlidesMd` function + one Coolify worker.
5. **Self-hosted on Coolify** alongside existing Expand infrastructure.
6. **French-language UI**.
7. **External client sharing** via signed, expiring links.
8. **Design fidelity** — the finished deck looks exactly like the Klarc presentation we already built (teal/rose, Fraunces, custom cards), because the layouts *are* the Klarc theme expressed as Payload blocks.

### Non-goals (explicitly out of scope)

- **WYSIWYG visual slide editing** (click-and-drag on the rendered slide). Editing happens on the typed form.
- **Replacing Slidev** as the rendering engine.
- **LLM-in-the-loop assembly** for MVP. Deterministic templating is simpler, faster, cheaper, and more debuggable. AI drafting is v1.1.
- **Notion/Google Docs → Slidev conversion.** Not needed.
- **PPTX round-trip.** Impossible.
- **Custom admin panel.** Payload provides one free.
- **Unlimited layout flexibility.** The team can only use layouts we've defined as blocks. Adding a new layout = a developer task (me), not a team task.

---

## 4. Users

| Persona | Who | Primary needs |
|---|---|---|
| **Lawyer / Consultant** | Benjamin, Samuel, Carine at Klarc, and future Expand hires | Browse decks by client/topic, view in browser, download PDF, leave comments during review |
| **Partner / Commercial** | Client-facing team members | Share a deck with a prospect via expiring link, track views |
| **Author (me)** | Joachim | Create/update decks from `slides.md`, publish to the portal via CLI or CI, manage metadata |
| **External client** | Klarc, Bloom, Cetrac, etc. | Open a shared deck link (no login), read-only view |

---

## 5. User stories (MVP)

**Browsing**
- As a team member, I log in and see a list of all presentations with thumbnails, titles, clients, and dates.
- I can filter by client, status (draft/published/archived), tag, or author.
- I can search by title or client name.

**Viewing**
- I click a presentation and see: metadata, cover thumbnail, download-PDF button, "Open deck" button that loads the live Slidev SPA in a new tab.
- I can see all previous versions of a deck.

**Commenting**
- On any presentation, I can leave a comment tied to a specific slide number.
- Comments are threaded and timestamped.
- The author gets notified (email) when comments are added.

**Requesting**
- I can create a "Deck request" with a brief: client, purpose, audience, deadline, key messages.
- The author sees new requests in a queue.

**Sharing externally**
- The author generates a signed, expiring link (7/30/90 days) for a specific deck.
- External viewer opens the link without login, sees only that deck, no navigation to the rest.

**Publishing (author-side)**
- From my laptop, I run `slides publish ./slides.md` (a small CLI we write).
- It builds Slidev → SPA + exports PDF → uploads both to the portal's storage → creates/updates the deck record via Payload API.
- Team sees the new deck within 30 seconds.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Hosting** | Coolify-deployable. Single `docker-compose.yml` or Coolify service template. |
| **Auth** | Email/password for team; magic-link signed URLs for external viewers. OIDC (Google Workspace) as a v1.1 enhancement. |
| **Storage** | Postgres for metadata; S3-compatible (Cloudflare R2 or MinIO) for PDFs and built SPAs. |
| **Performance** | Deck list loads < 1s. Opening a published SPA loads < 2s. |
| **Backups** | Postgres daily dump to R2/MinIO; media files already in object storage. |
| **Security** | HTTPS via Coolify's Let's Encrypt. Signed URLs for external access. No public listing. |
| **Language** | UI in French (Payload admin supports i18n out of the box). |
| **Audit** | Every publish, delete, and share action logged with user + timestamp. |

---

## 7. Technical architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                             Coolify host                             │
│                                                                      │
│  ┌─────────────────────────┐     ┌────────────────┐    ┌─────────┐ │
│  │       Payload CMS       │     │    Postgres    │    │  MinIO  │ │
│  │     (Next.js 15)        │────▶│   (metadata)   │    │  (S3)   │ │
│  │                         │     └────────────────┘    └─────────┘ │
│  │  Presentations coll.    │                               ▲        │
│  │  ├─ title, client       │                               │        │
│  │  ├─ slides: Blocks[]    │                               │        │
│  │  │   ├─ CoverBlock      │                               │        │
│  │  │   ├─ SectionBlock    │                               │        │
│  │  │   ├─ TwoColsBlock    │                               │        │
│  │  │   ├─ CardGridBlock   │                               │        │
│  │  │   ├─ StatsBlock      │                               │        │
│  │  │   ├─ TestimonialsBlk │                               │        │
│  │  │   ├─ CtaBlock        │                               │        │
│  │  │   ├─ EndBlock        │                               │        │
│  │  │   └─ MarkdownBlock   │  (escape hatch)               │        │
│  │  ├─ theme: select       │                               │        │
│  │  ├─ pdfFile             │                               │        │
│  │  ├─ spaUrl              │                               │        │
│  │  └─ versions[]          │                               │        │
│  │                         │                               │        │
│  │  afterChange hook ──┐   │                               │        │
│  └─────────────────────┼───┘                               │        │
│                        │                                    │        │
│                        ▼                                    │        │
│  ┌──────────────────────────────────────────────────────┐  │        │
│  │            Builder Worker (Node)                     │  │        │
│  │                                                       │  │        │
│  │  1. blocksToSlidesMd(presentation, theme)            │  │        │
│  │     → deterministic TS template → slides.md          │  │        │
│  │  2. slidev build → dist/                             │  │        │
│  │  3. slidev export → slides-export.pdf                │  │        │
│  │  4. pdftoppm page 1 → cover.png                      │  │        │
│  │  5. Upload dist/ + PDF + cover to MinIO ─────────────┼──┘        │
│  │  6. PATCH /api/presentations/:id with new version    │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
        ▲                                 ▲
        │ HTTPS                           │ HTTPS
   ┌────┴──────────────┐          ┌───────┴──────────┐
   │  Team member      │          │  External client │
   │  Payload admin UI │          │  Signed link     │
   │  (edit + browse)  │          │  (view only)     │
   └───────────────────┘          └──────────────────┘
```

### Flow (write path)

1. Team member opens `decks.expand.fr` → logs into Payload → clicks "New presentation".
2. Fills in title, client, theme preset.
3. In the **Slides** field, clicks "Add block" → picks a layout from the dropdown (Cover, Section, Two cols, Card grid, Stats, Testimonials, CTA, End, or Markdown escape hatch).
4. Fills the typed fields for that block (title, eyebrow, subtitle, bullets, etc. — whatever the block schema defines).
5. Reorders slides by drag-and-drop. Duplicates any slide.
6. Clicks "Save".
7. Payload's `afterChange` hook on the `Presentations` collection enqueues a build job.
8. The **Builder Worker** runs `blocksToSlidesMd(presentation, theme)` — a deterministic TypeScript function that maps each block to its Slidev template. Then `slidev build` → `slidev export` → thumbnail → upload to MinIO → `PATCH` back to Payload with new version + media IDs.
9. Team member refreshes the detail page and sees the new PDF, the updated live SPA in the preview iframe, and version history.

### Flow (read path)

1. Team member browses the Presentations collection in Payload admin — list view with cover thumbnails, client, status, modified date.
2. Clicks a row → sees metadata, the block editor, and a preview iframe pointing at `spaUrl`.
3. Downloads the PDF or clicks "Open in new tab" for the live deck.
4. External client receives a signed link → opens a minimal public page with just the SPA and a PDF download button. No login.

### Stack decisions

**Editor + portal + auth — [Payload CMS](https://payloadcms.com) (32k★, MIT, Next.js 15 native).**

Why Payload is the entire MVP frontend:
- **Blocks field solves the structured-slide problem.** Payload's native [Blocks field](https://payloadcms.com/docs/fields/blocks) is designed for exactly this — an array of typed, polymorphic content blocks with their own schemas. Every major Payload tutorial uses it for page builders. We use it for slide builders.
- **Admin UI is the team's frontend.** List view with search/filter/thumbnails, detail page with the block editor, media library, versions, drafts, role-based access, audit logs — all out of the box.
- **Deterministic builds.** Because the data is typed, the transformation to `slides.md` is a pure function. Unit-testable, debuggable, deterministic. No LLM inference to go wrong.
- **Popular + Coolify-ready.** Official Docker image, weekly releases, production users like Microsoft and American Express. Coolify community templates exist.
- **Collections = data model in TS.** We define `Presentations`, `Clients`, `ShareLinks` once; Payload auto-generates the admin UI, REST/GraphQL API, TypeScript types.
- **Field-level access control.** Team sees everything; external viewers see only their signed-link deck.

**Rendering — Slidev** (unchanged).

**Optional layers (not in MVP):**

| Layer | Purpose | Status |
|---|---|---|
| **Proof SDK** | Real-time multiplayer on individual prose fields inside blocks (e.g., a long-form `body` slot in a Markdown block). | v1.1. Embed Proof only for fields that need it. Payload's built-in Lexical editor is fine for MVP. |
| **Claude API** | Draft generator ("create a 10-slide pitch for Klarc about X") that populates the blocks array via the Payload REST API. Also a rewrite helper per slide. | v1.1. Invoked on demand from a custom admin button, not in the build loop. |

**Alternatives considered and rejected:**

| Option | Why not |
|---|---|
| **Proof as the primary editor (v0.2 approach)** | Rejected because the structure of a slide is lost in a flat markdown doc. Claude has to guess layouts, which is slow, expensive, non-deterministic, and breaks as soon as the theme changes. Typed blocks fix all four problems at once. |
| **Payload with a single markdown field per presentation** | The team would still have to write `---` separators, pick layouts in frontmatter, and understand Slidev syntax. Typed blocks eliminate this. |
| [Directus](https://directus.io) | Has a "repeatable group" field equivalent to Blocks. Strong runner-up; rejected only because Payload's Next.js-native stack has slightly better DX for the one-file `blocksToSlidesMd` implementation. |
| [Strapi](https://strapi.io) | Has dynamic zones (equivalent to Blocks). License concerns (SSPL on enterprise features) and heavier stack. |
| Custom Next.js + Yjs/Liveblocks | Weeks of custom UI work. Contradicts "reduce custom coding". |
| `slidev-ai` | LLM generator, not a portal. Different product. |

### Data model (Payload collections)

```ts
// ─── Presentations ───────────────────────────────────────────────
{
  title: string               // "Klarc — L'innovation à 360°"
  slug: string                // "klarc-innovation-360"
  client: relationship → Clients
  status: select              // draft | published | archived
  tags: select[multi]         // "pitch", "formation", "client"
  language: select            // fr | en
  themePreset: select         // "klarc" | "expand-neutral" | "klarc-dark"

  slides: blocks[]            // ← the typed slide array (see block schemas below)

  pdfFile: upload → Media     // set by builder worker
  spaUrl: text                // set by builder worker
  coverImage: upload → Media  // set by builder worker (page 1 of PDF)
  lastBuildStatus: select     // idle | building | success | failed
  lastBuildError: textarea    // stack trace if failed
  version: number             // auto-incremented on publish
  versions: array             // [{ pdfFile, spaUrl, builtAt, version }, ...]
  publishedAt: date
  author: relationship → Users
}

// ─── Block schemas (each block = one Slidev layout) ──────────────

// CoverBlock → layout: cover, dark surface
{
  blockType: 'cover'
  eyebrow: text               // "Conseil en innovation · Lyon · Toulouse"
  title: text                 // "L'innovation à 360°"
  subtitle: textarea          // paragraph below the hero
  footerLeft: text            // e.g. "Découvrir Klarc →"
  footerRight: text           // e.g. "Fondé en 2023 · 5/5"
  surface: select             // "dark" | "light" | "gradient"
}

// SectionBlock → layout: center, numbered section divider
{
  blockType: 'section'
  number: text                // "02"
  title: text                 // "Klarc redéfinit le conseil en innovation."
  subtitle: textarea
  surface: select             // "dark" | "light"
}

// StatementBlock → layout: center, large quote-style
{
  blockType: 'statement'
  eyebrow: text
  title: text                 // "L'innovation est fragmentée."
  body: textarea
  footer: text                // footer caption
}

// TwoColsBlock → layout: default, k-split grid
{
  blockType: 'twoCols'
  eyebrow: text               // "— 01 · Conseil financier"
  title: text                 // "Financer l'innovation, intelligemment."
  intro: textarea
  leftFooter: textarea        // optional stat block
  rightCards: array of {
    title: text               // "Aides & subventions"
    description: textarea     // "Sourcing, montage, défense face aux..."
  }
}

// CardGridBlock → layout: default, 4-column grid
{
  blockType: 'cardGrid'
  eyebrow: text               // "Nos expertises"
  title: text                 // "Quatre pratiques, une synergie."
  sidebarText: textarea       // optional
  columns: select             // 2 | 3 | 4
  cards: array of {
    number: text              // "— 01"
    title: text               // "Conseil financier"
    description: textarea
  }
}

// StatsBlock → layout: center, row of value/label pairs on dark surface
{
  blockType: 'stats'
  eyebrow: text               // "La synergie Klarc"
  title: text                 // "Un seul interlocuteur."
  surface: select             // "dark" | "light"
  stats: array of {
    value: text               // "1", "4", "360°"
    label: text               // "Point de contact"
  }
}

// TestimonialsBlock → layout: default, 3-column quote grid
{
  blockType: 'testimonials'
  eyebrow: text               // "Témoignages"
  title: text                 // "Ils nous font confiance."
  rating: text                // "5/5 · 28 avis"
  quotes: array of {
    quote: text
    authorName: text
    authorRole: text          // "Directeur innovation · Arboretum Ingredients"
  }
}

// OfficesBlock → layout: default, 2-column office cards
{
  blockType: 'offices'
  eyebrow: text               // "Présence"
  title: text
  subtitle: textarea
  offices: array of {
    name: text                // "Lyon"
    region: text              // "Auvergne-Rhône-Alpes"
    label: text               // "— Bureau Sud-Est"
    specialties: text         // "Biotech · Medtech · Green tech"
  }
}

// CtaBlock → layout: center, dark surface with contact row
{
  blockType: 'cta'
  eyebrow: text               // "Prêt à concrétiser votre projet ?"
  title: text                 // "Parlons de votre innovation."
  primaryAction: text         // "Prendre rendez-vous →"
  secondaryAction: text       // "+33 5 25 63 09 36"
  contactRows: array of {
    label: text               // "Web" / "Lyon" / "Toulouse"
    value: text
  }
}

// EndBlock → layout: center, dark surface
{
  blockType: 'end'
  wordmark: text              // "Klarc"
  tagline: text               // "L'innovation à 360°"
  footerNote: text            // "Merci — klarc.com"
}

// MarkdownBlock → escape hatch for arbitrary Slidev markdown (power user)
{
  blockType: 'markdown'
  layout: text                // any valid Slidev layout name
  frontmatter: code(yaml)     // raw YAML frontmatter
  content: code(markdown)     // raw slide content
}

// ─── Clients ─────────────────────────────────────────────────────
{
  name: string                // "Klarc"
  slug: string
  logo: upload → Media
  color: text                 // brand color for UI tinting
  notes: richText
}

// ─── ShareLinks ──────────────────────────────────────────────────
{
  presentation: relationship → Presentations
  token: text (unique, auto-generated)
  expiresAt: date
  createdBy: relationship → Users
  viewCount: number
  lastViewedAt: date
}

// ─── DeckRequests (v1.1) ─────────────────────────────────────────
{
  title: string
  client: relationship → Clients
  brief: richText
  deadline: date
  requestedBy: relationship → Users
  status: select              // requested | drafting | in_review | delivered
  resultingPresentation: relationship → Presentations
}

// ─── Comments (v1.1) ─────────────────────────────────────────────
{
  presentation: relationship → Presentations
  slideIndex: number
  author: relationship → Users | text (for external)
  body: richText
  createdAt: date
  resolved: checkbox
}
```

### Theme system

Each `themePreset` points to a **Theme package** inside the builder:

```
builder/
├── themes/
│   ├── klarc/
│   │   ├── headmatter.yaml    # Slidev headmatter (fonts, colors, defaults)
│   │   ├── style.css          # the Klarc design system (already exists)
│   │   └── blocks/            # one renderer per block type
│   │       ├── cover.ts       # (block: CoverBlock) => string (Slidev markdown)
│   │       ├── section.ts
│   │       ├── twoCols.ts
│   │       ├── cardGrid.ts
│   │       ├── stats.ts
│   │       ├── testimonials.ts
│   │       ├── offices.ts
│   │       ├── cta.ts
│   │       ├── end.ts
│   │       └── markdown.ts
│   └── expand-neutral/
│       └── ...
└── buildSlidesMd.ts           # pure function: (presentation, theme) => string
```

Each block renderer is a pure TypeScript function. Example:

```ts
// themes/klarc/blocks/cover.ts
export function renderCover(block: CoverBlock): string {
  return `---
layout: cover
class: relative
---

<div class="k-dark absolute inset-0 flex flex-col justify-between p-14 k-cover">
  <div class="flex items-center justify-between">
    <div class="k-logo text-2xl">Klarc</div>
    <div class="text-xs tracking-[0.2em] uppercase opacity-60">${escape(block.footerRight)}</div>
  </div>
  <div class="flex-1 flex items-center">
    <div class="max-w-4xl">
      <div class="k-eyebrow mb-8 k-anim-1">${escape(block.eyebrow)}</div>
      <h1 class="k-hero-big mb-10 k-anim-2">${md(block.title)}</h1>
      <p class="k-hero-sub k-anim-3">${escape(block.subtitle)}</p>
    </div>
  </div>
  ${block.footerLeft ? `<div class="k-btn k-anim-4">${escape(block.footerLeft)}</div>` : ''}
</div>`
}
```

The full `klarc` theme is already implemented as a `style.css` + markdown patterns in the existing `tasks/2026-04-07-klarc-slidev/` deck. **Porting it to typed block renderers is a copy-paste exercise** — every layout we used in the Klarc deck becomes one block renderer. Estimated effort: ½ day.

### Publish pipeline — Builder Worker

A small Node service (~300 lines total) running as its own Coolify container. **No LLM in the hot path.**

**Trigger:** Payload `afterChange` hook on the `Presentations` collection pushes a job to a lightweight queue (Postgres LISTEN/NOTIFY, Redis, or a plain table poll). The worker picks it up.

**Steps:**

1. **Fetch the presentation** from Payload REST API (or directly from Postgres).
2. **Run `buildSlidesMd(presentation, theme)`** — a pure TypeScript function that iterates over `presentation.slides[]`, dispatches each block to its renderer in the selected theme, and concatenates the output with Slidev's `---` separators plus a theme headmatter prefix. **Deterministic, unit-testable, ~150 lines.**
3. **Write** the result to `./workdir/<presentationId>/slides.md`.
4. **Copy** `themes/<theme>/style.css` and any static assets into `./workdir/<presentationId>/`.
5. **Run `slidev build`** → `./workdir/<presentationId>/dist/` (static SPA).
6. **Run `slidev export`** → `./workdir/<presentationId>/slides-export.pdf`.
7. **Generate cover thumbnail** from page 1 of the PDF using `pdftoppm` or `sharp`.
8. **Upload artifacts**:
   - PDF → Payload media collection
   - Built SPA → MinIO at `slides-spa/<slug>/v<version>/`
   - Cover thumbnail → Payload media
9. **PATCH** the Payload Presentation record with new `version`, `pdfFile`, `spaUrl`, `coverImage`, `publishedAt`, `lastBuildStatus: success`.
10. **On failure**, write the stack trace to `lastBuildError`, set status to `failed`. Team sees an error badge on the record.

**Expected worker budget:** 1 build per save, ~20-30 seconds end-to-end (Slidev's Chromium export is the dominant cost). Debounce saves by 3 seconds to avoid thrashing during active editing.

**Hosting built SPAs:** extract each Slidev build into `slides-spa/<slug>/v<version>/` on MinIO with a public-read policy (or signed URLs for private decks), exposed via a CDN-like path such as `https://decks.expand.fr/spa/klarc-innovation-360/v3/index.html`. The Payload record's `spaUrl` field stores the current version's URL.

**Manual author override:** I keep a local `slides import ./slides.md` CLI that uploads a hand-authored Slidev deck directly as a single `MarkdownBlock` in the presentation. Useful for the initial Klarc deck migration and for power cases where I want to bypass blocks entirely.

---

## 8. Coolify deployment

Single `docker-compose.yml` with four services:

```yaml
services:
  payload:
    image: <custom>/expand-decks-payload:latest
    environment:
      DATABASE_URI: postgres://payload:...@postgres:5432/payload
      PAYLOAD_SECRET: ${PAYLOAD_SECRET}
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: expand-decks
    depends_on: [postgres, minio]
    ports: ['3000:3000']

  builder:
    image: <custom>/expand-decks-builder:latest
    environment:
      PAYLOAD_URL: http://payload:3000
      PAYLOAD_API_KEY: ${PAYLOAD_API_KEY}
      DATABASE_URI: postgres://payload:...@postgres:5432/payload  # for LISTEN/NOTIFY
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: expand-decks
    depends_on: [payload, postgres, minio]

  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes: [miniodata:/data]
```

Coolify handles:
- TLS certificates (Let's Encrypt) on `decks.expand.fr` → payload
- Environment variables and secret management
- Automatic redeploys on git push to the `expand-decks` repo
- Backups of `pgdata` and `miniodata` volumes

**Expected resource footprint:** ~1.5 GB RAM, ~10 GB disk for MVP. The builder worker can spike during `slidev build` / `slidev export` (headless Chromium via Playwright) — budget 1 GB at peak.

**Why only four services vs the previous five:** no Proof server in MVP. Adding Proof later only means adding a `proof` service and embedding its editor inside one or two specific block fields. The rest of the architecture doesn't change.

---

## 9. MVP scope

### In scope for v1.0 (fork + adapt `allweonedev/presentation-ai`)

- **Fork the repo** and get it running locally + deployed to Coolify with Postgres
- **Swap OpenAI for Claude** via `@ai-sdk/anthropic` (already supported by the Vercel AI SDK layer the fork uses)
- **Constrain the Plate block schema** to a curated set mapping cleanly to Slidev layouts: Cover, Section, Statement, TwoCols, CardGrid, Stats, Testimonials, Offices, CTA, End
- **Write the Slidev exporter**: a function `plateDocToSlidesMd(doc, theme)` that walks the Plate document tree and emits a valid `slides.md`, plus a `klarc` theme pack (port of the existing `tasks/2026-04-07-klarc-slidev/style.css`)
- **Add a build endpoint** that runs `slidev build` + `slidev export` server-side (new API route) and uploads PDF + SPA to S3/MinIO
- **French UI** — translate the base UI strings
- **NextAuth config** for 5–10 team members (email/password to start; Google Workspace OIDC in v1.1)
- **Migrate the existing Klarc deck** as the first presentation to validate the exporter against a known-good reference
- **Coolify deployment** — single `docker-compose.yml` with Next.js app + Postgres + MinIO

**Explicit MVP success test:** a colleague (not me) opens the portal, clicks "New presentation", types "Generate a 10-slide pitch for Klarc about IP strategy for biotech", Claude drafts the blocks, the colleague tweaks a few fields, clicks "Publish", and within 60 seconds sees a downloadable PDF and a live SPA that visually matches the existing Klarc deck's design language.

### v1.1

- **Two more theme presets**: `expand-neutral`, `klarc-dark`
- **Google Workspace OIDC** login via Payload auth plugins
- **Deck requests collection** (team fills a brief, author or Claude drafts the blocks)
- **Claude draft button** in the admin: "Draft a pitch for Klarc about topic X" → populates the slides blocks via Payload REST API
- **Claude rewrite button** per block: "Shorten this", "More formal tone", "Translate to English"
- **Comments** collection tied to specific slide indices
- **View analytics** on signed share links
- **Drag-and-drop reordering** of slides (should be native to Payload Blocks field)

### v1.2 (optional Proof layer)

- **Embed Proof SDK** inside the `body` field of the MarkdownBlock and any long-prose slots (e.g., `intro` on TwoCols, `body` on Statement)
- Self-host a Proof Server as a 5th Coolify service
- Wire Payload's user identity to Proof via the agent bridge so the team gets presence cursors and comments on prose blocks specifically
- Add this only if the team asks for real-time prose collaboration — most blocks are short fields where Lexical is fine

### v2.0+ (speculative)

- **Sync with Klarc (Budibase)** so each `dossier` auto-links to its presentations
- **Agent-native publishing**: Claude Code can call a Payload API tool that creates a presentation from a brief
- **Custom block types per client** — e.g., a Klarc-specific "IP portfolio summary" block that pulls live data from Budibase
- **Review workflow**: lock a version, request approvals, audit trail
- **In-app PDF annotation** that writes back to Comments collection

---

## 10. Open questions

1. **Block granularity.** For the CardGrid block, is it better to have a single block with a `cards[]` array (current design) or to make each card its own block that groups under a "CardGrid container"? Array-inside-block is simpler; nested blocks give finer ordering. **Recommended:** array inside block for MVP; revisit if the team wants to shuffle individual cards across slides.
2. **Markdown escape hatch scope.** The `MarkdownBlock` lets a power user write raw Slidev markdown. Should this be visible to all team members or gated to an "Author" role? **Recommended:** gate it to Authors for MVP to prevent accidental layout breakage.
3. **Theme swap behavior.** If I change `themePreset` on an existing presentation, the same blocks get rendered through a different theme's renderers. This should "just work" as long as all themes implement all block types. **Decision:** enforce that all themes must implement all block types (or explicitly mark some as unsupported). Part of the theme contract.
4. **Build queue.** For MVP a single worker with a Postgres LISTEN/NOTIFY queue is enough. If we ever have ≥5 team members editing at once, we need a proper queue (BullMQ/Redis). **Recommended:** Postgres NOTIFY for v1.0, swap in BullMQ if contention appears.
5. **Versions retention.** Every save creates a new `version` record with a full PDF + SPA. Disk usage grows linearly. **Recommended:** keep the last 10 versions + all published versions; prune drafts older than 30 days.
6. **Domain** — `decks.expand.fr`? `slides.klarc.com`? Dual-branded?
7. **Object storage** — MinIO on the Coolify host, or Cloudflare R2 for lower egress and offsite durability? R2 is probably cheaper long-term.
8. **Existing Expand SSO** — is there an OIDC provider to integrate now, or is email/password fine for MVP?
9. **Design partner.** Pick one persona (Carine or Samuel?) to validate the block editor before broad rollout.
10. **First migration.** Import `tasks/2026-04-07-klarc-slidev/slides.md` as the first Presentation. Do we (a) ingest it as a single MarkdownBlock and refactor manually, or (b) write a one-off parser that extracts the existing slides into typed blocks? **Recommended:** (a) — ingest as one MarkdownBlock, then manually duplicate each slide's structure into typed blocks. This validates both the escape hatch and every block schema in one exercise.
11. **Rich-text vs text fields.** For block fields like `subtitle` and `intro`, do we use Payload's Lexical (rich text) or plain textarea? Rich text gives inline formatting but complicates the renderer. **Recommended:** plain text for MVP; upgrade specific fields to rich text as the team asks for formatting.
12. **Proof SDK layering (v1.2).** If we add Proof later, is it per-field (embed in one block slot at a time) or per-presentation (one Proof doc backing the whole slide sequence)? Per-field integrates cleanly with the block model; per-presentation breaks the determinism. **Recommended:** per-field only.

---

## 11. Success criteria

- ✅ A new Expand colleague can open `https://decks.expand.fr`, log in, and find any deck within 30 seconds without asking me.
- ✅ A non-tech colleague can create a new presentation using only the block picker and typed fields, without ever seeing markdown or YAML.
- ✅ A single save triggers a deterministic rebuild that produces a new PDF + SPA in ≤ 30 seconds.
- ✅ Two colleagues can edit different blocks on the same presentation concurrently without conflicts (last-write-wins on a single block is acceptable for MVP).
- ✅ An external client can open a deck from a shared link without creating an account.
- ✅ The builder function `buildSlidesMd(presentation, theme)` is **pure and unit-tested** — same input → same output → same PDF byte-for-byte (modulo PDF timestamps).
- ✅ **Zero hand-written UI code for MVP.** Only the block renderers (copy-paste from the existing Klarc deck), the builder worker, and one Payload hook.
- ✅ The full stack runs on Coolify from one `docker-compose.yml` with 4 services.
- ✅ Total MVP build time: ~1 week of focused work (2 days Payload + blocks schema, 2 days theme renderers + builder, 1 day Coolify deploy + migration).

---

## 12. References

**Primary boilerplate (fork target)**
- [allweonedev/presentation-ai](https://github.com/allweonedev/presentation-ai) — 2,714★ MIT, Next.js 16 + Plate.js + Prisma + NextAuth + Vercel AI SDK + LangChain. Open-source Gamma clone. **This is the fork base.**
- [Plate.js](https://platejs.org) — the block editor framework. MIT.
- [`@platejs/ai`](https://github.com/udecode/plate/tree/main/packages/ai) — official AI plugin for Plate, uses Vercel AI SDK v6.
- [Vercel AI SDK v6](https://sdk.vercel.ai/) — `generateObject`, tool calls, streaming, multi-provider.
- [`@ai-sdk/anthropic`](https://www.npmjs.com/package/@ai-sdk/anthropic) — Claude provider for the AI SDK.

**Runner-up (if the fork doesn't fit)**
- [presenton/presenton](https://github.com/presenton/presenton) — 4,586★ Apache-2.0, FastAPI + Next.js, already supports Claude, built-in MCP server, one-command Docker. Different architecture (Python backend, HTML templates not block schema).

**Fallback (build on Payload instead)**
- [Payload CMS](https://payloadcms.com) — 32k★, MIT, Next.js-native headless CMS
- [`@payloadcms/plugin-mcp`](https://www.npmjs.com/package/@payloadcms/plugin-mcp) — official, v3.81.0 shipped **2026-04-08**. Exposes any collection as MCP tools with Zod schemas. Lets Claude drive Payload directly.
- [`@ai-stack/payloadcms`](https://www.npmjs.com/package/@ai-stack/payloadcms) (`ashbuilds/payload-ai`, 471★) — multi-provider AI (including Claude) on RichText and Upload fields. Compose / Rewrite / Translate / Image / Voice.
- [Payload website template](https://github.com/payloadcms/payload/tree/main/templates/website) — reference for Pages + Lexical + Blocks pattern.

**Rendering layer**
- [Slidev exporting](https://sli.dev/guide/exporting) · [Slidev hosting](https://sli.dev/guide/hosting) · [Slidev layouts](https://sli.dev/builtin/layouts)
- [LSTM-Kirigaya/slidev-ai](https://github.com/LSTM-Kirigaya/slidev-ai) — 269★, only repo that natively emits Slidev markdown. Use as a reference for the Puppeteer rendering pattern, not as a fork base.

**Infrastructure**
- [Coolify](https://coolify.io) · [Docs](https://coolify.io/docs)
- [MinIO](https://min.io) or [Cloudflare R2](https://developers.cloudflare.com/r2/)

**Prior art & context**
- Research conversation: `tasks/2026-04-07-klarc-slidev/` (verdict on Slidev collaboration ecosystem as of April 2026 — no native solution exists)
- Existing Klarc deck built with Slidev: `tasks/2026-04-07-klarc-slidev/slides.md` (first migration record; the visual reference for the Slidev exporter + Klarc theme pack)
- `tasks/2026-04-07-klarc-slidev/style.css` (drops into `themes/klarc/style.css` in the fork)
