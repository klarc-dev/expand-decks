# F7 — Sharing & SPA Serving

## Summary

F7 implements two access models for the same built Slidev SPA artifacts:

1. **Share-link creation/rotation** — generates an opaque raw token, stores only `sha256(token)`, exposes the raw URL once (on create or after rotate).
2. **Public viewing** — `/share/[token]` hashes the incoming token, resolves the link, checks expiry, increments analytics, iframes a token-gated SPA route.
3. **Private viewing** — `/spa/[slug]/...` validates slug, authenticates a Payload user, checks the presentation exists, serves the same SPA path.

The two SPA routes diverge **only** in access checks and converge on `serveSpaFile` (`src/lib/spaFiles.ts`), which does traversal-safe reads from `media/spa/<slug>/`.

## Mermaid

```mermaid
flowchart TD
  %% A. Creation & rotation
  A0["Admin creates ShareLink<br/>src/collections/ShareLinks.ts:15"]
  A1["beforeChange create hook<br/>src/collections/ShareLinks.ts:77"]
  A2["Generate raw token<br/>src/collections/ShareLinks.ts:80"]
  A3["sha256(raw token)<br/>src/lib/shareLinks.ts:7"]
  A4["Store tokenHash + createdBy<br/>src/collections/ShareLinks.ts:81"]
  A5["Stash raw token in req.context[shareToken]<br/>src/collections/ShareLinks.ts:84"]
  A6["CTX.shareToken key<br/>src/lib/context.ts:1"]
  A7["afterChange exposes shareUrl once<br/>src/collections/ShareLinks.ts:111"]
  A9["buildShareUrl(/share/token)<br/>src/collections/ShareLinks.ts:11"]
  R0["ShareUrlField admin UI<br/>src/components/ShareUrlField.tsx:19"]
  R2["Rotate endpoint /:id/rotate<br/>src/collections/ShareLinks.ts:33"]
  R5["Generate replacement token<br/>src/collections/ShareLinks.ts:64"]
  R6["Update tokenHash (invalidate old)<br/>src/collections/ShareLinks.ts:65"]
  R7["Return fresh shareUrl once<br/>src/collections/ShareLinks.ts:72"]

  A0 --> A1 --> A2 --> A3 --> A4
  A2 --> A5 --> A6
  A1 --> A7 --> A9
  R0 --> R2 --> R5 --> R6 --> R7 --> A9

  %% B. Public viewing
  B0["GET /share/[token]<br/>src/app/(frontend)/share/[token]/page.tsx:25"]
  B3["resolveShareLink(token)<br/>src/app/(frontend)/share/[token]/page.tsx:33"]
  B4["Find by sha256(token)<br/>src/lib/shareLinks.ts:15"]
  B6["isLive expiresAt check<br/>src/app/(frontend)/share/[token]/page.tsx:46"]
  B9["Increment viewCount + lastViewedAt<br/>src/app/(frontend)/share/[token]/page.tsx:57"]
  B10["iframe /share/token/spa/index.html<br/>src/app/(frontend)/share/[token]/page.tsx:68"]
  B11["GET /share/[token]/spa/[...path]<br/>src/app/(frontend)/share/[token]/spa/[...path]/route.ts:11"]
  B13["resolveShareLink depth 1<br/>src/app/(frontend)/share/[token]/spa/[...path]/route.ts:19"]
  B14["403 if missing/expired<br/>src/app/(frontend)/share/[token]/spa/[...path]/route.ts:21"]
  B15["Resolve presentation slug<br/>src/app/(frontend)/share/[token]/spa/[...path]/route.ts:25"]
  B16["serveSpaFile(slug, path)<br/>src/app/(frontend)/share/[token]/spa/[...path]/route.ts:32"]

  B0 --> B3 --> B4
  B3 --> B6 --> B9 --> B10 --> B11 --> B13 --> B14
  B13 --> B15 --> B16 --> S0

  %% C. Private viewing
  C0["GET /spa/[slug]/[[...path]]<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:16"]
  C2["Validate slug SLUG_RE<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:22"]
  C4["payload.auth(headers)<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:28"]
  C5["403 if no user<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:29"]
  C6["Count presentation by slug<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:33"]
  C7["404 if missing<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:39"]
  C8["serveSpaFile(slug, path)<br/>src/app/(frontend)/spa/[slug]/[[...path]]/route.ts:43"]

  C0 --> C2 --> C4 --> C5
  C4 --> C6 --> C7
  C6 --> C8 --> S0

  %% Shared convergence
  S0["serveSpaFile SHARED<br/>src/lib/spaFiles.ts:37"]
  S1["Default empty path to index.html<br/>src/lib/spaFiles.ts:41"]
  S2["Reject traversal/absolute<br/>src/lib/spaFiles.ts:43"]
  S3["Resolve media/spa/slug<br/>src/lib/spaFiles.ts:48"]
  S4["readFile<br/>src/lib/spaFiles.ts:56"]
  S5["Return content + MIME + cache headers<br/>src/lib/spaFiles.ts:68"]
  S6["404 when absent<br/>src/lib/spaFiles.ts:76"]
  S0 --> S1 --> S2 --> S3 --> S4 --> S5
  S4 --> S6
```

## DIVERGENCE note
**token-gated vs auth-gated; converge at serveSpaFile.** Public route: token resolve + expiry + slug extraction (`share/[token]/spa/[...path]/route.ts:19-32`). Private route: slug validation + Payload auth + presentation existence (`spa/[slug]/[[...path]]/route.ts:22-43`). Both call `serveSpaFile` (`lib/spaFiles.ts:37`). **Verdict: LEGITIMATE SPECIALIZATION** — different trust models, shared low-level serving.

## Side effects
- **DB writes:** share create (token gen `ShareLinks.ts:80`, store hash `:81`), rotate (`:64-65`), public-view analytics `viewCount`/`lastViewedAt` (`share/[token]/page.tsx:57-61`)
- **File I/O:** `serveSpaFile` reads `media/spa/<slug>/` (`spaFiles.ts:56`, root `:48`), 404 on missing (`:76`)

## External dependencies
- **Auth** — role helpers (`ShareLinks.ts:5`), rotate ownership check (`:36`), private route `payload.auth` (`spa/[slug]/.../route.ts:28`)
- **F2 artifacts** — both routes need built SPA under `media/spa/<slug>/` (`spaFiles.ts:30`)
- **Lib** — `shareLinks.ts` (hash/resolve/isLive), `spaFiles.ts` (serve), `CTX.shareToken` (`context.ts:1`), `spaDir`/`INDEX_HTML` from `lib/paths`

## Confidence + gaps
High. Scope read directly; convergence on `serveSpaFile` explicit in both routes. `spaDir`/`INDEX_HTML` from `lib/paths` outside read scope.
