# Flowchart — content-authoring

**Entry:** `src/collections/Presentations.ts:15` · **Hooks:** `createdBy` beforeChange `:204–209`, `afterChange → afterPresentationChange` `:31–32`

```mermaid
flowchart TD
    Open["Author opens Presentation form<br/>Presentations.ts:15"] -->|read: isLoggedIn| Title["Title (required)<br/>Presentations.ts:35-41"]
    Title --> Tabs["Tabs: Contenu / Métadonnées / Sortie<br/>Presentations.ts:43-176"]
    Tabs --> Contenu["Contenu tab<br/>Presentations.ts:45-76"]
    Tabs --> Meta["Métadonnées tab<br/>Presentations.ts:77-114"]
    Tabs --> Sortie["Sortie tab (readonly artifacts)<br/>Presentations.ts:115-174"]
    Contenu --> Draft["draftFromBrief UI field<br/>Presentations.ts:50-56"]
    Contenu --> Slides["slides blocks[] — 9 types<br/>Presentations.ts:59-74"]
    Slides --> Blocks["cover/section/statement/twoCols/<br/>cardGrid/stats/quotes/cta/markdown<br/>src/blocks/*Block.ts"]
    Blocks --> Prev["each block: preview UI field<br/>SlidePreview#default"]
    Meta --> Slug["slug validate /^[a-z0-9-]{1,64}$/<br/>Presentations.ts:88-92"]
    Slug -->|invalid| SlugErr["validation error<br/>Presentations.ts:90"]
    Slug -->|valid| LangTags["tags[], language fr/en<br/>Presentations.ts:95-112"]
    Slides --> Status["status draft/published/archived<br/>Presentations.ts:178-192"]
    Status --> Save["Save"]
    Save -->|create/update: isAdminOrSelf<br/>roles.ts:15-19| BC["beforeChange: createdBy=req.user.id on create<br/>Presentations.ts:204-209"]
    BC --> DB[("DB write: presentation<br/>side effect")]
    DB --> AC["afterChange → afterPresentationChange<br/>afterPresentationChange.ts:20"]
    AC --> Handoff(["→ build-pipeline (queue gate)"])
```

**External deps:** auth-and-access (`isLoggedIn`/`isAdminOrSelf`/`isAdmin` `roles.ts:3-19`), media (block `image` upload fields), preview (`SlidePreview#default` per block), build-pipeline (afterChange handoff).
**Access:** create/update `isAdminOrSelf`, read `isLoggedIn`, delete `isAdmin` (`Presentations.ts:25-30`). MarkdownBlock fields gated by `isAdminField`.
**Confidence:** High. Gap: Payload admin form internals out of scope.
