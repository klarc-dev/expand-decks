---
name: deck-review
description: Use when reviewing manually authored decks against the generated block schema, template contracts, content rules, and Slidev export behavior.
---

# Deck review

Use the generated [schema reference](../deck-authoring/reference/schema.md) as the review contract. It is derived from the same block specs and document templates used by the application.

## Review gates

- Every block uses an allowed `blockType` and only fields documented for that block.
- Required fields, nested array ranges, visible-text limits, semantic capacities, citations, and non-AI fields are respected.
- The document obeys its template canvas, page count, allowed layouts, first/last layout rules, and occurrence rules.
- Content is self-explanatory, outcome-led, factually bounded, and free of invented sources or URLs.
- Tables align rows to columns. Timelines are ordered. Mermaid edges carry verbs and diagrams remain legible.
- Native PDF output has no clipping, overflow, overlap, footer collision, missing image, broken link, or font fallback defect.

## Evidence

Use the seed/build commands from `deck-authoring`, inspect the rendered PDF page by page, and report the exact slide and field for every defect. If a schema or template changed, run `pnpm generate:agent-skills --check` to prove the generated references are current.
