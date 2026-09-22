<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Deck operations reference

This reference is generated from the same operational contract consumed by `pnpm prod help`.

## Local authoring and build

- `NODE_ENV=development pnpm deck:seed <name>`: Run the typed scripts/seed-<name>.ts authoring workflow against the configured local database.
- `NODE_ENV=development pnpm deck:build <presentationId>`: Run the real Slidev build path for one presentation against the configured local database.

## Production CLI

| Command | Purpose | Effect |
| --- | --- | --- |
| `pnpm prod status` | Show live containers, deployed SHA versus local HEAD, and the Payload job queue. | `read-only` |
| `pnpm prod run <scripts/file.ts> [args...] [--yes] [--allow-dirty]` | Execute one top-level repository script inside the production Payload container, then restore the deployed copy. | `script-defined` |
| `pnpm prod pull [--no-media] [--name <db>] [--force]` | Restore a production dump into a fresh local database and optionally mirror media locally. | `production-read/local-write` |

### Production safeguards

- `run`: Only files directly under scripts/ are accepted.
- `run`: Scripts named seed-* or set-* require --yes.
- `run`: An uncommitted script is refused unless --allow-dirty is explicit.
- `pull`: This operation never writes to production.

Production mutations require explicit user authorization. Start with `pnpm prod status`; prefer a committed, narrowly scoped inspection script before any mutation.

## Canonical external boundary

- `POST /api/slide-layout`: Authenticated layout analysis, recommendation, preview, atomic apply, stale rejection, loss diagnostics, and undo.

## MCP policy

- Deck MCP available: **no**
- The retired deck MCP server must not be restored. External integrations use the authenticated canonical REST boundary.
- Decision record: `docs/agents/issue-45-resolution.md`
