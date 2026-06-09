export const meta = {
  name: 'pi-deck-consistency',
  description:
    'Research Slidev typography best practices, audit component font-size/spacing inconsistencies against the type-ramp tokens, and produce a unified-token patch plan',
  phases: [
    { title: 'Research', detail: 'Slidev + design-system typography best practices' },
    {
      title: 'Audit',
      detail: 'parallel auditors map each component CSS to the token ramp, flag divergences',
    },
    { title: 'Synthesize', detail: 'one agent merges findings into a concrete ordered patch plan' },
  ],
};

const ROOT = '/Users/joachimbrindeau/Development/expand/production/slides';
const CSS = `${ROOT}/src/export/style.css`;
const BLOCKS = `${ROOT}/src/export/blocks`;
const UTILS = `${ROOT}/src/export/utils.ts`;

phase('Research');
const research = await agent(
  `Research current Slidev theming + typography best practices for a custom-styled deck. Use WebSearch/WebFetch on sli.dev docs (config-mermaid, themes, /custom, /features) and general slide-typography guidance. Answer concretely:
1. Does Slidev recommend a CSS custom-property type scale / design tokens? How do well-built Slidev themes (e.g. theme-default, theme-seriph) structure heading vs body font sizes?
2. Best-practice ratio for a modular type scale (e.g. 1.2 minor third / 1.25 major third) on a 1280×720 canvas — what rem sizes for h1/h2/h3/body/caption keep hierarchy clear and CONSISTENT across components?
3. Card/component typography: how to ensure a "card title" and "card body" look identical no matter which layout (grid vs column) renders them — single source of truth pattern.
Return a crisp set of recommended rem values + the principle "every component pulls from shared tokens, no per-component hardcoded sizes". Keep it actionable.`,
  {
    label: 'research:slidev-type',
    phase: 'Research',
    schema: {
      type: 'object',
      properties: {
        recommendedScale: { type: 'object', additionalProperties: { type: 'string' } },
        principles: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
      required: ['recommendedScale', 'principles', 'notes'],
    },
  },
);

phase('Audit');
const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          currentSize: { type: 'string' },
          issue: { type: 'string' },
          proposedToken: { type: 'string' },
          severity: { type: 'string', enum: ['minor', 'major'] },
        },
        required: ['selector', 'currentSize', 'issue', 'proposedToken', 'severity'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
};

const researchCtx = JSON.stringify(research);
const auditAreas = [
  {
    label: 'audit:cards',
    focus: `CARDS specifically (the user's main complaint: "different font sizes in components that should look alike, e.g. cards"). Examine .k-card, .k-card h3, .k-card p, .k-card .k-num, .k-tight .k-card p, and how card() in ${UTILS} + cardGrid.ts/twoCols.ts emit titles vs descriptions. A card title and body MUST render at the same size whether in a 2/3/4-col grid (cardGrid) or a column (twoCols rightCards). Flag every place card text size diverges (esp. the .k-tight 0.82rem vs normal 0.88rem split) and the non-tokenized 1.15rem/0.88rem/0.75rem literals.`,
  },
  {
    label: 'audit:headers',
    focus: `SLIDE HEADERS + titles. Compare .slidev-layout h1 (3.2rem) / h2 (2.1rem) against the token ramp (--t-* in :root) and .k-h-lg (--t-title 3rem) / .k-h-md (--t-sub 2.25rem) used by slideHeader(). Flag: (a) the raw h1/h2 sizes that don't match any token, (b) any title rendered at an inconsistent size across cover/section/statement/table/timeline/cardGrid/mermaid. Propose: every title size = a single token.`,
  },
  {
    label: 'audit:body-misc',
    focus: `BODY TEXT + misc components: .k-hero-body, .k-hero-sub, .k-center-hero-sub, .k-cta-sub, .k-quote, .k-author, .k-caption, .k-mermaid-caption, .k-tl-label/.k-tl-desc/.k-tl-band, .k-stat .val/.lbl, .k-btn, .k-pill, .k-eyebrow. List every hardcoded rem and whether it should map to --t-body / --t-caption or a NEW intermediate token. Goal: a small, consistent ramp with NO orphan sizes.`,
  },
];

const audits = await parallel(
  auditAreas.map(
    (a) => () =>
      agent(
        `You are a design-system auditor for a Slidev deck's stylesheet ${CSS} (renderers in ${BLOCKS}, helpers in ${UTILS}). Research context (recommended scale + principles): ${researchCtx}\n\nRead ${CSS} and the relevant renderer/helper files. FOCUS: ${a.focus}\n\nFor each inconsistency, return: the CSS selector, its current size, what's wrong (e.g. "hardcoded, bypasses token ramp" or "diverges from sibling component"), the proposed token or unified value, and severity. Only real inconsistencies — do NOT flag intentional hierarchy (a title SHOULD be bigger than body). The goal is: components that should look alike DO, and every size pulls from the shared --t-* ramp.`,
        { label: a.label, phase: 'Audit', schema: AUDIT_SCHEMA },
      ),
  ),
);

phase('Synthesize');
const allFindings = audits.filter(Boolean).flatMap((a) => a.findings || []);
const plan = await agent(
  `You are the design-system lead. Here is research on recommended Slidev typography: ${researchCtx}\n\nAnd here are audited inconsistencies in ${CSS}:\n${JSON.stringify(allFindings, null, 2)}\n\nProduce a CONCRETE, ordered patch plan to make the deck typographically consistent: (1) the final token ramp to declare in :root (--t-* values, adding intermediate tokens like --t-card-title/--t-card-body/--t-eyebrow ONLY if truly needed — prefer reusing existing tokens), (2) an ordered list of exact CSS edits (selector → old value → new value/token), grouped so cards become uniform first. Be precise and minimal — every edit must reduce inconsistency without flattening intentional hierarchy. Read ${CSS} yourself to confirm line-level accuracy.`,
  {
    label: 'synthesize:plan',
    phase: 'Synthesize',
    schema: {
      type: 'object',
      properties: {
        tokenRamp: { type: 'array', items: { type: 'string' } },
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              oldValue: { type: 'string' },
              newValue: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['selector', 'oldValue', 'newValue', 'rationale'],
          },
        },
        summary: { type: 'string' },
      },
      required: ['tokenRamp', 'edits', 'summary'],
    },
  },
);

return { research, findingCount: allFindings.length, plan }
