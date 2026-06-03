# Flowchart — build-pipeline

**Entry:** `afterPresentationChange.ts:20` (gate) → `buildSlides.ts:69` (job handler). Cron `*/1 * * * *` (`payload.config.ts:103`) + worker `docker-compose.yaml:74`.

```mermaid
flowchart TD
    AC["afterPresentationChange<br/>afterPresentationChange.ts:20"] --> Skip{skipBuildQueue?<br/>:27}
    Skip -->|yes| Ret1["return doc"]
    Skip -->|no| Op{create/update?<br/>:30}
    Op -->|no| Ret2["return doc"]
    Op -->|yes| Pub{status==published?<br/>:31}
    Pub -->|no| Ret3["return doc"]
    Pub -->|yes| Upd{update?<br/>:34}
    Upd -->|no fresh publish| Q["jobs.queue buildSlides<br/>:43-47"]
    Upd -->|yes| Hash{slidesContentChanged?<br/>sha256 :5-18, :36}
    Hash -->|wasPublished & unchanged| Ret4["return doc"]
    Hash -->|changed| Q
    Q --> QDB[("queue row written")]
    QDB --> Cron[["cron worker picks job<br/>config.ts:103 / compose:74"]]
    Cron --> H1["status=building (skipBuildQueue)<br/>buildSlides.ts:75-80 — DB write"]
    H1 --> H2["findByID depth:0<br/>:83-87 — DB read"]
    H2 --> H3{slug regex SLUG_RE<br/>:22, :90-92}
    H3 -->|bad| Catch
    H3 -->|ok| H4["buildSlidesMd(presentation)<br/>:95 → markdown-export"]
    H4 --> H5["mkdtemp workdir<br/>:98 — file I/O"]
    H5 --> H6["symlink node_modules + media<br/>:103-115 — file I/O"]
    H6 --> H7["write slides.md; cp style.css/headmatter/fonts<br/>:118-132 — file I/O"]
    H7 --> H8["runSlidev build --base /<br/>:135 — execFile spawn"]
    H8 --> H9["runSlidev export pdf<br/>:138 — execFile spawn"]
    H9 --> H10["payload.create media (PDF)<br/>:141-151 — DB write + file read"]
    H10 --> H11["rm + cp dist → media/spa/&lt;slug&gt;<br/>:154-157 — file I/O"]
    H11 --> H12["payload.update pdfFile/spaUrl/success<br/>skipBuildQueue :160-170 — DB write"]
    H12 --> Done["return success :172"]
    Catch["catch: status=failed + lastBuildError<br/>:178-186 — DB write, rethrow :188"]
    Done --> Fin["finally: rmSync workdir<br/>:191-193 — file I/O"]
    Catch --> Fin
```

**Constants** (`buildSlides.ts`): `SLUG_RE :22`, `SLIDEV_WORKSPACE :23`, `EXPORT_DIR :24`, `MEDIA_DIR :25`, `runSlidev :33-47` (strips `ANTHROPIC_API_KEY`, 5-min timeout, uses `node_modules/.bin/slidev` not npx).
**External deps:** markdown-export (`buildSlidesMd`), media (PDF create), content-storage (status/artifact patches), deployment (worker + shared media volume).
**Confidence:** High. Gaps: success inferred from file existence not Slidev exit code; `slidesHash` only hashes `doc.slides` (title/surface-only changes won't rebuild).
