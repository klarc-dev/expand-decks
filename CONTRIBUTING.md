# Contributing

## Setup

```bash
pnpm install          # also installs git hooks via the `prepare` script
cp .env.example .env   # fill in DATABASE_URL, PAYLOAD_SECRET, OAuth, OPENAI_*
pnpm dev               # admin at /admin, frontend at /
```

Node 20 is the deployment runtime (see `.nvmrc` / Dockerfile); newer Node works locally. pnpm is pinned via `packageManager`.

## Quality gates

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm check` | Biome format + lint + import sorting (read-only) |
| `pnpm check:fix` | Biome, auto-applying safe fixes |
| `pnpm lint` | ESLint — Next.js Core Web Vitals rules only |
| `pnpm test` | Vitest |
| `pnpm lint:dead` | Fallow — dead code, duplication, complexity |

Biome owns formatting, general linting, and React/Hooks rules. ESLint is scoped to the Next.js rules Biome doesn't implement — the two do not overlap. Suppress a lint rule only inline, with a one-line reason.

## Git hooks

`lefthook` runs automatically (installed on `pnpm install`):

- **pre-commit** — Biome + ESLint auto-fix staged files, then re-stage.
- **pre-push** — `typecheck`, `test`, and the Fallow new-code gate.

Run hooks manually with `pnpm exec lefthook run pre-commit`. Reinstall with `pnpm exec lefthook install`.

## After changing collections or blocks

```bash
pnpm generate:types        # refresh src/payload-types.ts
pnpm generate:importmap    # after admin component or richText field changes
pnpm payload migrate:create # then commit the generated .ts and .json
```

Adding a layout block follows the block-spec DSL in `src/blocks/spec/` — see `CLAUDE.md` for the full invariant. Keep blocks use-case-agnostic (visual structure, never domain concepts).

## CI

`.github/workflows/ci.yml` runs typecheck → Biome → ESLint → Fallow gate → test → build on every PR. Keep it green.
