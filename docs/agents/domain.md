# Domain docs

This repository uses a **single-context** domain-documentation layout.

## Before exploring

Read, when present:

- `CONTEXT.md` at the repository root
- ADRs under `docs/adr/` that affect the area being changed

If these files do not exist, proceed without treating their absence as a blocker. The domain-modeling workflow creates them when the project resolves terminology or a durable architectural decision.

## Layout

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary

Use domain terms as defined in `CONTEXT.md` in issue titles, specifications, tests, code, and review findings. Avoid introducing synonyms for established concepts.

If a needed concept is absent, either use the vocabulary already present in the codebase or invoke domain modeling to resolve and record the term.

## Architectural decisions

Read relevant ADRs before designing or implementing a change. If proposed work conflicts with an ADR, surface the conflict explicitly rather than silently overriding the recorded decision.
