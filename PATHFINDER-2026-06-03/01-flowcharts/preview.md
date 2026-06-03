# Flowchart — preview

**Entry A (full deck):** `preview/page.tsx:60` (`PreviewPage`). **Entry B (per-block):** `SlidePreview.tsx:39`.

```mermaid
flowchart TD
    subgraph A["Path A — full-deck live preview"]
      Cfg["livePreview config<br/>payload.config.ts:35-42 / Presentations.ts:21-23"] --> Iframe["admin iframe → /preview"]
      Iframe --> PP["PreviewPage<br/>preview/page.tsx:60"]
      PP --> ULP["useLivePreview depth:2<br/>preview/page.tsx:61-65"]
      ULP --> RS["renderSlides<br/>preview/page.tsx:47-56"]
      RS --> R1["RENDERERS[blockType]<br/>preview/page.tsx:19-29"]
      R1 --> S1["stripSlideFrontmatter<br/>preview/page.tsx:37-39"]
      S1 --> X1["extractLayout<br/>preview/page.tsx:42-45"]
      X1 --> H1["dangerouslySetInnerHTML<br/>preview/page.tsx:96"]
    end
    subgraph B["Path B — per-block field preview"]
      Field["SlidePreview UI field (in every block)<br/>SlidePreview.tsx:39"] --> GF["useForm getSiblingData<br/>SlidePreview.tsx:40-41"]
      GF --> R2["RENDERERS[blockType]<br/>SlidePreview.tsx:18-28"]
      R2 --> S2["stripFrontmatter<br/>SlidePreview.tsx:30-32"]
      S2 --> X2["extractLayout<br/>SlidePreview.tsx:34-37"]
      X2 --> H2["dangerouslySetInnerHTML<br/>SlidePreview.tsx:58"]
    end
    R1 -.calls.-> Core["markdown-export renderers"]
    R2 -.calls.-> Core
```

## ⚠️ Duplication evidence (within feature + vs markdown-export)
| Construct | Copy 1 | Copy 2 | Copy 3 |
|---|---|---|---|
| `RENDERERS` map | `preview/page.tsx:19-29` | `SlidePreview.tsx:18-28` | `buildSlidesMd.ts:32-42` |
| strip frontmatter | `stripSlideFrontmatter preview/page.tsx:37-39` | `stripFrontmatter SlidePreview.tsx:30-32` | — |
| `extractLayout` | `preview/page.tsx:42-45` | `SlidePreview.tsx:34-37` | — |

All three RENDERERS maps are byte-identical 9-key records of the same imported renderer fns. `strip*` and `extractLayout` are identical logic, one renamed.

**External deps:** markdown-export (renderers), auth-and-access (admin-gated). `@payloadcms/live-preview-react` (`useLivePreview`), `@payloadcms/ui` (`useForm`).
**Confidence:** High.
