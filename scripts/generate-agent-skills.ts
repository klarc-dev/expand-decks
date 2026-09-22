import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_SPECS } from '../src/blocks/spec';
import { fieldsOf, type BlockSpec, type FieldSpec } from '../src/blocks/spec/dsl';
import { emitPromptSection, promptMetaOf } from '../src/blocks/spec/emit/emitPromptSection';
import {
  DOCUMENT_TEMPLATES,
  documentStructuralRulesPrompt,
  specsForDocumentTemplate,
} from '../src/documents/templates';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUTS = {
  authoring: path.join(ROOT, '.agents/skills/deck-authoring/SKILL.md'),
  review: path.join(ROOT, '.agents/skills/deck-review/SKILL.md'),
  schema: path.join(ROOT, '.agents/skills/deck-authoring/reference/schema.md'),
  catalogue: path.join(ROOT, '.agents/skills/deck-authoring/reference/prompt-catalogue.md'),
};

function fieldLines(field: FieldSpec, prefix = ''): string[] {
  const pathName = `${prefix}${field.name}`;
  const payload = field.payload;
  const args = field.factoryArgs ?? payload?.factoryArgs;
  const lines = [
    `- \`${pathName}\` (${field.factory}${field.ai === false ? ', not AI-draftable' : ''})`,
  ];
  if (payload?.type) lines.push(`  - Payload type: \`${payload.type}\``);
  if (payload?.required) lines.push('  - Required in Payload');
  if (payload?.minRows !== undefined || payload?.maxRows !== undefined) {
    lines.push(`  - Rows: ${payload.minRows ?? 0}–${payload.maxRows ?? '∞'}`);
  }
  if (payload?.maxLength !== undefined)
    lines.push(`  - Maximum visible length: ${payload.maxLength}`);
  if (args?.maxLength !== undefined) lines.push(`  - Maximum visible length: ${args.maxLength}`);
  if (args?.titleMaxLength !== undefined)
    lines.push(`  - Item title maximum: ${args.titleMaxLength}`);
  if (args?.descriptionMaxLength !== undefined) {
    lines.push(`  - Item description maximum: ${args.descriptionMaxLength}`);
  }
  if (payload?.options?.length) {
    lines.push(`  - Options: ${payload.options.map((option) => `\`${option.value}\``).join(', ')}`);
  }
  if (payload?.description) lines.push(`  - Admin guidance: ${payload.description}`);
  if (payload?.fields?.length) {
    lines.push(...payload.fields.flatMap((child) => fieldLines(child, `${pathName}[].`)));
  }
  return lines;
}

function blockSection(spec: BlockSpec): string {
  const meta = promptMetaOf(spec);
  const contract = spec.layout;
  return [
    `### \`${spec.blockType}\``,
    `- AI draftable: **${spec.aiDraftable ? 'yes' : 'no'}**`,
    `- Payload label: ${spec.labels.singular}`,
    contract ? `- Layout kind: \`${contract.kind}\`` : '',
    contract?.required?.length
      ? `- Required semantic roles: ${contract.required.map((role) => `\`${role}\``).join(', ')}`
      : '',
    contract?.capacities
      ? `- Collection capacities: ${Object.entries(contract.capacities)
          .map(([role, max]) => `${role} ≤ ${max}`)
          .join(', ')}`
      : '',
    contract?.supportsCitations ? '- Supports citations: yes' : '',
    contract?.media
      ? `- Media: ${contract.media.aspectRatio ?? 'unspecified'}; placements: ${contract.media.placements.join(', ')}`
      : '',
    meta ? `- Prompt summary: ${meta.summary}` : '',
    '',
    '**Fields:**',
    ...fieldsOf(spec).flatMap((field) => fieldLines(field)),
  ]
    .filter(Boolean)
    .join('\n');
}

function templateSection(template: (typeof DOCUMENT_TEMPLATES)[number]): string {
  const layouts = specsForDocumentTemplate(template).map((spec) => spec.blockType);
  return [
    `### ${template.label} (\`${template.id}\`)`,
    `- Canvas: ${template.canvas.width} × ${template.canvas.height} (${template.canvas.aspectRatio})`,
    `- Pages: ${template.pageCount.min}–${template.pageCount.max ?? 'unbounded'} authored; agent target ${template.agent.pageCount.min}–${template.agent.pageCount.max}`,
    `- Allowed layouts: ${layouts.map((layout) => `\`${layout}\``).join(', ')}`,
    `- Chrome: footer ${template.chrome.footer ? 'yes' : 'no'}, logo ${template.chrome.logo ? 'yes' : 'no'}, page numbers ${template.chrome.pageNumbers ? 'yes' : 'no'}`,
    `- Guidance: ${template.agent.guidance}`,
    '',
    '```text',
    documentStructuralRulesPrompt(template),
    '```',
  ].join('\n');
}

function renderSchemaReference(): string {
  return `<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Deck schema reference

This reference is generated from \`src/blocks/spec/\`, \`src/documents/templates.ts\`, and the attached layout contracts. It is the schema-aware companion to the handwritten operational guidance in the deck skills.

## Authoring invariants

- Block fields, Payload metadata, AI draftability, visible-text limits, prompt prose, semantic roles, and layout capacities come from the block-spec DSL.
- Use the exact \`blockType\` values below. Do not invent use-case-specific layouts or fields.
- Fields marked **not AI-draftable** may still be required when authoring a saved/rendered block.
- \`footnotes\` are generated as shared fields only for specs with citations enabled.
- Use \`pnpm deck:seed <name>\` and the typed seed data, not raw SQL or one-off tooling.

## Document templates

${DOCUMENT_TEMPLATES.map(templateSection).join('\n\n')}

## Layout blocks

${ALL_SPECS.map(blockSection).join('\n\n')}
`;
}

function renderPromptCatalogue(): string {
  const metas = ALL_SPECS.flatMap((spec) => {
    const meta = promptMetaOf(spec);
    return meta ? [meta] : [];
  });
  return `<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Runtime layout prompt catalogue

The following catalogue is emitted from the same \`PromptMeta\` records used by the in-app structure prompt. It is schema knowledge, not a replacement for the full Mastra workflow.

${metas.map(emitPromptSection).join('\n\n')}
`;
}

function renderAuthoringSkill(): string {
  return `---
name: deck-authoring
description: Use when authoring slides outside the in-app AI workflow in the Payload + Slidev deck repository. Schema details are generated from the block-spec SSOT.
---

# Deck authoring

Use this skill for manual slide creation, seed scripts, and revisions in the slides repository.

## SSOT references

Read [the generated schema reference](reference/schema.md) before authoring blocks. Read [the generated prompt catalogue](reference/prompt-catalogue.md) when choosing a layout or shaping content. Regenerate both with \`pnpm generate:agent-skills\` after block-spec or template changes.

## Manual authoring is not the AI workflow

Manual authoring does not invoke the in-app gather → structure → writer → validate → visual workflow and does not reuse its complete prompts. It does, however, use the same typed block schemas, layout contracts, limits, prompt metadata, renderers, and build pipeline. Treat the generated references as the contract for valid data, not as a claim of output-quality parity.

## Workflow

1. Choose a document template and an allowed layout from the generated reference.
2. Write content as visual structure, not a domain-specific template. Keep each slide self-explanatory and put the decision-maker outcome before the mechanism.
3. Keep every field within the generated limits. Respect required fields, nested array limits, citation rules, and layout capacities.
4. Author or update a generic \`scripts/seed-<name>.ts\` file. Do not create per-case CLI commands or leave \`tmp-*\` scripts behind.
5. Run \`NODE_ENV=development pnpm deck:seed <name>\`, then \`NODE_ENV=development pnpm deck:build <id>\`.
6. Inspect the exported PDF, not only the browser preview. Check truncation, overflow, collisions, links, footnotes, diagrams, and footer behavior on every page.

## Content rules

- Benefits describe outcomes, not mechanisms.
- Titles are concise plain text without ending punctuation or Markdown.
- Use the exact facts supplied by the brief or sources. Do not invent case-specific facts, dates, figures, citations, or URLs.
- Use \`table\` for multi-criterion comparisons, \`timeline\` for ordered phases, and \`mermaid\` for relationships or flows that a list cannot explain.
- For Mermaid, fully label nodes, put a verb on every edge, use \`<br/>\` for line breaks, and verify the rendered diagram.

## Verification

Run \`pnpm typecheck\` and \`pnpm exec eslint <touched files>\`. For a built deck, require a successful PDF and SPA build plus visual PDF inspection. Preserve build-queue suppression when a seed or internal patch writes through Payload.
`;
}

function renderReviewSkill(): string {
  return `---
name: deck-review
description: Use when reviewing manually authored decks against the generated block schema, template contracts, content rules, and Slidev export behavior.
---

# Deck review

Use the generated [schema reference](../deck-authoring/reference/schema.md) as the review contract. It is derived from the same block specs and document templates used by the application.

## Review gates

- Every block uses an allowed \`blockType\` and only fields documented for that block.
- Required fields, nested array ranges, visible-text limits, semantic capacities, citations, and non-AI fields are respected.
- The document obeys its template canvas, page count, allowed layouts, first/last layout rules, and occurrence rules.
- Content is self-explanatory, outcome-led, factually bounded, and free of invented sources or URLs.
- Tables align rows to columns. Timelines are ordered. Mermaid edges carry verbs and diagrams remain legible.
- Native PDF output has no clipping, overflow, overlap, footer collision, missing image, broken link, or font fallback defect.

## Evidence

Use the seed/build commands from \`deck-authoring\`, inspect the rendered PDF page by page, and report the exact slide and field for every defect. If a schema or template changed, run \`pnpm generate:agent-skills --check\` to prove the generated references are current.
`;
}

export const GENERATED_FILES: Record<string, string> = {
  [OUTPUTS.authoring]: renderAuthoringSkill(),
  [OUTPUTS.review]: renderReviewSkill(),
  [OUTPUTS.schema]: renderSchemaReference(),
  [OUTPUTS.catalogue]: renderPromptCatalogue(),
};

async function main() {
  const check = process.argv.includes('--check');
  for (const [filePath, content] of Object.entries(GENERATED_FILES)) {
    if (check) {
      let current = '';
      try {
        current = await readFile(filePath, 'utf8');
      } catch {
        throw new Error(`Missing generated skill: ${path.relative(ROOT, filePath)}`);
      }
      if (current !== content)
        throw new Error(`Generated skill is stale: ${path.relative(ROOT, filePath)}`);
      continue;
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
  console.log(
    `${check ? 'Checked' : 'Generated'} ${Object.keys(GENERATED_FILES).length} deck skill files.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
