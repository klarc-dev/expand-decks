import { SPEC_BY_TYPE } from './index';

export type LayoutCompatibilityClassification =
  | 'compatible'
  | 'adjustments'
  | 'lossy'
  | 'unavailable';

export type LayoutCompatibilityIssue = {
  code: 'capacity' | 'mapping' | 'missing-required' | 'non-portable' | 'unsupported';
  field?: string;
  message: string;
  role?: SlideContentRole;
};

export type SlideLayoutCompatibility = {
  classification: LayoutCompatibilityClassification;
  imageURL: string;
  issues: LayoutCompatibilityIssue[];
  label: string;
  layout: string;
  mappedFields: Array<{ from: string; role: SlideContentRole; to: string }>;
  unsupportedFields: string[];
};

type SlideContentRole =
  | 'action.primary'
  | 'action.primaryUrl'
  | 'action.secondary'
  | 'action.secondaryUrl'
  | 'attribution.people'
  | 'citations'
  | 'collection.cards'
  | 'collection.quotes'
  | 'collection.stats'
  | 'collection.steps'
  | 'diagram.source'
  | 'heading.eyebrow'
  | 'heading.number'
  | 'heading.title'
  | 'media.primary'
  | 'presentation.hint'
  | 'prose.support'
  | 'table.columns'
  | 'table.rows'
  | 'takeaway';

type LayoutProfile = {
  fields: Readonly<Record<string, SlideContentRole>>;
  maxItems?: Readonly<Partial<Record<SlideContentRole, number>>>;
  portable?: boolean;
  required?: readonly SlideContentRole[];
  supportsCitations?: boolean;
};

const COMMON_HEADER = {
  eyebrow: 'heading.eyebrow',
  title: 'heading.title',
} as const;

const LAYOUT_PROFILES: Readonly<Record<string, LayoutProfile>> = {
  cover: {
    fields: {
      ...COMMON_HEADER,
      image: 'media.primary',
      imagePosition: 'presentation.hint',
      intervenants: 'attribution.people',
      subtitle: 'prose.support',
    },
    required: ['heading.title'],
  },
  section: {
    fields: {
      image: 'media.primary',
      imagePosition: 'presentation.hint',
      number: 'heading.number',
      subtitle: 'prose.support',
      title: 'heading.title',
    },
    required: ['heading.title'],
    supportsCitations: true,
  },
  statement: {
    fields: {
      ...COMMON_HEADER,
      body: 'prose.support',
      footer: 'takeaway',
      variant: 'presentation.hint',
    },
    required: ['heading.title'],
    supportsCitations: true,
  },
  twoCols: {
    fields: {
      ...COMMON_HEADER,
      image: 'media.primary',
      imagePosition: 'presentation.hint',
      intro: 'prose.support',
      leftFooter: 'takeaway',
      rightCards: 'collection.cards',
    },
    maxItems: { 'collection.cards': 5 },
    required: ['heading.title'],
    supportsCitations: true,
  },
  cardGrid: {
    fields: {
      ...COMMON_HEADER,
      cards: 'collection.cards',
      columns: 'presentation.hint',
      intervenants: 'attribution.people',
      sidebarText: 'prose.support',
    },
    maxItems: { 'collection.cards': 8 },
    required: ['heading.title', 'collection.cards'],
    supportsCitations: true,
  },
  stats: {
    fields: { ...COMMON_HEADER, stats: 'collection.stats' },
    maxItems: { 'collection.stats': 4 },
    required: ['heading.title', 'collection.stats'],
    supportsCitations: true,
  },
  quotes: {
    fields: { ...COMMON_HEADER, quotes: 'collection.quotes' },
    maxItems: { 'collection.quotes': 4 },
    required: ['heading.title', 'collection.quotes'],
    supportsCitations: true,
  },
  cta: {
    fields: {
      ...COMMON_HEADER,
      footerNote: 'takeaway',
      primaryAction: 'action.primary',
      primaryActionUrl: 'action.primaryUrl',
      secondaryAction: 'action.secondary',
      secondaryActionUrl: 'action.secondaryUrl',
      subtitle: 'prose.support',
    },
    required: ['heading.title'],
    supportsCitations: true,
  },
  table: {
    fields: {
      ...COMMON_HEADER,
      columns: 'table.columns',
      rows: 'table.rows',
      tableVariant: 'presentation.hint',
    },
    required: ['heading.title', 'table.columns', 'table.rows'],
    supportsCitations: true,
  },
  timeline: {
    fields: { ...COMMON_HEADER, footer: 'takeaway', steps: 'collection.steps' },
    maxItems: { 'collection.steps': 6 },
    required: ['heading.title', 'collection.steps'],
    supportsCitations: true,
  },
  mermaid: {
    fields: { ...COMMON_HEADER, caption: 'prose.support', source: 'diagram.source' },
    required: ['heading.title', 'diagram.source'],
    supportsCitations: true,
  },
  agenda: {
    fields: { ...COMMON_HEADER, active: 'presentation.hint', items: 'collection.steps' },
    maxItems: { 'collection.steps': 8 },
    required: ['heading.title'],
    supportsCitations: true,
  },
  markdown: {
    fields: {},
    portable: false,
  },
};

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function profileOf(layout: string, kind: 'source' | 'cible'): LayoutProfile {
  const profile = LAYOUT_PROFILES[layout];
  if (!profile || !SPEC_BY_TYPE.has(layout)) {
    throw new Error(`Layout ${kind} inconnu : ${layout}`);
  }
  return profile;
}

function targetFieldForRole(profile: LayoutProfile, role: SlideContentRole): string | undefined {
  return Object.entries(profile.fields).find(([, candidate]) => candidate === role)?.[0];
}

function unavailableResult(layout: string, message: string): SlideLayoutCompatibility {
  const spec = SPEC_BY_TYPE.get(layout)!;
  return {
    classification: 'unavailable',
    imageURL: spec.imageURL,
    issues: [{ code: 'non-portable', message }],
    label: spec.labels.singular,
    layout,
    mappedFields: [],
    unsupportedFields: [],
  };
}

type CompatibilityAccumulator = {
  issues: LayoutCompatibilityIssue[];
  mappedFields: SlideLayoutCompatibility['mappedFields'];
  populatedRoles: Set<SlideContentRole>;
  unsupportedFields: string[];
};

function collectFieldCompatibility(
  slide: Record<string, unknown>,
  source: LayoutProfile,
  target: LayoutProfile,
): CompatibilityAccumulator {
  const result: CompatibilityAccumulator = {
    issues: [],
    mappedFields: [],
    populatedRoles: new Set<SlideContentRole>(),
    unsupportedFields: [],
  };
  for (const [field, role] of Object.entries(source.fields)) {
    const value = slide[field];
    if (!hasContent(value) || role === 'presentation.hint') continue;
    result.populatedRoles.add(role);
    const targetField = targetFieldForRole(target, role);
    if (!targetField) {
      result.unsupportedFields.push(field);
      result.issues.push({
        code: 'unsupported',
        field,
        message: `Le champ « ${field} » ne peut pas être affiché par ce layout.`,
        role,
      });
      continue;
    }
    if (field !== targetField) {
      result.mappedFields.push({ from: field, role, to: targetField });
      result.issues.push({
        code: 'mapping',
        field,
        message: `Le champ « ${field} » sera associé à « ${targetField} ».`,
        role,
      });
    }
    const capacity = target.maxItems?.[role];
    if (capacity !== undefined && Array.isArray(value) && value.length > capacity) {
      result.issues.push({
        code: 'capacity',
        field,
        message: `${value.length} éléments sont présents ; ce layout peut en afficher ${capacity}.`,
        role,
      });
    }
  }
  return result;
}

function addCitationCompatibility(
  slide: Record<string, unknown>,
  target: LayoutProfile,
  result: CompatibilityAccumulator,
): void {
  if (!Array.isArray(slide.footnotes) || slide.footnotes.length === 0) return;
  result.populatedRoles.add('citations');
  if (target.supportsCitations) return;
  result.unsupportedFields.push('footnotes');
  result.issues.push({
    code: 'unsupported',
    field: 'footnotes',
    message: 'Ce layout ne peut pas afficher les sources de la slide.',
    role: 'citations',
  });
}

function addRequiredRoleCompatibility(
  slide: Record<string, unknown>,
  source: LayoutProfile,
  target: LayoutProfile,
  result: CompatibilityAccumulator,
): void {
  for (const role of target.required ?? []) {
    if (result.populatedRoles.has(role)) continue;
    const sourceField = targetFieldForRole(source, role);
    if (sourceField && hasContent(slide[sourceField])) continue;
    result.issues.push({
      code: 'missing-required',
      message: `Le contenu requis « ${role} » est absent.`,
      role,
    });
  }
}

function classifyCompatibility(
  issues: LayoutCompatibilityIssue[],
  mappedFields: SlideLayoutCompatibility['mappedFields'],
  unsupportedFields: string[],
): LayoutCompatibilityClassification {
  if (issues.some((issue) => issue.code === 'missing-required')) return 'unavailable';
  if (unsupportedFields.length > 0 || issues.some((issue) => issue.code === 'capacity')) {
    return 'lossy';
  }
  return mappedFields.length > 0 ? 'adjustments' : 'compatible';
}

function assessPortableLayout({
  layout,
  slide,
  source,
  sourceLayout,
}: {
  layout: string;
  slide: Record<string, unknown>;
  source: LayoutProfile;
  sourceLayout: string;
}): SlideLayoutCompatibility {
  const target = profileOf(layout, 'cible');
  if (layout !== sourceLayout && (source.portable === false || target.portable === false)) {
    return unavailableResult(
      layout,
      source.portable === false
        ? 'Le contenu Markdown avancé ne possède pas de contrat portable.'
        : 'Le layout Markdown avancé ne peut pas recevoir automatiquement ce contenu.',
    );
  }

  const result = collectFieldCompatibility(slide, source, target);
  addCitationCompatibility(slide, target, result);
  addRequiredRoleCompatibility(slide, source, target, result);

  const classification = classifyCompatibility(
    result.issues,
    result.mappedFields,
    result.unsupportedFields,
  );
  const spec = SPEC_BY_TYPE.get(layout)!;
  return {
    classification,
    imageURL: spec.imageURL,
    issues: result.issues,
    label: spec.labels.singular,
    layout,
    mappedFields: result.mappedFields,
    unsupportedFields: result.unsupportedFields,
  };
}

export function assessSlideLayoutCompatibility(
  slide: Record<string, unknown>,
  targetLayouts: readonly string[],
): SlideLayoutCompatibility[] {
  const sourceLayout = typeof slide.blockType === 'string' ? slide.blockType : '';
  const source = profileOf(sourceLayout, 'source');

  return targetLayouts.map((layout) =>
    assessPortableLayout({ layout, slide, source, sourceLayout }),
  );
}
