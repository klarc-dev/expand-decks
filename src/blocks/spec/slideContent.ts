import { createHash, randomUUID } from 'node:crypto';

import { ALL_SPECS, SPEC_BY_TYPE } from './index';
import { renderSchemaOf, type LayoutAdapterContract, type SlideContentRole } from './dsl';

const STORAGE_FIELDS = new Set(['id', 'blockName', 'layoutContent']);

export type CanonicalFragment = {
  field: string;
  value: unknown;
};

export type LayoutContentState = {
  version: 1;
  revision: number;
  roles: Partial<Record<SlideContentRole, CanonicalFragment[]>>;
  layouts: Record<string, Record<string, unknown>>;
  provenance: { layouts: string[] };
  lastChange?: {
    token: string;
    before: Record<string, unknown>;
    beforeState: Omit<LayoutContentState, 'lastChange'>;
  };
};

export type LayoutMappingPreference = {
  collectionSourceField?: string;
  proseSourceField?: string;
};

export type LayoutChangeIssue = {
  code: 'capacity' | 'crop-risk' | 'mapping' | 'missing-required' | 'non-portable' | 'unsupported';
  field?: string;
  message: string;
  role?: SlideContentRole;
};

export type LayoutChangeClassification = 'compatible' | 'adjustments' | 'lossy' | 'unavailable';

export type LayoutChangeAnalysis = {
  candidate?: Record<string, unknown>;
  classification: LayoutChangeClassification;
  hidden: Array<{ field: string; role: SlideContentRole }>;
  imageURL: string;
  issues: LayoutChangeIssue[];
  label: string;
  layout: string;
  lossiness: 'none' | 'display-only' | 'confirmed-transform';
  mappedFields: Array<{ from: string; role: SlideContentRole; to: string }>;
  recommendation: { explanation: string[]; score: number };
  preview?: {
    className: string;
    html: string;
    hideChrome: boolean;
    image?: string;
    layout: string;
    mermaid?: { source: string };
  } | null;
  requiresConfirmation: boolean;
  unsupportedFields: string[];
};

const RICH_TEXT_TARGET_FIELDS = new Set([
  'body',
  'footer',
  'footerNote',
  'intro',
  'lead',
  'leftFooter',
  'sidebarText',
  'subtitle',
]);

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

function storedProjection(slide: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(slide)
      .filter(([key]) => !STORAGE_FIELDS.has(key))
      .map(([key, value]) => [key, structuredClone(value)]),
  );
}

function layoutContract(layout: string): LayoutAdapterContract {
  const contract = SPEC_BY_TYPE.get(layout)?.layout;
  if (!contract) throw new Error(`Contrat de layout inconnu : ${layout}`);
  return contract;
}

function canonicalItemId(item: unknown, index: number): string {
  if (item && typeof item === 'object') {
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return `portable-${index + 1}-${createHash('sha1').update(JSON.stringify(item)).digest('hex').slice(0, 8)}`;
}

function normalizeCollection(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item, index) =>
    item && typeof item === 'object'
      ? { ...(structuredClone(item) as Record<string, unknown>), id: canonicalItemId(item, index) }
      : { id: canonicalItemId(item, index), label: item },
  );
}

function normalizeRoleValue(role: SlideContentRole, value: unknown): unknown {
  return role === 'collection.items' ? normalizeCollection(value) : structuredClone(value);
}

function stateWithoutUndo(state: LayoutContentState): Omit<LayoutContentState, 'lastChange'> {
  const { lastChange: _, ...rest } = structuredClone(state);
  return rest;
}

export function normalizeSlideContent(slide: Record<string, unknown>): LayoutContentState {
  const layout = String(slide.blockType ?? '');
  const contract = layoutContract(layout);
  const existing = slide.layoutContent;
  if (
    existing &&
    typeof existing === 'object' &&
    (existing as { version?: unknown }).version === 1
  ) {
    const state = structuredClone(existing as LayoutContentState);
    state.layouts[layout] = storedProjection(slide);
    return state;
  }

  const roles: LayoutContentState['roles'] = {};
  for (const [field, role] of Object.entries(contract.fields)) {
    const value = slide[field];
    if (!hasContent(value)) continue;
    if (!roles[role]) roles[role] = [];
    roles[role]!.push({ field, value: normalizeRoleValue(role, value) });
  }
  if (hasContent(slide.footnotes)) {
    roles.citations = [{ field: 'footnotes', value: structuredClone(slide.footnotes) }];
  }
  return {
    version: 1,
    revision: 0,
    roles,
    layouts: { [layout]: storedProjection(slide) },
    provenance: { layouts: [layout] },
  };
}

function valueForRole(
  state: LayoutContentState,
  role: SlideContentRole,
  targetField: string,
  preferredSourceField?: string,
): CanonicalFragment | undefined {
  const fragments = state.roles[role] ?? [];
  return (
    fragments.find((fragment) => fragment.field === preferredSourceField) ??
    fragments.find((fragment) => fragment.field === targetField) ??
    fragments[0]
  );
}

function textish(value: unknown): unknown {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return value;
  const item = value as Record<string, unknown>;
  return (
    item.description ??
    item.quote ??
    item.title ??
    item.label ??
    item.value ??
    item.authorName ??
    ''
  );
}

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(plainText).join(' ').trim();
  if (!value || typeof value !== 'object') return String(value ?? '');
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  return `${plainText(record.root)} ${plainText(record.children)}`.trim();
}

function lexical(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: value, version: 1 }],
          direction: null,
          format: '',
          indent: 0,
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

// One semantic collection adapter owns the deliberately shape-specific projections.
// fallow-ignore-next-line complexity
function collectionItemForTarget(
  item: Record<string, unknown>,
  id: string,
  index: number,
  targetField: string,
): Record<string, unknown> {
  if (targetField === 'cards' || targetField === 'rightCards') {
    return {
      id,
      title: String(
        item.title ?? item.label ?? item.value ?? item.authorName ?? `Élément ${index + 1}`,
      ),
      ...(hasContent(item.description ?? item.quote ?? item.label)
        ? { description: lexical(item.description ?? item.quote ?? item.label) }
        : {}),
      ...(targetField === 'cards' && hasContent(item.number) ? { number: item.number } : {}),
    };
  }
  if (targetField === 'items' || targetField === 'steps') {
    return {
      id,
      label: String(
        item.label ?? item.title ?? item.value ?? item.authorName ?? `Élément ${index + 1}`,
      ),
      ...(hasContent(item.description ?? item.quote)
        ? { description: plainText(item.description ?? item.quote) }
        : {}),
    };
  }
  if (targetField === 'stats') {
    return {
      id,
      value: String(item.value ?? item.number ?? item.title ?? index + 1),
      label: String(item.label ?? item.description ?? item.title ?? `Élément ${index + 1}`),
    };
  }
  if (targetField === 'quotes') {
    return {
      id,
      quote: lexical(item.quote ?? textish(item)),
      authorName: String(item.authorName ?? item.title ?? item.label ?? 'Source'),
      ...(hasContent(item.authorRole) ? { authorRole: item.authorRole } : {}),
      ...(hasContent(item.authorCompany) ? { authorCompany: item.authorCompany } : {}),
    };
  }
  return { ...structuredClone(item), id };
}

function collectionForTarget(value: unknown, targetField: string): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((raw, index) => {
    const item: Record<string, unknown> =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : { label: raw };
    return collectionItemForTarget(item, canonicalItemId(item, index), index, targetField);
  });
}

function projectFromRoles(
  state: LayoutContentState,
  targetLayout: string,
  mapping?: LayoutMappingPreference,
): {
  mappedFields: LayoutChangeAnalysis['mappedFields'];
  slide: Record<string, unknown>;
  used: Set<string>;
} {
  const target = layoutContract(targetLayout);
  const slide: Record<string, unknown> = { blockType: targetLayout };
  const mappedFields: LayoutChangeAnalysis['mappedFields'] = [];
  const used = new Set<string>();

  for (const [field, role] of Object.entries(target.fields)) {
    const preferredSourceField =
      role === 'collection.items'
        ? mapping?.collectionSourceField
        : role === 'prose.support'
          ? mapping?.proseSourceField
          : undefined;
    const fragment = valueForRole(state, role, field, preferredSourceField);
    if (!fragment) continue;
    const value =
      role === 'collection.items'
        ? collectionForTarget(fragment.value, field)
        : RICH_TEXT_TARGET_FIELDS.has(field)
          ? lexical(structuredClone(fragment.value))
          : structuredClone(fragment.value);
    slide[field] = value;
    used.add(`${role}:${fragment.field}`);
    if (fragment.field !== field) mappedFields.push({ from: fragment.field, role, to: field });
  }
  const citations = valueForRole(state, 'citations', 'footnotes');
  if (target.supportsCitations && citations) {
    slide.footnotes = structuredClone(citations.value);
    used.add(`citations:${citations.field}`);
  }
  return { mappedFields, slide, used };
}

function hiddenFragments(state: LayoutContentState, used: Set<string>) {
  const hidden: Array<{ field: string; role: SlideContentRole }> = [];
  for (const [role, fragments] of Object.entries(state.roles) as Array<
    [SlideContentRole, CanonicalFragment[]]
  >) {
    for (const fragment of fragments) {
      if (!used.has(`${role}:${fragment.field}`)) hidden.push({ field: fragment.field, role });
    }
  }
  return hidden;
}

/**
 * This is the canonical layout analysis boundary: it deliberately coordinates
 * semantic projection, capability diagnostics, validation, and ranking in one pass.
 */
// fallow-ignore-next-line complexity
function analyzeOne(slide: Record<string, unknown>, targetLayout: string): LayoutChangeAnalysis {
  const sourceLayout = String(slide.blockType ?? '');
  const source = layoutContract(sourceLayout);
  const target = layoutContract(targetLayout);
  const spec = SPEC_BY_TYPE.get(targetLayout)!;

  const state = normalizeSlideContent(slide);
  const exact = state.layouts[targetLayout];
  const projection = exact
    ? {
        mappedFields: [],
        slide: { ...structuredClone(exact), blockType: targetLayout },
        used: new Set<string>(),
      }
    : projectFromRoles(state, targetLayout);
  if (exact) {
    for (const [field, role] of Object.entries(target.fields)) {
      const fragment = valueForRole(state, role, field);
      if (fragment && hasContent(exact[field])) projection.used.add(`${role}:${fragment.field}`);
    }
    if (target.supportsCitations && hasContent(exact.footnotes)) {
      const citation = valueForRole(state, 'citations', 'footnotes');
      if (citation) projection.used.add(`citations:${citation.field}`);
    }
  }
  const issues: LayoutChangeIssue[] = [];
  for (const role of target.required ?? []) {
    const field = Object.entries(target.fields).find(([, value]) => value === role)?.[0];
    if (!field || !hasContent(projection.slide[field])) {
      issues.push({
        code: 'missing-required',
        role,
        message: `Le contenu requis « ${role} » est absent.`,
      });
    }
  }
  for (const [role, capacity] of Object.entries(target.capacities ?? {}) as Array<
    [SlideContentRole, number]
  >) {
    const field = Object.entries(target.fields).find(([, value]) => value === role)?.[0];
    const value = field ? projection.slide[field] : undefined;
    if (field && Array.isArray(value) && value.length > capacity) {
      const fragment = valueForRole(state, role, field);
      issues.push({
        code: 'capacity',
        field: fragment?.field ?? field,
        role,
        message: `${value.length} éléments sont présents ; ce layout peut en afficher ${capacity}.`,
      });
    }
  }
  const media = valueForRole(state, 'media.primary', 'image');
  const placement = valueForRole(state, 'media.placement', 'imagePosition');
  if (media && !target.media) {
    issues.push({
      code: 'unsupported',
      field: media.field,
      role: 'media.primary',
      message: 'L’image restera attachée mais ne sera pas affichée.',
    });
  } else if (
    media &&
    source.media?.aspectRatio &&
    target.media?.aspectRatio &&
    source.media.aspectRatio !== target.media.aspectRatio
  ) {
    issues.push({
      code: 'crop-risk',
      field: media.field,
      role: 'media.primary',
      message: 'Le cadrage change ; le point focal et la préférence de recadrage seront conservés.',
    });
  }
  if (placement && target.media && !target.media.placements.includes(String(placement.value))) {
    issues.push({
      code: 'unsupported',
      field: placement.field,
      role: 'media.placement',
      message: 'La position demandée n’est pas disponible dans ce layout.',
    });
  }
  if (
    targetLayout === 'twoCols' &&
    valueForRole(state, 'collection.items', 'rightCards') &&
    valueForRole(state, 'prose.support', 'intro')
  ) {
    issues.push({
      code: 'mapping',
      role: 'collection.items',
      message: 'Vérifiez la répartition du texte et de la collection entre les deux colonnes.',
    });
  }
  if (
    (source.kind === 'specialized' || target.kind === 'specialized') &&
    targetLayout !== sourceLayout
  ) {
    issues.push({
      code: 'unsupported',
      message:
        'La structure spécialisée restera conservée hors affichage ; confirmez la transformation visible.',
    });
  }
  const targetSpec = SPEC_BY_TYPE.get(targetLayout)!;
  const validation = renderSchemaOf(targetSpec).safeParse(projection.slide);
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const field = issue.path[0] === undefined ? undefined : String(issue.path[0]);
      if (issue.code === 'too_big') continue;
      if (
        issues.some((existing) => existing.code === 'missing-required' && existing.field === field)
      ) {
        continue;
      }
      issues.push({
        code: 'missing-required',
        field,
        message: `Le contenu projeté n’est pas valide${field ? ` pour « ${field} »` : ''} : ${issue.message}`,
      });
    }
  }

  const hidden = hiddenFragments(state, projection.used);
  const unavailable = issues.some((issue) => issue.code === 'missing-required');
  const specializedConfirmation =
    targetLayout !== sourceLayout &&
    (source.kind === 'specialized' || target.kind === 'specialized');
  const requiresConfirmation =
    !unavailable && (specializedConfirmation || issues.some((issue) => issue.code === 'capacity'));
  const classification: LayoutChangeClassification = unavailable
    ? 'unavailable'
    : requiresConfirmation || hidden.length > 0
      ? 'lossy'
      : projection.mappedFields.length > 0 || issues.length > 0
        ? 'adjustments'
        : 'compatible';
  const score =
    (targetLayout === sourceLayout ? 100 : 60) -
    hidden.length * 2 -
    issues.filter((issue) => issue.code === 'crop-risk' || issue.code === 'mapping').length * 5 -
    (classification === 'lossy' ? 100 : 0) -
    (classification === 'unavailable' ? 1000 : 0);
  const candidate = unavailable ? undefined : { ...projection.slide, layoutContent: state };
  return {
    candidate,
    classification,
    hidden,
    imageURL: spec.imageURL,
    issues,
    label: spec.labels.singular,
    layout: targetLayout,
    lossiness: requiresConfirmation
      ? 'confirmed-transform'
      : hidden.length
        ? 'display-only'
        : 'none',
    mappedFields: projection.mappedFields,
    recommendation: {
      score,
      explanation: [
        targetLayout === sourceLayout ? 'Layout actuel' : `Compatibilité sémantique ${target.kind}`,
        hidden.length
          ? `${hidden.length} contenu(s) conservé(s) hors affichage`
          : 'Tout le contenu utile est affichable',
      ],
    },
    requiresConfirmation,
    unsupportedFields: hidden.map((item) => item.field),
  };
}

export function analyzeSlideLayouts(
  slide: Record<string, unknown>,
  targetLayouts: readonly string[] = ALL_SPECS.map((spec) => spec.blockType),
): LayoutChangeAnalysis[] {
  return targetLayouts
    .map((layout) => analyzeOne(slide, layout))
    .sort(
      (a, b) => b.recommendation.score - a.recommendation.score || a.layout.localeCompare(b.layout),
    );
}

export function validateProjectedSlide(slide: Record<string, unknown>): Record<string, unknown> {
  const spec = SPEC_BY_TYPE.get(String(slide.blockType));
  if (!spec) throw new Error(`Layout cible inconnu : ${String(slide.blockType)}`);
  renderSchemaOf(spec).parse(slide);
  return slide;
}

export function applyLayoutProjection(args: {
  slide: Record<string, unknown>;
  targetLayout: string;
  confirmLossy?: boolean;
  mapping?: LayoutMappingPreference;
}): { analysis: LayoutChangeAnalysis; slide: Record<string, unknown>; undoToken: string } {
  const analysis = analyzeOne(args.slide, args.targetLayout);
  if (analysis.classification === 'unavailable' || !analysis.candidate) {
    throw new Error(analysis.issues[0]?.message ?? 'Changement de layout indisponible');
  }
  if (analysis.requiresConfirmation && !args.confirmLossy) {
    throw new Error('Cette transformation nécessite une confirmation explicite.');
  }
  const state = normalizeSlideContent(args.slide);
  const sourceLayout = String(args.slide.blockType);
  state.layouts[sourceLayout] = storedProjection(args.slide);
  state.layouts[args.targetLayout] = storedProjection(analysis.candidate);
  state.revision += 1;
  if (!state.provenance.layouts.includes(args.targetLayout))
    state.provenance.layouts.push(args.targetLayout);
  const undoToken = randomUUID();
  state.lastChange = {
    token: undoToken,
    before: storedProjection(args.slide),
    beforeState: stateWithoutUndo(normalizeSlideContent(args.slide)),
  };
  const mappedCandidate = args.mapping
    ? { ...projectFromRoles(state, args.targetLayout, args.mapping).slide, layoutContent: state }
    : { ...analysis.candidate, layoutContent: state };
  const projected = validateProjectedSlide(mappedCandidate);
  return { analysis, slide: { ...projected, layoutContent: state }, undoToken };
}

export function undoLayoutProjection(
  slide: Record<string, unknown>,
  token: string,
): Record<string, unknown> {
  const state = normalizeSlideContent(slide);
  if (!state.lastChange || state.lastChange.token !== token) {
    throw new Error('Cette annulation est périmée ou ne correspond plus à la slide.');
  }
  return validateProjectedSlide({
    blockType: String(
      (state.lastChange.before as { blockType?: unknown }).blockType ?? slide.blockType,
    ),
    ...structuredClone(state.lastChange.before),
    layoutContent: state.lastChange.beforeState,
  });
}

export function slideLayoutFingerprint(slide: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(slide)).digest('hex');
}
