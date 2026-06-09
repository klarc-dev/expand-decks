# F8 — Live Preview & Inline Slide Preview

## Summary

Two browser-side preview entry points converge on the same preview adapter:

1. **Live preview page** — `/preview` subscribes via `useLivePreview({ depth: 2 })`, maps hydrated blocks through `renderBlockPreview`, renders each in `SlideFrame`.
2. **Inline admin preview** — `SlidePreview` subscribes to Payload form state, uses `formStateToBlockData` to rebuild the current block into saved-document shape, passes it to `renderBlockPreview`, renders in `SlideFrame`.

Both reuse `renderBlockPreview` (`src/export/preview.ts`), which imports the same `RENDERERS` registry (`src/export/renderers.ts:22`) the build path uses (`src/export/buildSlidesMd.ts:7`). **The preview path adds only a browser wrapper that strips per-slide frontmatter and extracts layout — no renderer duplication.**

## Mermaid

```mermaid
flowchart TD
  %% A. Live preview page
  A0["/preview route<br/>src/app/(frontend)/preview/page.tsx:25"]
  A1["useLivePreview<br/>src/app/(frontend)/preview/page.tsx:26"]
  A2["depth: 2 hydrate nested blocks<br/>src/app/(frontend)/preview/page.tsx:29"]
  A3["Read data.slides<br/>src/app/(frontend)/preview/page.tsx:40"]
  A4["renderSlides maps renderBlockPreview<br/>src/app/(frontend)/preview/page.tsx:17"]
  A6["Render in SlideFrame<br/>src/app/(frontend)/preview/page.tsx:58"]

  %% B. Inline admin SlidePreview
  B0["SlidePreview component<br/>src/components/SlidePreview.tsx:12"]
  B1["useFormFields form state<br/>src/components/SlidePreview.tsx:17"]
  B2["formStateToBlockData adapter<br/>src/components/SlidePreview.tsx:18"]
  B3["Rebuild nested block data<br/>src/lib/formStateToBlockData.ts:10"]
  B9["renderBlockPreview(current block)<br/>src/components/SlidePreview.tsx:28"]
  B10["Render in SlideFrame<br/>src/components/SlidePreview.tsx:35"]

  %% Shared preview core
  C0["renderBlockPreview SHARED<br/>src/export/preview.ts:10"]
  C1["Lookup renderer in RENDERERS<br/>src/export/preview.ts:13"]
  C2["Call export renderer<br/>src/export/preview.ts:17"]
  C3["Strip per-slide frontmatter<br/>src/export/preview.ts:22"]
  C4["Extract layout<br/>src/export/preview.ts:23"]
  C5["Return html + layout<br/>src/export/preview.ts:24"]

  %% Shared registry + build path
  R0["Shared RENDERERS registry<br/>src/export/renderers.ts:22"]
  R1["Build imports same RENDERERS<br/>src/export/buildSlidesMd.ts:7"]
  R2["Build lookup by blockType<br/>src/export/buildSlidesMd.ts:39"]

  %% Shared frame
  F0["SlideFrame<br/>src/components/SlideFrame.tsx:13"]
  F2["Inject HTML dangerouslySetInnerHTML<br/>src/components/SlideFrame.tsx:26"]

  A0 --> A1 --> A2 --> A3 --> A4 --> C0
  A4 --> A6 --> F0
  B0 --> B1 --> B2 --> B3 --> B9 --> C0
  B9 --> B10 --> F0
  C0 --> C1 --> R0
  C1 --> C2 --> C3 --> C4 --> C5 --> F0
  F0 --> F2
  R1 --> R0
  R2 --> R0
```

## Shared-core note
`preview.ts` imports `RENDERERS` (`preview.ts:1`) and dispatches by blockType (`:13`); registry is `renderers.ts:22`. Build path imports the same registry (`buildSlidesMd.ts:7`) and dispatches (`:39`). **Preview and build share the same renderer registry** — preview only adds frontmatter-stripping + layout extraction for browser display.

## Inline-only adapter
`formStateToBlockData` is unique to the admin inline path — imported `SlidePreview.tsx:7`, called `:18`, implemented `lib/formStateToBlockData.ts:10`. It rebuilds nested block data from Payload's flat form-state map so renderers receive the same shape as saved data.

## Side effects
**None beyond client rendering.** No persistence, mutations, jobs, file writes, or Slidev invocation. Browser-only: `useLivePreview` subscription (`preview/page.tsx:26`), `useFormFields` subscription (`SlidePreview.tsx:17`), in-memory markdown→HTML (`preview.ts:10`), `dangerouslySetInnerHTML` (`SlideFrame.tsx:26`).

## External dependencies
- **F3 shared core** — `renderers.ts:22` registry; preview wrapper `preview.ts:1`; build path `buildSlidesMd.ts:7`/`:39`
- **F1 presentation/form data** — `PresentationData.slides` (`preview/page.tsx:40`); form state via `useFormFields` (`SlidePreview.tsx:17`)
- **lib/formStateToBlockData** — `formStateToBlockData.ts:10` (inline path only)

## Confidence + gaps
High. All scoped files read + `renderers.ts`/`buildSlidesMd.ts` verified for shared-registry confirmation. Individual renderer internals (F3) and the admin field config mounting `SlidePreview` out of scope.
