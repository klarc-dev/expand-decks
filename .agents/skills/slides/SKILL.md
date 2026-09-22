---
name: slides
description: Use for authoring, reviewing, revising, and building slides in the Payload + Slidev deck repository. Schema and Mastra prompt knowledge are generated from the application SSOT.
---

# Slides

Use this skill for manual slide creation, review, revision, seed scripts, and build verification.

## Mandatory references

- [Schema and template reference](references/schema.md)
- [Layout prompt catalogue](references/layout-prompts.md)
- [Mastra workflow prompts](references/mastra-prompts.md)
- [Local, production, REST, and MCP operations](references/operations.md)

Regenerate these references with `pnpm generate:agent-skills` after block-spec, template, or Mastra prompt changes. Check freshness with `pnpm generate:agent-skills:check`.

## Source-of-truth boundary

The generated references are projections of the runtime SSOT:

- Block schemas, limits, layout contracts, and layout prose come from `ALL_SPECS` and document templates.
- Gather, research, structure, writer, and visual instructions come from the Mastra prompt module used by runtime agents.
- Manual authoring still does not invoke the Mastra workflow. It does not automatically perform source gathering, dossier grounding, schema repair, rubric loops, layout repair, or visual scoring.
- Local, production, REST, and MCP guidance comes from the shared operations contract consumed by `pnpm prod help`.

## Authoring and review workflow

1. Choose a document template and an allowed layout from the generated reference.
2. Write content as visual structure, not a domain-specific template. Keep each slide self-explanatory and put the decision-maker outcome before the mechanism.
3. Keep every field within the generated limits. Respect required fields, nested array limits, citation rules, and layout capacities.
4. Author or update a generic `scripts/seed-<name>.ts` file. Do not create per-case CLI commands or leave `tmp-*` scripts behind.
5. Run `NODE_ENV=development pnpm deck:seed <name>`, then `NODE_ENV=development pnpm deck:build <id>`.
6. Inspect the exported PDF, not only the browser preview. Check truncation, overflow, collisions, links, footnotes, diagrams, and footer behavior on every page.
7. For review or revision, apply the Mastra prompt references as a quality rubric, then inspect the actual rendered PDF.

## Production workflow

1. Read the generated operations reference before touching production.
2. Run `pnpm prod status` to identify the deployed SHA and queue state.
3. Use `pnpm prod pull` when production data should be inspected or reproduced locally; it never writes to production.
4. Use `pnpm prod run` only for a committed, narrowly scoped top-level script. Read-only inspection is preferred.
5. Treat `seed-*` and `set-*` scripts as production mutations. They require explicit user authorization and the CLI's `--yes` confirmation.
6. Do not recreate a deck MCP server. Use the authenticated canonical REST boundary for external layout integrations.

## Content rules

- Benefits describe outcomes, not mechanisms.
- Titles are concise plain text without ending punctuation or Markdown.
- Use the exact facts supplied by the brief or sources. Do not invent case-specific facts, dates, figures, citations, or URLs.
- Use `table` for multi-criterion comparisons, `timeline` for ordered phases, and `mermaid` for relationships or flows that a list cannot explain.
- For Mermaid, fully label nodes, put a verb on every edge, use `<br/>` for line breaks, and verify the rendered diagram.

## Verification

Run `pnpm typecheck` and `pnpm exec eslint <touched files>`. For a built deck, require a successful PDF and SPA build plus visual PDF inspection. Preserve build-queue suppression when a seed or internal patch writes through Payload.
  