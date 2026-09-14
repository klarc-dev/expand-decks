---
target: presentation authoring UX
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/joachimbrindeau/Development/expand/production/slides/src/collections/Presentations.ts"
target_fingerprint: "sha256:dff4db0f4d298f6eb03d9eeb5554a2bd2ffcccbc57c221012a1a1d7dc83bd6d0"
target_path: /Users/joachimbrindeau/Development/expand/production/slides/src/collections/Presentations.ts
timestamp: 2026-09-14T06-34-48Z
slug: src-collections-presentations-ts
---
# UX Debloat Critique

## Design Health

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 4 | Strong live build, AI progress, polling, and toast feedback. |
| 2 | Match with real-world language | 3 | Mostly author-friendly French, with technical terms such as build, worker, Slidev, and agentique leaking into primary UI. |
| 3 | User control and freedom | 3 | Cancel, reject, restart, and revision paths exist. Some actions require navigating to another tab for confirmation. |
| 4 | Consistency and standards | 3 | Payload primitives are used consistently, but export/status access is split across menu and Sortie tab. |
| 5 | Error prevention | 3 | Validation and destructive confirmation are good. Mode selection and hidden save prerequisites still add risk. |
| 6 | Recognition rather than recall | 3 | Labels and descriptions are thorough, but users must remember where output and AI actions live across tabs. |
| 7 | Flexibility and efficiency | 2 | Rich capabilities exist, but expert flows require substantial scrolling and repeated per-row controls. |
| 8 | Aesthetic and minimalist design | 2 | Feature-complete but vertically expansive, with repeated descriptions, panels, borders, statuses, and controls. |
| 9 | Error recovery | 3 | Errors are actionable and preserve context; technical details are progressively disclosed. |
| 10 | Help and documentation | 3 | Extensive inline help exists, though its volume becomes part of the clutter. |
| **Total** |  | **29/40** | **Good foundation, meaningful simplification opportunity** |

## Design Specificity Verdict

The interface is clearly built for presentation authors, especially through slide previews, slide-aware labels, AI revision, source grounding, plan approval, and build artifacts. It does not feel like a generic CRUD admin. The main weakness is not missing product character but excessive simultaneous explanation and operational detail.

The deterministic detector reported 6 warnings and 0 errors: `overused-font` twice, `side-tab` twice, and `layout-transition` twice. Most warnings in `src/app/(payload)/payload-admin.css` are generated/vendor-style output and are weak evidence for this authoring-flow critique. The Arial warning on `membership-pending.scss` is valid but peripheral. Source inspection provides much stronger evidence of the core UX bloat.

## Overall Impression

This is a capable, thoughtfully hardened authoring tool. The biggest opportunity is to preserve the exact capability set while changing when and where complexity appears: make the default view about writing and reviewing slides, then reveal configuration, diagnostics, and exceptional actions contextually.

## What's Working

1. **System feedback is unusually strong.** AI stages, build polling, success toasts, failure summaries, and technical-details disclosure reduce uncertainty.
2. **Progressive disclosure already has good precedents.** Advanced AI options, the agent journal, and technical build errors use `<details>` effectively.
3. **The slide outline is scannable.** Numbered row labels derived from slide titles turn collapsed blocks into a usable document outline.

## Priority Issues

### [P1] The IA splits one authoring workflow into too many peer tabs

**Why it matters:** `Contenu`, `IA`, `Réglages`, and `Sortie` are presented as equal destinations, although writing slides is the continuous task and the other areas are supporting or occasional. Users must remember where generation, publication, and downloads live.

**Fix:** Keep every tab and feature, but establish a task hierarchy. Make `Contenu` the workspace, surface a compact AI entry point and current build state near its top, and treat the full IA panel, settings, and output as expanded destinations. Add status badges or concise summaries to inactive tabs so users do not need to visit them just to check state.

### [P1] The IA panel front-loads optional decisions before the primary action

**Why it matters:** The brief, slide-count range, sources, three generation modes, advanced switches, run actions, progress rail, journal, plan approval, and errors can all inhabit one long page. Most runs only need a brief and a start action.

**Fix:** Preserve all controls but divide the panel into “Brief”, “Configuration”, and “Run”. Default to brief plus a one-line configuration summary such as “Réviser · nombre auto · 2 sources · critique visuelle”. Put slide count, source selection, mode, and advanced switches behind an editable disclosure. During a run, collapse configuration automatically and prioritize progress, cancel, and approval.

### [P1] Every expanded slide permanently allocates a preview workspace

**Why it matters:** `SlidePreview` adds a header, loading status, AI button, optional revision form, error area, and a scaled canvas after each block’s content fields. In a long deck this creates heavy vertical rhythm and duplicates the same chrome many times.

**Fix:** Keep live preview and per-slide AI revision, but make preview a collapsible or sticky inspector associated with the active slide. At minimum, collapse the frame by default after the author leaves a slide and keep a compact thumbnail/status row. The AI revision input can remain within the preview disclosure.

### [P2] Export capability and output status are duplicated across locations

**Why it matters:** The edit menu exposes artifacts and “Exporter”, while the `Sortie` tab repeats build status and artifact links. The toast then directs users to the tab. This is functional duplication that creates uncertainty about the canonical place to act.

**Fix:** Keep both access paths but give them distinct jobs. The edit menu becomes the fast action surface: primary artifact open/download plus “Relancer l’export”. The `Sortie` tab becomes history and diagnostics. Use identical naming and status in both, and link directly from the menu’s running/error state to `Sortie`.

### [P2] Read-only and diagnostic data occupy full form structures

**Why it matters:** The standardized footer renders three read-only fields whose values are already explained in the group description. The artifact array exposes a detailed record structure even though authors primarily need links. Inline descriptions repeat labels and obvious behavior across settings.

**Fix:** Preserve stored fields and API behavior, but replace author-facing read-only form controls with compact summaries. Show “Pied de page: Organisation · page / total” plus its enabled toggle and an optional details disclosure. Keep artifact records hidden behind the custom build-status surface. Shorten descriptions that restate labels.

## Persona Red Flags

**Alex, power user:** Repeated slide previews and per-row table arrow/delete controls make long-deck editing scroll-heavy. There is no compact deck-level inspector or obvious accelerator for switching between authoring, AI, and output.

**Jordan, first-timer:** Four peer tabs and terms like “build agentique”, “worker”, “Slidev”, and “artefacts” describe implementation rather than the next authoring decision. The wealth of inline help competes with the primary action.

**Sam, keyboard and screen-reader user:** Labels, fieldsets, live regions, and detailed button names are strong. The table editor still creates a very large tab sequence because each row and column exposes three separate controls.

## Minor Observations

- Replace “Build” with “Génération” or “Export” in primary copy, reserving technical vocabulary for details.
- The five-stage progress rail and the adjacent textual run status repeat the same state. Keep the rail visually, but make the text describe only actionable detail.
- Table row/column move controls could live in a single contextual menu or drag handle with keyboard alternatives, preserving all actions while reducing visible buttons.
- The `membership-pending` card is isolated from the admin visual system and uses a generic font, but it is not a major source of authoring bloat.

## Questions to Consider

1. Should the first implementation focus on the AI panel, the per-slide preview footprint, or the overall tab hierarchy?
2. Should the debloat pass address only the top three P1 issues, or include output/settings consolidation too?
3. Is a sticky active-slide inspector acceptable, or should previews remain inline and simply collapse more aggressively?

## Acceptance Validation Addendum

### Requirement-to-evidence map

| Requirement / recommendation | Concrete check | Observed result |
|---|---|---|
| Preserve every feature while simplifying presentation authoring | Isolated Playwright flows for authenticated admin, create/edit/save presentation, add/edit/save slide blocks, build status, preview, and source discovery | Core features are independently exercised. The selected E2E set produced 16 passes and one parallel-contention failure; the failed slide-authoring flow passed when isolated, 2/2 including setup. |
| AI panel can be compressed without losing behavior | `agentDraftDebloat.test.ts`, `agentDraftJournal.test.ts`, agent-draft and agent-sources route tests | 49 focused tests passed across UI selection/default logic, journal formatting, run commands, authentication, validation, and malformed source-registry recovery. |
| Preview can move to progressive disclosure or an active-slide inspector | `slidePreviewState.test.ts`, preview hydration tests, and Playwright preview-source flows | Preview request selection, deck context, organisation chrome, cache policy, invalid schema recovery, access isolation, and real preview rendering passed. |
| Export menu and Sortie can be clarified without losing outputs/status | Playwright `admin-build-status.spec.ts` | Both successful artifact links and failed status with summary, timestamp, and expandable technical detail passed in the real admin. |
| Public and unauthenticated states remain clear | Real dev server requests and Firefox inspection | `/` redirected to admin; admin login rendered; membership pending and rejected variants returned 200 and displayed one clear recovery action; invalid share token returned 404. |
| Protected authoring integrations remain protected | Real HTTP requests to agent sources, agent draft, slide preview, and slide revision without a session | All four protected boundaries returned 401 with `Non authentifié`; `/api/users/me` returned `user: null`. |
| Edge states and likely failure modes are covered | Invalid credentials, required title, viewer authorization, foreign presentation, malformed source registry, schema-invalid preview, build failure, invalid share token | Focused tests and E2E checks passed for each state. Malformed MCP registry logged a diagnostic while retaining accessible knowledge bases as intended. |
| Production packaging remains valid | `pnpm typecheck`; `pnpm build` | Next.js production compilation succeeded, but both checks stopped at TypeScript because two existing test fixtures lag current types: missing required `model` in `src/mcp/__tests__/deckServer.test.ts`, and missing `draft` discriminator in `tests/e2e/global.setup.ts`. Packaging is therefore blocked independently of the UX audit. |

### Acceptance findings that refine the critique

- The recommendation to reduce per-slide vertical density is confirmed by the real accessibility snapshot: one expanded section slide exposed title/organisation/template controls, four peer tabs, page toolbar actions, five slide field groups, sources/notes controls, preview header, AI action, and full rendered canvas in a single document flow.
- Build status progressive disclosure is validated, not speculative: real E2E passed both successful artifacts and failed-build technical detail.
- A concurrency failure mode exists in the E2E suite: parallel tests sharing the same presentation can trigger Payload's `Document modified` stale-data modal, which blocks Save. The same complete slide-authoring workflow passed in isolation, showing fixture contention rather than a broken single-user flow. It is still relevant evidence for collaborative/stale-state UX.
- The login and membership states are already distilled and should not be included in the main debloat implementation scope.

### Constraints

The live development database had no configured seed credentials, so manual Firefox inspection could not enter the editor. The hermetic Playwright suite supplied isolated authenticated admin/author/viewer states and exercised the actual Payload UI and HTTP routes instead. Production packaging remains blocked by the two type errors above.

## Final Whole-Result Verification

No product UI was changed during this task, so the result to validate is the quality and completeness of the opportunity audit. It would be inaccurate to claim the interface is already better. The checks below confirm that the recommendations are grounded in current behavior and that their feature-preservation constraints cover the whole product.

- **Full public and integration acceptance:** complete hermetic Playwright suite passed **60 tests**, with **1 live-provider pipeline test skipped**. This includes authentication and roles, organisation access, presentation create/edit/save, slide CRUD and block authoring, knowledge/media authoring, build request throttling, build success/failure UI, agent run state and invalid transitions, preview/source APIs, variable exposure, and built SPA access/file serving.
- **Full project tests:** **971 passed**, **10 skipped**, **2 failed** across 148 files. Real Slidev PDF/image exports, native print validation, and all-template dogfood rendering passed. The two failures are stale model-tier expectations in `src/agents/__tests__/registry.test.ts` and a missing `model: "high"` expectation/input in `src/mcp/__tests__/deckServer.test.ts`; they are unrelated to this UX audit but confirm the repo is not fully green.
- **Production packaging:** Next.js production compilation succeeded. Typecheck and final build failed at the same two fixture typing gaps previously recorded: missing required `model` in `src/mcp/__tests__/deckServer.test.ts` and missing `draft` in `tests/e2e/global.setup.ts`.
- **Deterministic UI scan:** still reports exactly **6 warnings, 0 errors**: one relevant generic-font warning on the membership page and five warnings inside generated `payload-admin.css` (font, side borders, and width transitions). Generated CSS findings are not actionable in this audit because the prebuild step overwrites that file.

### Final requirement outcomes

| Explicit requirement | Final whole-result evidence | Outcome |
|---|---|---|
| Find debloat opportunities | Dual-agent critique, real admin accessibility snapshot, full E2E behavior, detector | Satisfied: prioritized opportunities are tied to observed controls and workflows. |
| Remove no feature | All 60 non-live E2E workflows mapped against recommendations; 971 unit/integration tests passed | Satisfied at audit/design level: every proposed change uses hierarchy, consolidation, or progressive disclosure rather than removal. No implementation was made. |
| Cover public interfaces and integration boundaries | Full E2E suite across admin, REST, SPA assets, authentication, access, previews, sources, runs, media, and builds | Satisfied. |
| Cover main workflows and edge cases | Create/edit/save, block CRUD, invalid forms, invalid credentials, foreign access, viewer denial, throttling, invalid transitions, schema-invalid preview, build failure, missing files | Satisfied. |
| Cover packaging and likely failure modes | Full Vitest, real Slidev exports, typecheck, Next production build | Exercised completely; packaging currently blocked by recorded stale test fixture types. |
| Prove the result is better | No UX implementation exists to compare before/after | Not applicable yet. The audit is acceptance-grounded, but improvement can only be measured after implementing a selected recommendation. |
