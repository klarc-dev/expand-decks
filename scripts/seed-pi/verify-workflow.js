export const meta = {
  name: 'pi-deck-verify',
  description:
    'Visual + content verification of the PI deck: per-page PDF review and source-fidelity audit',
  phases: [
    {
      title: 'Visual review',
      detail: 'agents read disjoint PDF page ranges, flag overflow/blank/clipping',
    },
    {
      title: 'Content audit',
      detail: 'agents check slide files vs draft.md for verbatim citations + limits',
    },
    { title: 'Coverage', detail: 'map all source slides + verify the new étape order' },
    { title: 'Synthesize', detail: 'dedup + prioritize findings' },
  ],
};

const { pdfPath, totalPages, slidesDir, draftPath, fileList } = args;

const PAGE_ISSUE_SCHEMA = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          ok: { type: 'boolean' },
          severity: { type: 'string', enum: ['none', 'minor', 'major', 'blocker'] },
          issue: { type: 'string' },
        },
        required: ['page', 'ok', 'severity', 'issue'],
      },
    },
  },
  required: ['pages'],
};

const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          severity: { type: 'string', enum: ['minor', 'major', 'blocker'] },
          kind: {
            type: 'string',
            enum: [
              'citation',
              'rowcount',
              'fieldshape',
              'richtext',
              'typo',
              'consistency',
              'other',
            ],
          },
          detail: { type: 'string' },
        },
        required: ['file', 'severity', 'kind', 'detail'],
      },
    },
  },
  required: ['findings'],
};

phase('Visual review');
const PAGE_BATCH = 4;
const pageBatches = [];
for (let start = 1; start <= totalPages; start += PAGE_BATCH) {
  pageBatches.push({ start, end: Math.min(start + PAGE_BATCH - 1, totalPages) });
}

const visualPromise = parallel(
  pageBatches.map(
    (b) => () =>
      agent(
        `Meticulous slide-deck visual QA. Use Read on the PDF "${pdfPath}" with pages "${b.start}-${b.end}" (render as images). For EACH page, judge if it is print-perfect for a high-stakes expert legal deck.\n\nFlag NOT ok for ANY of: content clipped at slide edges/bottom; a table/diagram with cut-off rows or a blank render area; a mermaid diagram that overflows or is empty; text overlapping; awkwardly empty slide; unreadable small text; INCONSISTENT font sizes between sibling cards/elements that should match. A clean, balanced, consistent slide is ok.\n\nReturn a verdict for every page ${b.start}-${b.end}. severity: blocker=unusable, major=visible overflow/cut/blank, minor=cosmetic. Describe precisely in "issue".`,
        { label: `pdf:${b.start}-${b.end}`, phase: 'Visual review', schema: PAGE_ISSUE_SCHEMA },
      ),
  ),
);

phase('Content audit');
const FILE_BATCH = 8;
const fileBatches = [];
for (let i = 0; i < fileList.length; i += FILE_BATCH)
  fileBatches.push(fileList.slice(i, i + FILE_BATCH));

const contentPromise = parallel(
  fileBatches.map(
    (batch, idx) => () =>
      agent(
        `Legal-content fidelity + consistency auditor. Source of truth: "${draftPath}". Generated slides in "${slidesDir}".\n\nFor EACH file, Read it and compare to its matching source slide:\n${batch.map((f) => `  - ${f}`).join('\n')}\n\nReport findings ONLY for real problems:\n1. CITATION — every legal ref (L./art./Cass./Règl./directive/eIDAS) must be EXACT vs source (kind citation).\n2. ROWCOUNT — table >5 rows (kind rowcount).\n3. FIELDSHAPE — row cells count != columns; cardGrid >6 cards; missing title (kind fieldshape).\n4. ÉTAPE LABEL CONSISTENCY — the deck was reordered: Sécuriser is now Étape 2, Capter Étape 3, Décider Étape 4. Flag any eyebrow/section-number still using the OLD numbering (e.g. "Étape 4 — Sécuriser", "Étape 2 — Capter", "Étape 3 — Décider", or a section number that contradicts its title) (kind consistency).\n5. TYPO — French errors not in source (kind typo).\n\nFindings only, no praise. Omit clean files. Quote offending text.`,
        { label: `audit:${idx + 1}`, phase: 'Content audit', schema: CONTENT_SCHEMA },
      ),
  ),
);

const [visual, content] = await Promise.all([visualPromise, contentPromise]);

phase('Coverage');
const coverage = await agent(
  `Completeness + flow check. Source "${draftPath}" has slides S1-S28. Generated files in "${slidesDir}". The deck was intentionally REORDERED to: Embauche(Étape 1) → Sécuriser(Étape 2) → Capter(Étape 3) → Décider(Étape 4) → Départ(Étape 5) → Piloter(Étape 6). List the files (they sort by numeric prefix = slide order), read the draft, and report: (a) any source slide S1-S28 with NO generated slide; (b) any dropped table/decision-tree/"Points particuliers" content; (c) whether the new étape order is internally consistent (section numbers + eyebrows agree with file position) and whether any cross-reference now points backward incorrectly. Ignore splits (1/2 etc).`,
  {
    label: 'coverage',
    phase: 'Coverage',
    schema: {
      type: 'object',
      properties: {
        missing: { type: 'array', items: { type: 'string' } },
        dropped: { type: 'array', items: { type: 'string' } },
        orderConsistent: { type: 'boolean' },
        notes: { type: 'string' },
      },
      required: ['missing', 'dropped', 'orderConsistent', 'notes'],
    },
  },
);

phase('Synthesize');
const visualPages = visual.filter(Boolean).flatMap((v) => v.pages || []);
const visualIssues = visualPages.filter((p) => !p.ok && p.severity !== 'none');
const contentFindings = content.filter(Boolean).flatMap((c) => c.findings || []);
const rank = { blocker: 0, major: 1, minor: 2, none: 3 };

return {
  summary: {
    pagesReviewed: visualPages.length,
    visualIssues: visualIssues.length,
    contentFindings: contentFindings.length,
    missingSlides: coverage.missing.length,
    droppedContent: coverage.dropped.length,
    orderConsistent: coverage.orderConsistent,
  },
  visualIssues: visualIssues.sort((a, b) => rank[a.severity] - rank[b.severity]),
  contentFindings: contentFindings.sort((a, b) => rank[a.severity] - rank[b.severity]),
  coverage,
}
