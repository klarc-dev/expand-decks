# Flowchart — share-links

**Entry:** collection `ShareLinks.ts:11`; public page `share/[token]/page.tsx:10`; SPA route `share/[token]/spa/[...path]/route.ts:40`.

```mermaid
flowchart TD
    subgraph Create["Path A — link creation (admin)"]
      BC["beforeChange<br/>ShareLinks.ts:25-35"] --> Tok["randomBytes(32) base64url<br/>:28"]
      Tok --> Hash1["sha256(token) → tokenHash<br/>ShareLinks.ts:7-9, :29"]
      Hash1 --> Stash["stash raw token on req.context<br/>:32"]
      Stash --> ACr["afterChange returns shareUrl once<br/>:37-47"]
      ACr --> ARd["afterRead → shareUrlDisplay (hash only)<br/>:49-56"]
    end
    subgraph View["Path B — public view"]
      Open["GET /share/&lt;token&gt;<br/>page.tsx:10-14"] --> Hash2["sha256(token)<br/>page.tsx:6-8, :17"]
      Hash2 --> Look["find by tokenHash<br/>page.tsx:19-24"]
      Look -->|none| NF["Lien invalide<br/>page.tsx:28-38"]
      Look -->|found| Exp{expired?<br/>page.tsx:41}
      Exp -->|yes| EX["Lien expiré<br/>page.tsx:42-51"]
      Exp -->|no| Inc["viewCount++ , lastViewedAt<br/>page.tsx:55-63 — DB write"]
      Inc --> IF["iframe → /share/&lt;token&gt;/spa/index.html<br/>page.tsx:68-75"]
    end
    subgraph SPA["Path B — SPA asset serving"]
      G["GET spa/[...path]<br/>route.ts:40-43"] --> Hash3["sha256(token)<br/>route.ts:33-35, :47"]
      Hash3 --> L2["find by tokenHash<br/>route.ts:49-55"]
      L2 -->|none/expired| F403["403<br/>route.ts:60/64"]
      L2 -->|ok| Slug["resolve presentation.slug<br/>route.ts:68-74"]
      Slug --> Guard{"path traversal guards<br/>'..', '/', startsWith spaRoot<br/>route.ts:78-87"}
      Guard -->|fail| F403b["403<br/>route.ts:79/87"]
      Guard -->|ok| RF["readFile media/spa/&lt;slug&gt;/file<br/>route.ts:91 — file read"]
      RF --> Serve["serve + MIME + cache headers<br/>route.ts:92-102"]
    end
    IF --> G
```

## ⚠️ Duplication evidence
| Construct | Loc 1 | Loc 2 | Loc 3 |
|---|---|---|---|
| `sha256()` helper | `ShareLinks.ts:7-9` | `page.tsx:6-8` | `route.ts:33-35` |
| expiry check `new Date(expiresAt) < new Date()` | `page.tsx:41` | `route.ts:63` | — |
| tokenHash lookup `find({where:{tokenHash:{equals}}})` | `page.tsx:19-24` | `route.ts:49-55` | — |

**External deps:** auth-and-access (`isAdminOrAuthor`/`isAdmin` create/read/update `ShareLinks.ts:18-22`), content-storage (link lookup, viewCount), build-pipeline output (`media/spa/<slug>/`).
**Security notes:** 256-bit token entropy (adequate); only `sha256(token)` stored; path-traversal double-guarded; rate-limit TODO noted `route.ts:37-38`.
**Confidence:** High.
