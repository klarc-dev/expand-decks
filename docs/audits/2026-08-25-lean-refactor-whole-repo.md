---
date: 2026-08-25
scope: whole-repo
command: /lean-refactor
status: deferred
depth: refactor
repository_mode: non-git-code-only
persistence: durable:.hermes/lean-refactor.20260825180641-4bd3f2ee.local.md
baseline_fingerprint: HEAD 9923677227d3b20800eab1fb74936c9db0340777 plus code-only content fingerprint at approval
dirty_tree_decision: code-only-explicit
agents_dispatched:
  - prior-art-researcher
  - duplication
  - structure-and-maintainability
  - tests-and-docs
  - security
  - framework
  - cross-cutting-synthesis
---

# Lean Refactor — whole repository

## Summary

- Confirmed findings: 30
- Coverage gaps retained as blocked: 4
- Severity: P0 4 | P1 17 | P2 9 | P3 0
- High-drift hazards (≥2): 27
- Excluded security controls: 10
- State-bound findings: 6
- Recommended first wave: 8 safe, code-only boundaries
- Existing user work: 18 modified and 1 untracked file under `src/export/**`; excluded from the first repair wave

The delegated synthesis timed out after completing the discovery reports. The coordinator reconciled the complete saved reports directly and persisted `/tmp/slides-synthesis.json`. No source files were changed during discovery.

## Coverage gaps

- **Blocked lens accelerator:** CPD/jscpd was unavailable. Text, AST, CodeGraph, Fallow, exact searches, and semantic inspection were used instead; syntactic-clone completeness is withheld.
- **Unqueryable state:** no database snapshot or persisted-record query was authorized. State-bound hard cuts are blocked pending hashed export, counts, read-back, restoration command, and restoration proof.
- **Credentialed/external surfaces:** live OAuth, MCP, LLM, browser E2E, Docker deployment, and provider behavior were not exercised.
- **Dirty export surface:** the current `src/export/**` changes cannot be attributed or safely rewritten by this run. Finding F-012 is confirmed but excluded from mutation.

## Depth disposition

- Depth: refactor
- Approval/repair prohibited: no, but exact approval is required
- Tier floor: 2

## Baseline verification

| Command | Environment | Result |
|---|---|---|
| `pnpm run test` | macOS, Node v26.7.0, pnpm 10.33.2 | PASS — 458 passed, 9 skipped |
| `pnpm run typecheck` | same | PASS |
| `pnpm run lint` | same | PASS |
| `pnpm run check` | same | PASS; Biome schema/deprecation notices only |
| `pnpm run format:check` | same | ACCEPTED BASELINE FAILURE — only generated `.hermes/*.boundaries.json` formatting |
| `pnpm run lint:dead:prod` | same | discovery-only; 187 candidates requiring dynamic-registry classification |

## Evidence inventory

| Artifact | Purpose | SHA-256 |
|---|---|---|
| `/tmp/slides-analysis.json` | immutable analysis baseline | recorded in discovery ledger |
| `/tmp/slides-repo-frame.json` | 413-file frame, tools, language inventory | `13b5187915f078d9fc8110bf271a194766f12b97945605d061ad3ead9cb293f3` |
| `/tmp/slides-prior-art.md` | prior audits and skip guidance | `1dd6bedc00699b7205bc7ba91751d4a4acf53b255c6a23cb457595ad126c4d35` |
| `/tmp/slides-layer-reports.json` | complete five-lens aggregate | `efa33f770bac1bd34447564f6ac842df734f38139caa6e5393487cb7691cdde4` |
| `/tmp/slides-synthesis.json` | deduplicated ranking and exclusions | recorded in discovery ledger |
| `/tmp/slides-baseline.json` | baseline command manifest | `28243cb86ca62177b4d8e4eea8834a818279c2aeee380ce947f0527d9ab25db3` |

## Already-consolidated baseline — do not redo

- Collection slugs, build/presentation statuses, request-context keys, slug validation, artifact paths, server URL, role literals, CSS token module, admin styles, and preview frame remain canonical from the June SSOT pass.
- Block authoring and AI draft schemas are projected from the block-spec DSL.
- Build output remains the August hard cut: sequential native Slidev SPA, PDF, and cover export, with no incremental PDF cache or partial-output policy.
- Renderers remain shared by build and preview.
- SPA file serving retains MIME, traversal, and cache-policy centralization.

## P0 — correctness and security guarantees

### F-001 [Tier 1] Mastra workflow state is initialized but runtime reads workflow input

- **Files:** `src/agents/workflow.ts:47-50,190-192,251-253,328-330`; callers at `src/app/(payload)/api/agent-draft/route.ts:173-181` and `src/agents/runFromBrief.ts:14-21`
- **Current:** callers pass `visual` and `title` through `initialState`, but steps and branch mapping read `getInitData()`. Mastra 1.57 types `state` and `getInitData` separately; workflow input has no `visual` field. Visual scoring is therefore disabled and the supplied title is ignored.
- **Canonical repair:** read `state.visual` and `state.title` from the workflow step/condition context; add focused tests that fail under `getInitData` and pass under `state`.
- **Score:** P0; sites 3; hazard 3; effort 1; leverage 9; Tier 1.
- **Classification:** code-only; no special exclusion.
- **Status:** recommended for approval as boundary `workflow-state`.

### F-002 Every authenticated user is intentionally treated as an administrator

- **Files:** `src/access/roles.ts:7-30` and every collection/route consuming those predicates.
- **Impact:** create/delete/read/update and role/membership controls collapse to `Boolean(user)`.
- **Classification:** security-control; terminally excluded from compound repair.
- **Required decision:** establish intended admin/author/viewer/owner policy and verify generic REST, local API, custom routes, and field access with negative identities.

### F-003 Authenticated authors can submit executable raw Slidev Markdown/frontmatter

- **Files:** `src/blocks/spec/markdown.ts:9-38`, `src/export/blocks/markdown.ts:19-38`, Slidev staging/execution path.
- **Impact:** unescaped Markdown/frontmatter reaches server-side Vite/Slidev compilation.
- **Classification:** security-control and build-isolation boundary; excluded.

### F-004 Media filenames reach staging copy paths without containment validation

- **Files:** `src/jobs/buildSlidesRunner.ts:130-136` plus filename extraction call path.
- **Impact:** externally derived filename values are joined into source and destination filesystem paths without basename/containment proof.
- **Classification:** security-control; excluded despite Tier-1 effort.

## P1 — active correctness and drift risk

### Recommended first wave

| ID | Boundary | Sites | Hazard | Effort | Leverage | Tier |
|---|---|---:|---:|---:|---:|---:|
| F-005 | Remove obsolete Payload Jobs `Function` casts | 4 | 3 | 1 | 12 | 1 |
| F-006 | Consolidate active draft statuses and phase metadata | 4 | 3 | 2 | 6 | 2 |
| F-007 | Use canonical AI credentials for live-test gates | 9 | 3 | 2 | 13.5 | 2 |
| F-008 | Run CI on the stated Node 20 runtime | 7 | 3 | 1 | 21 | 1 |
| F-009 | Rewrite live AGENTS.md architecture guidance | 15 | 3 | 2 | 22.5 | 2 |
| F-020 | Reuse `SLUG_MAX` in unique-slug generation | 2 | 2 | 1 | 4 | 1 |

#### F-005 — Payload generated jobs typing is bypassed by obsolete casts

Generated `payload-types.ts` already contains `buildSlides`, but production queue/run calls in `Presentations.ts`, `afterPresentationChange.ts`, and `afterOrganisationChange.ts` cast APIs to `Function`. Canonical owner is Payload's generated task typing. Remove casts/comments and let typecheck protect task names and inputs.

#### F-006 — Agent draft active-state and phase registries have competing owners

`src/lib/status.ts`, `src/lib/runState.ts`, the agent route, and `AgentDraftButton.tsx` independently define active statuses, workflow phases, labels, and ordering. Extend the client-safe status module with canonical active statuses and phase keys/metadata; derive server/client consumers without importing server-only code into the browser.

#### F-007 — Live tests silently skip canonical credentials

The runtime and `.env.example` prefer `CLIPROXYAPI_BASE_URL` / `CLIPROXYAPI_KEY`, with `OPENAI_*` compatibility fallback. Seven live test surfaces gate only on `OPENAI_API_KEY`. Add one client-safe/server-safe credential-presence helper or consistent expression matching runtime precedence, without exposing secret values.

#### F-008 — CI validates Node 22 instead of deployed Node 20

`.nvmrc`, AGENTS.md, contributing guidance, and Docker specify Node 20; CI installs Node 22 and cannot exercise the documented Node-20 Undici shim. Change only the CI runtime to the repository's canonical Node version.

#### F-009 — AGENTS.md describes removed architecture

AGENTS.md names the removed `/api/draft-presentation`, `draftPresentationSlides`, DraftFromBriefButton, ShareLinks collection/routes, and an empty migration registry. It also documents obsolete environment precedence. Rewrite current guidance from source while preserving historical plans/reports unchanged.

#### F-020 — Slug max length has regressed to a literal

`src/lib/slug.ts` owns `SLUG_MAX = 64`, while `Presentations.ts` uses raw `64 - marker.length`. Import and use the canonical constant; protect suffix-aware truncation with the existing slug tests or a focused collection test.

### Deferred or excluded P1 findings

- **F-010:** footer defaults and preview/build variable semantics diverge — state-bound Tier 3; requires persisted-value inventory.
- **F-011:** each block spec repeats identity three/four times — Tier 3 structural boundary.
- **F-012:** 44 raw class-token sites in dirty export work — confirmed but excluded to preserve user changes.
- **F-013:** route/collection authorization disagreement — security-control.
- **F-014:** OAuth avatar trust/size/redirect handling — security and external boundary.
- **F-015:** hand-rolled Mastra background/cancellation lifecycle — Tier 3 external lifecycle review.
- **F-016:** Docker/Compose/migration smoke absent from CI — Tier 3, migration/deployment-sensitive.
- **F-017:** browser E2E absent from CI — Tier 3 and credentialed external surface.
- **F-027:** MCP evidence provenance inferred from model text — security/state/external boundary.
- **F-029:** expensive LLM/Chromium/Slidev work has no quotas — security/state/external boundary.

## P2 — maintenance debt

### F-018 [Tier 1] Draft mode is declared three times

- **Files:** `AgentDraftButton.tsx`, agent-draft route Zod enum, `agents/tools/persist.ts`.
- **Repair:** introduce a client-safe `DRAFT_MODES` tuple and `DraftMode`; build the Zod enum and typed consumers from it.
- **Score:** sites 3; hazard 2; effort 1; leverage 6.
- **Status:** recommended first wave, combined with F-006 only if the shared status module stays one atomic boundary.

### Other P2 findings

- **F-019:** deck languages and locale mapping have multiple owners — state-bound; enum expansion would require forward migration approval.
- **F-021:** block roster repeated across spec, Payload, renderer, and docs — Tier 3; client/server import boundaries require design.
- **F-022:** `renderSchemaOf` advertises an unused parity guarantee — deletion/test decision requires explicit approval.
- **F-023:** internal-only exports and unused aspect-ratio constant — deletion boundary; not auto-approved.
- **F-024:** Payload CSS copied from private dist path despite public export — external integration plus generated-file deletion review.
- **F-025:** Fallow lacks dynamic Payload/import-map entry knowledge and malformed suppressions create noise — tooling boundary; never delete based solely on current report.
- **F-026:** PRD is an abandoned architecture presented as current — Tier 4 product-document rewrite.
- **F-028:** raw provider/build errors reach user-readable persistence — security/state/external boundary.
- **F-030:** Biome config schema/deprecation notices — untiered, no active harm.

## Proposed approval wave

Approve these exact atomic boundaries only:

1. `workflow-state` — F-001
2. `jobs-typing` — F-005
3. `draft-contracts` — F-006 + F-018
4. `live-test-credentials` — F-007
5. `ci-node-runtime` — F-008
6. `agents-docs` — F-009
7. `slug-length` — F-020

Conditions:

- Do not touch existing `src/export/**` changes.
- No security-control, deletion, state-bound, migration, Docker, OAuth, MCP, browser-E2E, or external lifecycle repair.
- Preserve baseline: tests/typecheck/ESLint/Biome lint pass; format check may fail only on generated `.hermes` workflow JSON.
- Add focused mutation-sensitive protection for F-001 and F-020; do not weaken existing tests.
- Code-only mode provides no Git isolation or commit guarantees.

## Finding signature — iteration 1

```text
agents/workflow.ts:workflow-state:framework-state-read
access/roles.ts:authorization-policy:security-control
blocks/spec/markdown.ts:raw-slidev:security-control
jobs/buildslidesrunner.ts:media-copy:path-containment
payload-jobs:task-api:obsolete-casts
draft-status:active-phases:competing-registry
live-tests:credentials:legacy-gate
ci.yml:node-version:runtime-drift
agents.md:architecture:stale-docs
footer-vars:resolution:semantic-drift
block-specs:identity:repeated-literal
export:class-tokens:ssot-regression
authorization:route-collection:policy-drift
oauth-avatar:download:unbounded-trust
agent-route:lifecycle:framework-drift
ci:production-smoke:test-gap
ci:e2e:test-gap
draft-mode:enum:competing-registry
deck-language:locale:competing-registry
presentations:slug-max:raw-literal
blocks:roster:competing-registry
dsl:renderschemaof:fictional-parity
public-exports:internal-helpers:excess-surface
payload-css:private-path:framework-drift
dead-code:registries:tooling-noise
prd:architecture:stale-contract
mcp:evidence:provenance-trust
errors:diagnostics:information-exposure
workloads:quotas:resource-control
biome:config:version-drift
```

## Execution log

- 2026-08-25 18:58 — Approval was granted for the proposed seven boundaries, but durable approval validation failed closed. While diagnosing it, the repository changed concurrently across the agent workflow, CI, configuration, dependencies, and tests, including approved paths. The approval evidence and repository fingerprint are therefore stale; no repair from this audit was applied.
- 2026-08-25 17:43 — User explicitly selected code-only refactor on dirty tree.
- 2026-08-25 17:44 — Repository frame and prior-art evidence captured.
- 2026-08-25 17:45 — Five discovery lenses dispatched in parallel.
- 2026-08-25 17:46 — Baseline test, typecheck, and ESLint started.
- 2026-08-25 17:47 — Test 458/458 passed; typecheck and ESLint passed.
- 2026-08-25 17:55 — Complete layer aggregate persisted.
- 2026-08-25 18:03 — Delegated synthesis timed out; complete layer artifacts retained.
- 2026-08-25 18:06 — Coordinator synthesis completed and ranked.
- 2026-08-25 18:06 — Coordinator detected the lean-refactor skill changed its discovery schema during the run; reinitialized against the current seven-stage coordinator and replayed hashed artifacts rather than editing stale state.
