---
name: deck-authoring
description: Use when authoring slides outside the in-app AI workflow in the Payload + Slidev deck repository. Schema details are generated from the block-spec SSOT.
---

# Deck authoring

Use this skill for manual slide creation, seed scripts, and revisions in the slides repository.

## SSOT references

Read [the generated schema reference](reference/schema.md) before authoring blocks. Read [the generated prompt catalogue](reference/prompt-catalogue.md) when choosing a layout or shaping content. Regenerate both with `pnpm generate:agent-skills` after block-spec or template changes.

## Manual authoring is not the AI workflow

Manual authoring does not invoke the in-app gather → structure → writer → validate → visual workflow and does not reuse its complete prompts. It does, however, use the same typed block schemas, layout contracts, limits, prompt metadata, renderers, and build pipeline. Treat the generated references as the contract for valid data, not as a claim of output-quality parity.

## Workflow

1. Choose a document template and an allowed layout from the generated reference.
2. Write content as visual structure, not a domain-specific template. Keep each slide self-explanatory and put the decision-maker outcome before the mechanism.
3. Keep every field within the generated limits. Respect required fields, nested array limits, citation rules, and layout capacities.
4. Author or update a generic `scripts/seed-<name>.ts` file. Do not create per-case CLI commands or leave `tmp-*` scripts behind.
5. Run `NODE_ENV=development pnpm deck:seed <name>`, then `NODE_ENV=development pnpm deck:build <id>`.
6. Inspect the exported PDF, not only the browser preview. Check truncation, overflow, collisions, links, footnotes, diagrams, and footer behavior on every page.

## Content rules

- Benefits describe outcomes, not mechanisms.
- Titles are concise plain text without ending punctuation or Markdown.
- Use the exact facts supplied by the brief or sources. Do not invent case-specific facts, dates, figures, citations, or URLs.
- Use `table` for multi-criterion comparisons, `timeline` for ordered phases, and `mermaid` for relationships or flows that a list cannot explain.
- For Mermaid, fully label nodes, put a verb on every edge, use `<br/>` for line breaks, and verify the rendered diagram.

## Verification

Run `pnpm typecheck` and `pnpm exec eslint <touched files>`. For a built deck, require a successful PDF and SPA build plus visual PDF inspection. Preserve build-queue suppression when a seed or internal patch writes through Payload.
