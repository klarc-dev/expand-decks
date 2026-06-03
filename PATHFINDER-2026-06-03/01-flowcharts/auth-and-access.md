# Flowchart — auth-and-access

**Entry:** authPlugin `payload.config.ts:46-62`; seed `onInit :63-90`; predicates `src/access/roles.ts:3-19`.

```mermaid
flowchart TD
    subgraph A["Path A — Google OAuth"]
      Btn["GoogleLoginButton click<br/>GoogleLoginButton.tsx:6-8"] --> Redir["→ /api/auth/oauth/authorization/google<br/>GoogleLoginButton.tsx:7"]
      Redir --> Plugin["authPlugin + GoogleAuthProvider<br/>payload.config.ts:47-54"]
      Plugin --> CB["OAuth callback (payload-auth-plugin)"]
      CB --> AutoSU["allowOAuthAutoSignUp:true → create/find user<br/>payload.config.ts:57"]
      AutoSU --> Acct["Accounts stores sub/tokens<br/>Accounts.ts:5-15 — DB write"]
      Acct --> Cookie["useAdmin:true sets admin cookie<br/>payload.config.ts:58 — cookie"]
      Cookie --> Go["redirect /admin :59"]
    end
    subgraph B["Path B — boot admin seed"]
      Init["onInit<br/>payload.config.ts:63"] --> Env{SEED_ADMIN_EMAIL & PASSWORD?<br/>:64-66}
      Env -->|absent| NoOp["skip silently"]
      Env -->|present| FindU["find user by email<br/>:68-72"]
      FindU -->|exists| UpdU["update password + role=admin<br/>:74-78 — DB write"]
      FindU -->|none| CrU["create admin user<br/>:81-84 — DB write"]
    end
    subgraph C["Path C — access predicates (roles.ts)"]
      P1["isAdmin :3"]; P2["isAdminOrAuthor :6"]; P3["isLoggedIn :9"]
      P4["isAdminField :12"]; P5["isAdminOrSelf → {createdBy:{equals}} :15-19"]
    end
    Go -.authenticated.-> P3
    UpdU -.role=admin.-> P1
```

**Wiring:** Presentations (`isAdminOrSelf`/`isLoggedIn`/`isAdmin`), ShareLinks (`isAdminOrAuthor`/`isAdmin`), Media (`isLoggedIn`/`isAdmin`), MarkdownBlock fields (`isAdminField`), Accounts (`isLoggedIn`/`isAdmin`). Users default role `author` (`Users.ts:20`).
**External deps:** content-storage (user upsert), `payload-auth-plugin` (`withAccountCollection`, `GoogleAuthProvider`).
**Confidence:** High for config/seed/predicates. Medium for OAuth internals (abstracted by plugin).
