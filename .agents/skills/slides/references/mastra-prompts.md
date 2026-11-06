<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Mastra workflow contract

This is an actionable reference to the in-app Mastra deck workflow. It intentionally does **not** copy the full prompt text. The runtime prompt source remains authoritative; this file exposes each phase's purpose, contract, review questions, and a short fingerprint so drift is detectable.

Manual slide work can use these contracts as a review checklist, but it does not execute the workflow or gain its grounding, validation, repair, and visual-scoring behavior automatically.

## Workflow route

`brief → gather → structure → per-slide writer → rubric validation → optional visual scoring → assemble`

## Phase contracts

### 1. Gather and ground
- Runtime owner: `src/agents/agents/gather.ts`
- Prompt sources: `GATHER_INSTRUCTIONS`, `RESEARCH_INSTRUCTIONS`
- Input: Brief, requested language, source policy, and selected knowledge bases.
- Output: One DeckDossier containing core idea, audience, so-what, key points, data, references, and captured evidence.
- Invariants:
  - Preserve the brief's scope, terminology, point of view, and epistemic status.
  - Use general knowledge only to explain the requested subject.
  - Never invent author-specific facts, figures, citations, examples presented as real, causal claims, or recommendations.
- Review questions:
  - Is there one core idea?
  - Is the audience and its prior knowledge explicit?
  - Does every key point state a distinct claim?
  - Are source-backed facts separated from general explanation?

### 2. Structure
- Runtime owner: `src/agents/agents/structure.ts`
- Prompt sources: `buildStructureInstructions(template)`
- Input: Grounded dossier, document template, revision context, and optional slide-count range.
- Output: Ordered stubs containing only blockType, title, and intent.
- Invariants:
  - Plan coverage before prose.
  - Give each slide one information function.
  - Write message titles, never production instructions.
  - Enforce template page, endpoint, and occurrence rules.
- Review questions:
  - Does every dossier key point have a home?
  - Is the so-what established before the solution?
  - Are layouts chosen for logical relation rather than decorative variety?
  - Are sources attached to claims rather than planned as a source slide?

### 3. Per-slide writer
- Runtime owner: `src/agents/agents/writer.ts`
- Prompt sources: `buildWriterInstructions(blockType, template)`
- Input: One stub, a small dossier excerpt, and titles of other slides. Bodies of other slides stay hidden.
- Output: Final audience-facing content for exactly one typed block.
- Invariants:
  - Keep the planned layout and title locked except during an explicitly targeted revision.
  - Use only facts needed for this slide and give every populated field a distinct function.
  - Cite available references in footnotes.
  - Never emit instructions about what a slide should contain.
- Review questions:
  - Does the body prove or apply the title?
  - Is the slide self-explanatory?
  - Are optional fields omitted when they add no function?
  - Does the content stay within the generated schema limits?

### 4. Rubric validation and repair
- Runtime owner: `src/agents/workflow.ts`
- Prompt sources: `RUBRIC_PROMPT`, `INFORMATIONAL_STYLE_PROMPT`
- Input: Generated slide or deck.
- Output: Accepted content or a bounded repair request.
- Invariants:
  - Require one pedagogical function per slide and a message title.
  - Calibrate depth to the audience and make rules, conditions, limits, exceptions, and consequences explicit.
  - Reject slogans, superlatives, invented facts, unsupported causal claims, duplicated content, production instructions, and vague filler.
- Review questions:
  - What should the audience understand, decide, or do?
  - Which claim is supported by which evidence?
  - What is the applicable exception, uncertainty, or limit?
  - Is any sentence merely metadata about the authoring task?

### 5. Visual scoring
- Runtime owner: `src/agents/scorers/visual.ts`
- Prompt sources: `VISUAL_INSTRUCTIONS`
- Input: Rendered slide image.
- Output: Score, visible flags, and one imperative fix.
- Invariants:
  - Inspect only visible layout quality: overflow, clipping, cramped density, contrast, balance, and legibility.
  - Do not use visual scoring to rewrite content semantics.
- Review questions:
  - Is any text clipped or outside its container?
  - Is one region overloaded or visually empty?
  - Is contrast sufficient?
  - Is the composition balanced and legible?

### 6. Coverage recovery
- Runtime owner: `src/agents/agents/structure.ts`
- Prompt sources: `STRUCTURE_RESEARCH_INSTRUCTIONS`
- Input: Dossier points that the outline coverage gate found missing.
- Output: Bounded source notes used for a structure retry.
- Invariants:
  - Research only uncovered points.
  - Use returned evidence only.
  - Do not broaden the deck or add unrelated material.
- Review questions:
  - Does each recovery note map to an uncovered point?
  - Did the retry avoid unrelated expansion?

| Layout | Runtime job | Prompt fingerprint |
| --- | --- | --- |
| `cover` | `writer:cover` | `a12ae34e678d` |
| `section` | `writer:section` | `5d47c23360c1` |
| `statement` | `writer:statement` | `b27cb1211a1e` |
| `twoCols` | `writer:twoCols` | `63726f6cdd7d` |
| `cardGrid` | `writer:cardGrid` | `4d78a8837d32` |
| `stats` | `writer:stats` | `36302a12d4c2` |
| `quotes` | `writer:quotes` | `280fead6d80e` |
| `cta` | `writer:cta` | `6b581b3ec9ff` |
| `table` | `writer:table` | `dd5185e2045a` |
| `timeline` | `writer:timeline` | `4176967b36b9` |
| `mermaid` | `writer:mermaid` | `f7c12f5d842c` |
| `agenda` | `writer:agenda` | `76051b052b17` |

## Prompt drift fingerprints

These fingerprints make changes to the underlying prompts visible without copying large prompt bodies into the skill:

- Gather: `0955bc0159c9`
- Research: `2fb6e9a98e3f`
- Structure: `dfe20db5d00c`
- Visual: `19de27c19f78`

Writer fingerprints are listed in the layout table above.
