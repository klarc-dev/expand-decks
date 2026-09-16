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
  collectionSide?: 'left' | 'right';
  collectionSourceField?: string;
  proseSourceField?: string;
};

export type NormalizedMedia = {
  crop: 'cover' | 'contain' | 'preserve';
  decorative: boolean;
  focalPoint?: { x: number; y: number };
  identity: string;
  intent: string;
  media: unknown;
  placement?: string;
};

type SpecializedLayoutBehavior = 'compatible' | 'transformable' | 'lossy' | 'unavailable';

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
  recommendation: {
    dimensions: {
      capacity: number;
      current: number;
      loss: number;
      media: number;
      semantic: number;
    };
    explanation: string[];
    score: number;
  };
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

function mediaIdentity(media: unknown): string {
  if (media && typeof media === 'object') {
    const record = media as Record<string, unknown>;
    const id = record.id ?? record.url ?? record.filename;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return createHash('sha1').update(JSON.stringify(media)).digest('hex');
}

export function normalizeMedia(media: unknown, placement?: unknown): NormalizedMedia | undefined {
  if (!hasContent(media)) return undefined;
  const record = media && typeof media === 'object' ? (media as Record<string, unknown>) : {};
  const focalX = record.focalX;
  const focalY = record.focalY;
  const decorative = record.decorative === true || record.intent === 'decorative';
  return {
    crop:
      record.crop === 'contain' || record.crop === 'preserve' || record.crop === 'cover'
        ? record.crop
        : 'preserve',
    decorative,
    ...(typeof focalX === 'number' && typeof focalY === 'number'
      ? { focalPoint: { x: focalX, y: focalY } }
      : {}),
    identity: mediaIdentity(media),
    intent:
      typeof record.intent === 'string'
        ? record.intent
        : decorative
          ? 'decorative'
          : typeof record.alt === 'string' && record.alt.trim()
            ? record.alt
            : 'informative',
    media: structuredClone(media),
    ...(typeof placement === 'string' ? { placement } : {}),
  };
}

function mediaValue(fragment: CanonicalFragment | undefined): NormalizedMedia | undefined {
  if (!fragment) return undefined;
  const value = fragment.value;
  if (value && typeof value === 'object' && 'identity' in value && 'media' in value) {
    return value as NormalizedMedia;
  }
  return normalizeMedia(value);
}

function contactDetails(slide: Record<string, unknown>): Record<string, string> | undefined {
  const values = Object.fromEntries(
    ['email', 'phone', 'linkedin', 'website', 'bookingUrl']
      .map((field) => [field, slide[field]])
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0,
      ),
  );
  for (const [labelField, urlField] of [
    ['primaryAction', 'primaryActionUrl'],
    ['secondaryAction', 'secondaryActionUrl'],
    ['linkLabel', 'linkUrl'],
  ]) {
    const url = slide[urlField];
    if (typeof url === 'string' && /^(?:mailto:|tel:)/.test(url)) {
      values[urlField] = url;
      if (typeof slide[labelField] === 'string') values[labelField] = slide[labelField] as string;
    }
  }
  return Object.keys(values).length ? values : undefined;
}

function quoteAttributions(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const attributions = value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      id: canonicalItemId(item, 0),
      authorName: record.authorName,
      authorRole: record.authorRole,
      authorCompany: record.authorCompany,
    };
  });
  return attributions.some((item) => hasContent(item.authorName)) ? attributions : undefined;
}

function stateWithoutUndo(state: LayoutContentState): Omit<LayoutContentState, 'lastChange'> {
  const { lastChange: _, ...rest } = structuredClone(state);
  return rest;
}

function refreshExistingMedia(
  state: LayoutContentState,
  contract: LayoutAdapterContract,
  slide: Record<string, unknown>,
): void {
  const mediaField = Object.entries(contract.fields).find(
    ([, role]) => role === 'media.primary',
  )?.[0];
  if (mediaField && hasContent(slide[mediaField])) {
    state.roles['media.primary'] = [
      { field: mediaField, value: normalizeMedia(slide[mediaField], slide.imagePosition)! },
    ];
    delete state.roles['media.placement'];
    return;
  }
  const legacyMedia = valueForRole(state, 'media.primary', 'image');
  if (!legacyMedia) return;
  const normalizedLegacy = mediaValue(legacyMedia);
  const separatePlacement = valueForRole(state, 'media.placement', 'imagePosition')?.value;
  const legacyPlacement =
    typeof separatePlacement === 'string' ? separatePlacement : normalizedLegacy?.placement;
  state.roles['media.primary'] = [
    {
      field: legacyMedia.field,
      value: normalizeMedia(normalizedLegacy?.media ?? legacyMedia.value, legacyPlacement)!,
    },
  ];
  delete state.roles['media.placement'];
}

function enrichSemanticRoles(
  roles: LayoutContentState['roles'],
  slide: Record<string, unknown>,
): void {
  const contacts = contactDetails(slide);
  if (contacts) roles['contact.details'] = [{ field: 'contactDetails', value: contacts }];
  const attributions = quoteAttributions(slide.quotes);
  if (attributions) roles.attributions = [{ field: 'quoteAttributions', value: attributions }];
}

export function normalizeSlideContent(slide: Record<string, unknown>): LayoutContentState {
  const layout = String(slide.blockType ?? '');
  const contract = layoutContract(layout);
  const existing = slide.layoutContent;
  if (
    existing &&
    typeof existing === 'object' &&
    (existing as Record<string, unknown>).version === 1
  ) {
    const state = structuredClone(existing as LayoutContentState);
    state.layouts[layout] = storedProjection(slide);
    const visibleRoles = new Map<SlideContentRole, CanonicalFragment[]>();
    for (const [field, role] of Object.entries(contract.fields)) {
      const value = slide[field];
      if (!hasContent(value)) continue;
      if (role === 'media.placement') continue;
      const fragments = visibleRoles.get(role) ?? [];
      fragments.push({
        field,
        value:
          role === 'media.primary'
            ? normalizeMedia(value, slide.imagePosition)
            : normalizeRoleValue(role, value),
      });
      visibleRoles.set(role, fragments);
    }
    for (const [role, fragments] of visibleRoles) state.roles[role] = fragments;
    refreshExistingMedia(state, contract, slide);
    enrichSemanticRoles(state.roles, slide);
    if (hasContent(slide.footnotes)) {
      state.roles.citations = [
        { field: 'footnotes', value: structuredClone(slide.footnotes) },
        ...(state.roles.citations ?? []).filter((fragment) => fragment.field !== 'footnotes'),
      ];
    }
    return state;
  }

  const roles: LayoutContentState['roles'] = {};
  for (const [field, role] of Object.entries(contract.fields)) {
    const value = slide[field];
    if (!hasContent(value)) continue;
    if (!roles[role]) roles[role] = [];
    const normalized =
      role === 'media.primary'
        ? normalizeMedia(value, slide.imagePosition)
        : role === 'media.placement'
          ? undefined
          : normalizeRoleValue(role, value);
    if (normalized !== undefined) roles[role]!.push({ field, value: normalized });
  }
  enrichSemanticRoles(roles, slide);
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

function projectMappedValue(
  role: SlideContentRole,
  fragment: CanonicalFragment,
  field: string,
): unknown {
  if (role === 'collection.items') return collectionForTarget(fragment.value, field);
  if (role === 'media.primary') return mediaValue(fragment)?.media ?? fragment.value;
  if (RICH_TEXT_TARGET_FIELDS.has(field)) return lexical(structuredClone(fragment.value));
  return structuredClone(fragment.value);
}

function projectSpecialField(
  slide: Record<string, unknown>,
  state: LayoutContentState,
  field: string,
  role: SlideContentRole,
  mapping?: LayoutMappingPreference,
): boolean {
  if (role === 'collection.side') {
    slide[field] = mapping?.collectionSide ?? valueForRole(state, role, field)?.value ?? 'right';
    return true;
  }
  if (role !== 'media.placement') return false;
  const normalized = mediaValue(valueForRole(state, 'media.primary', 'image'));
  const legacyPlacement = valueForRole(state, role, field)?.value;
  const placement =
    normalized?.placement ?? (typeof legacyPlacement === 'string' ? legacyPlacement : undefined);
  if (placement) slide[field] = placement;
  return true;
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
    if (projectSpecialField(slide, state, field, role, mapping)) continue;
    const fragment = valueForRole(state, role, field, preferredSourceField);
    if (!fragment) continue;
    slide[field] = projectMappedValue(role, fragment, field);
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

function omittedCollectionItemFields(
  state: LayoutContentState,
  target: LayoutAdapterContract,
  projection: Record<string, unknown>,
): string[] {
  const targetField = Object.entries(target.fields).find(
    ([, role]) => role === 'collection.items',
  )?.[0];
  if (!targetField) return [];
  const source = valueForRole(state, 'collection.items', targetField)?.value;
  const projected = projection[targetField];
  if (!Array.isArray(source) || !Array.isArray(projected)) return [];

  const omitted = new Set<string>();
  source.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const visible = projected[index];
    const visibleRecord =
      visible && typeof visible === 'object' ? (visible as Record<string, unknown>) : {};
    for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
      if (field !== 'id' && hasContent(value) && !hasContent(visibleRecord[field]))
        omitted.add(field);
    }
  });
  return [...omitted].sort();
}

function hiddenFragments(
  state: LayoutContentState,
  used: Set<string>,
  target: LayoutAdapterContract,
) {
  const hidden: Array<{ field: string; role: SlideContentRole }> = [];
  const renderedSourceFields = new Set([...used].map((key) => key.slice(key.indexOf(':') + 1)));
  const targetCollectionField = Object.entries(target.fields).find(
    ([, role]) => role === 'collection.items',
  )?.[0];
  for (const [role, fragments] of Object.entries(state.roles) as Array<
    [SlideContentRole, CanonicalFragment[]]
  >) {
    for (const fragment of fragments) {
      if (
        role === 'attributions' &&
        targetCollectionField === 'quotes' &&
        used.has('collection.items:quotes')
      ) {
        continue;
      }
      if (
        role === 'contact.details' &&
        fragment.value &&
        typeof fragment.value === 'object' &&
        Object.keys(fragment.value as Record<string, unknown>).every((field) =>
          renderedSourceFields.has(field),
        )
      ) {
        continue;
      }
      if (!used.has(`${role}:${fragment.field}`)) hidden.push({ field: fragment.field, role });
    }
  }
  return hidden;
}

export const SPECIALIZED_LAYOUT_BEHAVIOR = {
  table: {
    table: 'compatible',
    statement: 'lossy',
    mermaid: 'unavailable',
    default: 'lossy',
  },
  mermaid: {
    mermaid: 'compatible',
    statement: 'transformable',
    table: 'unavailable',
    default: 'lossy',
  },
} as const satisfies Record<
  string,
  Partial<Record<string, SpecializedLayoutBehavior>> & { default: SpecializedLayoutBehavior }
>;

function specializedLayoutBehavior(
  sourceLayout: string,
  targetLayout: string,
): SpecializedLayoutBehavior | undefined {
  const row = SPECIALIZED_LAYOUT_BEHAVIOR[sourceLayout as keyof typeof SPECIALIZED_LAYOUT_BEHAVIOR];
  return row
    ? ((row[targetLayout as keyof typeof row] ?? row.default) as SpecializedLayoutBehavior)
    : undefined;
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
  const specializedBehavior = specializedLayoutBehavior(sourceLayout, targetLayout);
  if (targetLayout !== sourceLayout && specializedBehavior === 'unavailable') {
    return {
      classification: 'unavailable',
      hidden: [],
      imageURL: spec.imageURL,
      issues: [
        {
          code: 'non-portable',
          message: 'Le Markdown avancé ne possède pas de conversion automatique sûre.',
        },
      ],
      label: spec.labels.singular,
      layout: targetLayout,
      lossiness: 'none',
      mappedFields: [],
      recommendation: {
        score: -1000,
        dimensions: { capacity: 0, current: 0, loss: -1000, media: 0, semantic: 0 },
        explanation: ['Structure avancée non portable'],
      },
      requiresConfirmation: false,
      unsupportedFields: [],
    };
  }

  const state = normalizeSlideContent(slide);
  const exact = state.layouts[targetLayout];
  const projection = exact
    ? (() => {
        const projectedSlide: Record<string, unknown> = {
          ...structuredClone(exact),
          blockType: targetLayout,
        };
        const used = new Set<string>();
        for (const [field, role] of Object.entries(target.fields)) {
          const fragment = valueForRole(state, role, field);
          if (!fragment || !hasContent(projectedSlide[field])) continue;
          if (role !== 'collection.items') {
            projectedSlide[field] = RICH_TEXT_TARGET_FIELDS.has(field)
              ? lexical(structuredClone(fragment.value))
              : structuredClone(fragment.value);
          }
          used.add(`${role}:${fragment.field}`);
        }
        return { mappedFields: [], slide: projectedSlide, used };
      })()
    : projectFromRoles(state, targetLayout);
  if (exact && target.supportsCitations && hasContent(exact.footnotes)) {
    const citation = valueForRole(state, 'citations', 'footnotes');
    if (citation) projection.used.add(`citations:${citation.field}`);
  }
  const issues: LayoutChangeIssue[] = [];
  const omittedItemFields = omittedCollectionItemFields(state, target, projection.slide);
  for (const field of omittedItemFields) {
    issues.push({
      code: 'non-portable',
      field,
      role: 'collection.items',
      message: `Le champ renseigné « ${field} » des éléments sera conservé hors affichage dans ce layout.`,
    });
  }
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
  const media = mediaValue(valueForRole(state, 'media.primary', 'image'));
  const placement = media?.placement;
  if (media && !target.media) {
    issues.push({
      code: 'unsupported',
      field: 'image',
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
      field: 'image',
      role: 'media.primary',
      message: 'Le cadrage change ; le point focal et la préférence de recadrage seront conservés.',
    });
  }
  if (placement && target.media && !target.media.placements.includes(placement)) {
    issues.push({
      code: 'unsupported',
      field: 'imagePosition',
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

  const hidden = hiddenFragments(state, projection.used, target);
  const unavailable = issues.some((issue) => issue.code === 'missing-required');
  const specializedConfirmation =
    targetLayout !== sourceLayout &&
    (specializedBehavior === 'lossy' ||
      specializedBehavior === 'transformable' ||
      source.kind === 'specialized' ||
      target.kind === 'specialized');
  const requiresConfirmation =
    !unavailable &&
    (specializedConfirmation ||
      omittedItemFields.length > 0 ||
      issues.some((issue) => issue.code === 'capacity'));
  const classification: LayoutChangeClassification = unavailable
    ? 'unavailable'
    : requiresConfirmation || hidden.length > 0
      ? 'lossy'
      : projection.mappedFields.length > 0 || issues.length > 0
        ? 'adjustments'
        : 'compatible';
  const dimensions = {
    current: targetLayout === sourceLayout ? 40 : 0,
    semantic:
      target.kind === source.kind
        ? 30
        : target.kind === 'composition' || source.kind === 'composition'
          ? 20
          : target.kind === 'specialized' || source.kind === 'specialized'
            ? -20
            : 10,
    capacity: -issues.filter((issue) => issue.code === 'capacity').length * 40,
    media:
      media && target.media
        ? issues.some((issue) => issue.code === 'crop-risk')
          ? 10
          : 20
        : media && !target.media
          ? -40
          : 0,
    loss:
      classification === 'unavailable'
        ? -1000
        : classification === 'lossy'
          ? -150
          : -hidden.length * 5,
  };
  const score = Object.values(dimensions).reduce((total, value) => total + value, 0);
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
      dimensions,
      explanation: [
        targetLayout === sourceLayout ? 'Layout actuel' : `Compatibilité sémantique ${target.kind}`,
        `Capacité ${dimensions.capacity >= 0 ? 'adaptée' : 'dépassée'}`,
        media
          ? dimensions.media >= 0
            ? 'Média pris en charge'
            : 'Média conservé hors affichage'
          : 'Sans média',
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
    ? {
        ...projectFromRoles(state, args.targetLayout, args.mapping).slide,
        ...(args.targetLayout === 'twoCols' && args.mapping.collectionSide
          ? { collectionSide: args.mapping.collectionSide }
          : {}),
        layoutContent: state,
      }
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
