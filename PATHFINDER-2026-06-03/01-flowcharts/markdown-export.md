# Flowchart — markdown-export (render core)

**Entry:** `src/export/buildSlidesMd.ts:61` (`buildSlidesMd`). Pure except one cached file read.

```mermaid
flowchart TD
    Build["buildSlidesMd(presentation)<br/>buildSlidesMd.ts:61"] --> Head["loadHeadmatter() cached readFileSync<br/>buildSlidesMd.ts:46-53"]
    Head --> Map["slides.map<br/>buildSlidesMd.ts:67"]
    Map --> Lookup["RENDERERS[block.blockType]<br/>buildSlidesMd.ts:32-42, 68"]
    Lookup -->|unknown| Throw["throw Unknown block type<br/>buildSlidesMd.ts:70"]
    Lookup -->|found| Reset["resetDefs() per slide<br/>utils.ts:18-20"]
    Reset --> Render["renderer(block)<br/>e.g. cover.ts:15, twoCols.ts:17"]
    Render --> Inline["escape() utils.ts:12 + md() utils.ts:36<br/>(bold/italic/link + {{def:}} collector)"]
    Inline --> Wrap["wrapSlide() frontmatter + layout<br/>utils.ts:83-103"]
    Wrap --> ImgOverride["image? → layout image-right/left<br/>utils.ts:93-96"]
    Wrap --> Surface["surfaceClass(surface)<br/>utils.ts:55-57"]
    Wrap --> Foot["consumeDefFooter() drains _slideDefs<br/>utils.ts:22-29"]
    Foot --> Slide["slide markdown string"]
    Slide --> Join["join slides + headmatter prefix<br/>buildSlidesMd.ts:80-81"]
    Join --> Out["complete slides.md string"]
```

**Core fns:** `buildSlidesMd :61`, `loadHeadmatter :46`, `RENDERERS :32-42`, `resetDefs utils.ts:18`, `wrapSlide utils.ts:83`, `consumeDefFooter utils.ts:22`, `escape utils.ts:12`, `md utils.ts:36`, `surfaceClass utils.ts:55`. Module-level mutable state `_slideDefs utils.ts:16` reset per slide.
**External deps:** none (pure). Consumed by build-pipeline + preview.
**Confidence:** High. Note: `RENDERERS` map here is the **canonical** of three copies (others in preview/page.tsx + SlidePreview.tsx) — duplication evidence.
