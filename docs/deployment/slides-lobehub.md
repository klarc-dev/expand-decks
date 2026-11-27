# Personal Slides connector for LobeHub

## Build and configure

Use `pnpm generate:agent-skills` to regenerate `mcp-adapter/openapi.json` and the LobeHub reference packaged with the `slides` skill. `pnpm generate:agent-skills:check` checks both in CI. The registry is `scripts/slides-authoring.ts`; Payload fields, block specs and native request contracts supply the inputs. The pinned FastMCP adapter registers the explicit catalogue at startup. It is not the retired in-app MCP server.

```sh
docker build --target test mcp-adapter
docker build -t slides-authoring-mcp mcp-adapter
```

Deploy the matching Slides revision first. In Coolify, create a separate Dockerfile application with repository base/build context `/mcp-adapter`, Dockerfile `Dockerfile` relative to that context, and application port `8000`. Route only HTTPS to the container, preserve the public Host header, and do not publish the container port directly. Use an ingress-level liveness probe or an authenticated MCP initialize smoke; the adapter does not expose an unauthenticated health route.

| Runtime setting | Value |
| --- | --- |
| `SLIDES_API_URL` | Fixed HTTPS Slides origin, equal to `NEXT_PUBLIC_SERVER_URL`; no path, query or credentials |
| `SLIDES_EMAIL` | Dedicated personal, active Slides account. Start with an author belonging to one approved organisation and set it as their default |
| `SLIDES_PASSWORD_FILE` | Path to the mounted file holding that account's Slides password. First verify normal Payload password login works |
| `SLIDES_MCP_TOKEN_FILE` | Path to a distinct random ingress bearer token, at least 32 characters |
| `SLIDES_MCP_ALLOWED_HOST` | Public connector hostname (port only if non-default and retained by ingress) |
| `SLIDES_ENABLE_WRITES` | `0` for initial discovery, then `1` only for the approved test or authoring scope |

Mount secrets read-only and readable by UID/GID `10001`. Never use an account shared across LobeHub users or a shared elevated credential. Each instance represents exactly one Slides identity, not the caller's LobeHub identity. Do not provision an admin connector just to make author acceptance pass. Deck deletion is admin-only in Slides; test it separately with a personally scoped eligible identity on an approved disposable fixture.

In a personal LobeHub workspace register the custom MCP as **Streamable HTTP**, URL `https://<connector-host>/mcp`, header `Authorization: Bearer <connector-token>`. Discover tools with writes disabled, then verify the role and organisation before enabling writes. Verify separate browser login to Slides: MCP authenticates tool calls, not artifact links or confirmations. For confirmation, follow the returned link in a browser independently signed into the same Slides account. Closing the page does not confirm anything. Use the browser's explicit cancel action if an issued link must be consumed without deleting.

The adapter does not follow redirects, forward caller credentials, download arbitrary URLs, or automatically repeat writes. It refreshes its in-memory Payload JWT and only retries an idempotent GET once after a confirmed 401. Uploads require bytes from an approved local attachment (not a URL): use `{file:{filename,base64,contentType?},_payload:{...}}` inside the tool body. Limits are 8 MiB decoded per upload, 12 MiB inbound MCP request and 4 MiB upstream response. Never include request bodies, tokens, confirmation URLs, internal evidence or brief content in release logs.

## Role and action parity

`Member` means an authenticated user with native permission to read that resource. `Author` means an active author of the organisation, not a viewer or author of another organisation; admins follow their native role rules. The areas below are implementation mappings, **not production certification**.

| Action | Eligible role and denials | Native API and tool | Evidence to record |
| --- | --- | --- | --- |
| Create deck with typed pages; list/read/update metadata | Author writes; members read; viewers cannot write and external authors cannot read or write | `/api/presentations` and `/{id}`: `create_deck`, `list_decks`, `get_deck`, `update_deck` | Local Playwright verified typed create as author and denied viewer/foreign-organisation create; repeat filtered list, metadata update and invalid content in LobeHub |
| Delete deck | Admin only, with same-actor browser confirmation | `/api/deck-actions`: `request_deck_deletion` then protected browser form | Local Chromium/PostgreSQL verified admin cancel/confirm, wrong actor/session, stale target and replay; repeat in LobeHub with approved fixture |
| Build, status, variables, outputs | Author requests build; members read; anonymous/external users cannot open exports | `/api/presentations/{id}/build`, `/{id}/vars`, `/api/deck-outputs/{id}`: `rebuild_deck`, `get_deck_variables`, `get_deck_outputs` | Local Playwright opened a native PDF and SPA and denied anonymous access; separate PostgreSQL smoke admitted one of two concurrent rebuilds. Verify failure status and repeat in LobeHub |
| List, get, insert, patch, move, delete a slide | Member reads; author writes; browser confirmation for deletion | `/api/deck-slides`: `get_deck_slides`, `manage_deck_slides` | Local live MCP exercised CRUD, mismatched ID, concurrent stale refusal, viewer rejection and browser confirmation/replay; repeat in LobeHub |
| Preview, revise and choose layout | Member can preview an accessible deck; author can revise and change layouts | `/api/slide-preview`, `/api/revise-slide`, `/api/slide-layout`: `preview_slide`, `revise_slide`, `manage_slide_layout` | Open protected preview; preview/recommend do not save; revise does; apply and undo with stale token refusal |
| Templates, blocks, fonts, brand | Authenticated fonts; members read brand; author changes own brand | Generated schema references, `/api/google-fonts`, `/api/organisations`: `list_fonts`, `list_brands`, `update_brand` | Check constraints and same/foreign brand writes; verify style on built artifact and provider error handling |
| Upload, discover and reuse media | Author uploads; authenticated users may read ordinary uploads; deck-generated media follows deck access | `/api/media`: `upload_media`, `list_media`, then typed slide or brand fields | LobeHub file round trip and rendered asset; viewer upload denied, foreign generated media denied |
| Manage knowledge bases/documents and retry indexing | Members read; author writes, retries and confirms deletion | `/api/knowledge-bases`, `/api/knowledge-documents`, `/api/knowledge-deletion`: knowledge list/get/create/update/upload/retry/delete-preparation tools | Approved attachment indexed to ready; repeat failure/retry and cross-org refusals; confirm/cancel deletions |
| Select sources, start and supervise Mastra | Author starts or controls own deck; admin-only time travel; native run ownership and source readiness checks | `/api/agent-sources`, `/api/agent-draft`: `get_draft_sources`, `start_deck_draft`, `get_deck_draft`, `control_deck_draft` | One run, concurrent start refused, ready base accepted; wrong-org/unready sources denied; approval/resume and terminal build |

There is no deck publication toggle in Slides. The connector cannot transfer a deck to another organisation, expose public export links, or modify user roles, memberships, API accounts or worker jobs. Ordinary uploaded media are not private to an organisation. Do not use the connector to upload confidential files under that visibility model.

### Certification and rollback

1. Record the deployed Slides and connector commits, generated catalogue, connector registration and role used, separately from execution evidence. Use only approved non-sensitive fixtures and an approved model budget. Start with create → native build → open protected PDF and SPA before testing the remaining rows.
2. For each row record the allowed result and a denied-role or foreign-organisation result. For uncertain writes, read deck/run/indexing status first. Never repeat `create_deck` or `start_deck_draft` automatically; if draft start fails after create, keep the existing deck ID.
3. Verify file handling in the actual LobeHub client. API and adapter tests do not prove that the client can supply attachment bytes. When all applicable rows pass, reimport the skill from the same GitHub URL and verify discovery and the local workflow. A push does not sync an installed skill.
4. Roll back by disabling/removing the personal connector, stopping its Coolify application and rotating the ingress token. Revoke the Slides account credential and any active sessions if required. Do not delete decks during rollback.
