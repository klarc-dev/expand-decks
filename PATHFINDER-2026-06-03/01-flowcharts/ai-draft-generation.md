# Flowchart — ai-draft-generation

**Entry:** UI `DraftFromBriefButton.tsx:20` (`handleGenerate`) → `route.ts:176` (`POST`)

```mermaid
flowchart TD
    Type["User types brief<br/>DraftFromBriefButton.tsx:20"] --> IdFromUrl["parse presentationId from URL<br/>DraftFromBriefButton.tsx:13-16"]
    IdFromUrl --> NewDoc{isNewDoc?<br/>DraftFromBriefButton.tsx:18}
    NewDoc -->|yes| Hide["render null (must save first)<br/>DraftFromBriefButton.tsx:53"]
    NewDoc -->|no| Fetch["POST /api/draft-presentation<br/>DraftFromBriefButton.tsx:27-32"]
    Fetch --> Auth["payload.auth(headers)<br/>route.ts:181"]
    Auth -->|no user| E401["401<br/>route.ts:183"]
    Auth -->|ok| Body{presentationId & brief?<br/>route.ts:189}
    Body -->|no| E400["400<br/>route.ts:190-193"]
    Body -->|yes| Find["payload.findByID<br/>route.ts:197-201"]
    Find -->|missing| E404["404<br/>route.ts:204"]
    Find -->|ok| LLM["createOpenAI (LiteLLM proxy)<br/>route.ts:208-211"]
    LLM --> Gen["generateObject(slidesArraySchema)<br/>model claude-sonnet-4.6, temp 0.7<br/>route.ts:212-218"]
    Gen --> HTTP[("LLM HTTP call (side effect)<br/>route.ts:213")]
    HTTP --> Zod{validates discriminated union<br/>slideBlockSchema route.ts:108-117}
    Zod -->|invalid| E500["500<br/>route.ts:234-235"]
    Zod -->|valid| Update["payload.update slides<br/>skipBuildQueue:true<br/>route.ts:221-227"]
    Update --> DB[("DB write: slides")]
    DB --> Resp["200 {success, slideCount}<br/>route.ts:229-232"]
    Resp --> Reload["router.refresh + window.reload<br/>DraftFromBriefButton.tsx:42-44"]
```

**Zod schemas** (`route.ts`): cover `:9-17`, section `:19-25`, statement `:27-33`, twoCols `:35-49`, cardGrid `:51-66`, stats `:68-81`, quotes `:83-96`, cta `:98-106`; union `:108-117`; `slidesArraySchema` min 3 max 20 `:119-121`. **`markdown` is intentionally NOT in the union** (admin-only block). `SYSTEM_PROMPT :123-174` forces cover-first/cta-last, 8–15 slides.
**External deps:** auth-and-access (`payload.auth`), content-authoring (writes `slides`), build-pipeline (sets `skipBuildQueue` to avoid requeue — but note: write itself won't trigger build since hook also needs `status===published`).
**Confidence:** High for control flow. Gap: LLM output variance under temp 0.7; only Zod-validated, no semantic post-check.
