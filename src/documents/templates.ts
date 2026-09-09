import { z } from 'zod';

import { ALL_SPECS } from '../blocks/spec';
import { renderSchemaOf, type BlockSpec } from '../blocks/spec/dsl';
import {
  emitDraftSchema,
  emitOutlineSchema,
  emitSlidesArraySchema,
} from '../blocks/spec/emit/emitDraftSchema';
import { MAX_SLIDES, MIN_SLIDES } from '../lib/draftConfig';
import { PRESENTATION_CANVAS } from './presentationContract';

export const DOCUMENT_TEMPLATE_IDS = {
  linkedinCarousel: 'linkedin-carousel',
  presentation: 'presentation',
} as const;

export type DocumentTemplateId = (typeof DOCUMENT_TEMPLATE_IDS)[keyof typeof DOCUMENT_TEMPLATE_IDS];

export type DocumentArtifactKind = 'pdf' | 'web' | 'image';
export type DocumentArtifactLocation = 'file' | 'url';

export type DocumentArtifactDefinition = {
  key: string;
  kind: DocumentArtifactKind;
  label: string;
  actionLabel: string;
  location: DocumentArtifactLocation;
  requiredWhen: 'always' | 'has-pages';
  pageIndex?: number;
  repeat?: 'per-page';
};

export type DocumentTemplateDefinition = {
  id: DocumentTemplateId;
  label: string;
  canvas: {
    width: number;
    height: number;
    aspectRatio: string;
    orientation: 'landscape' | 'portrait' | 'square';
  };
  allowedLayouts: readonly string[];
  pageCount: { min: number; max: number | null };
  chrome: {
    footer: boolean;
    logo: boolean;
    pageNumbers: boolean;
  };
  artifacts: readonly DocumentArtifactDefinition[];
  primaryArtifact: string;
  agent: {
    guidance: string;
    pageCount: { min: number; max: number };
  };
};

const PRESENTATION_TEMPLATE = {
  id: DOCUMENT_TEMPLATE_IDS.presentation,
  label: 'Présentation 16:9',
  canvas: PRESENTATION_CANVAS,
  allowedLayouts: ALL_SPECS.map((spec) => spec.blockType),
  // Authored presentations were historically unbounded. Keep that behavior;
  // generation retains its established 3..40 contract below.
  pageCount: { min: 0, max: null },
  chrome: {
    footer: true,
    logo: true,
    pageNumbers: true,
  },
  artifacts: [
    {
      key: 'pdf',
      kind: 'pdf',
      label: 'PDF',
      actionLabel: 'Télécharger le PDF',
      location: 'file',
      requiredWhen: 'always',
    },
    {
      key: 'web-presentation',
      kind: 'web',
      label: 'Présentation web',
      actionLabel: 'Ouvrir la présentation web',
      location: 'url',
      requiredWhen: 'always',
    },
    {
      key: 'cover-image',
      kind: 'image',
      label: 'Image de couverture',
      actionLabel: 'Ouvrir l’image de couverture',
      location: 'file',
      requiredWhen: 'has-pages',
      pageIndex: 0,
    },
  ],
  primaryArtifact: 'web-presentation',
  agent: {
    guidance:
      'Compose une présentation structurée : couverture en ouverture, progression pédagogique, puis appel à l’action en clôture.',
    pageCount: { min: MIN_SLIDES, max: MAX_SLIDES },
  },
} as const satisfies DocumentTemplateDefinition;

const LINKEDIN_CAROUSEL_TEMPLATE = {
  id: DOCUMENT_TEMPLATE_IDS.linkedinCarousel,
  label: 'Carrousel LinkedIn 4:5',
  canvas: {
    width: 1080,
    height: 1350,
    aspectRatio: '4/5',
    orientation: 'portrait',
  },
  allowedLayouts: [
    'cover',
    'statement',
    'twoCols',
    'cardGrid',
    'stats',
    'quotes',
    'timeline',
    'cta',
  ],
  pageCount: { min: 2, max: 20 },
  chrome: {
    footer: false,
    logo: false,
    pageNumbers: false,
  },
  artifacts: [
    {
      key: 'page-image',
      kind: 'image',
      label: 'Image de page',
      actionLabel: 'Télécharger la page',
      location: 'file',
      requiredWhen: 'has-pages',
      repeat: 'per-page',
    },
  ],
  primaryArtifact: 'page-image',
  agent: {
    guidance:
      'Compose un carrousel LinkedIn très concis : une idée principale par page, accroche immédiate, progression autonome au balayage et appel à l’action final. Réduis nettement la densité de texte par rapport à une présentation.',
    pageCount: { min: 2, max: 20 },
  },
} as const satisfies DocumentTemplateDefinition;

export const DOCUMENT_TEMPLATES = [PRESENTATION_TEMPLATE, LINKEDIN_CAROUSEL_TEMPLATE] as const;
export const DOCUMENT_TEMPLATE_ID_SCHEMA = z.enum(
  DOCUMENT_TEMPLATES.map((template) => template.id) as [
    DocumentTemplateId,
    ...DocumentTemplateId[],
  ],
);

const TEMPLATE_BY_ID = new Map(DOCUMENT_TEMPLATES.map((template) => [template.id, template]));
const SCHEMAS_BY_TEMPLATE = new WeakMap<
  DocumentTemplateDefinition,
  ReturnType<typeof buildDocumentTemplateSchemas>
>();

class UnknownDocumentTemplateError extends Error {
  constructor(value: unknown) {
    super(`Template de document inconnu : ${String(value)}`);
    this.name = 'UnknownDocumentTemplateError';
  }
}

class DisallowedDocumentLayoutError extends Error {
  constructor(templateId: string, blockType: unknown, pageIndex?: number) {
    const location = pageIndex === undefined ? '' : ` à la page ${pageIndex + 1}`;
    super(
      `Le layout « ${String(blockType)} » n’est pas autorisé pour « ${templateId} »${location}.`,
    );
    this.name = 'DisallowedDocumentLayoutError';
  }
}

/** Missing legacy values intentionally resolve to presentation; unknown values fail closed. */
export function resolveDocumentTemplate(value: unknown): (typeof DOCUMENT_TEMPLATES)[number] {
  const id = value === undefined || value === null || value === '' ? 'presentation' : value;
  if (typeof id !== 'string') throw new UnknownDocumentTemplateError(id);
  const template = TEMPLATE_BY_ID.get(id as DocumentTemplateId);
  if (!template) throw new UnknownDocumentTemplateError(id);
  return template;
}

export function specsForDocumentTemplate(template: DocumentTemplateDefinition): BlockSpec[] {
  const allowed = new Set(template.allowedLayouts);
  const specs = ALL_SPECS.filter((spec) => allowed.has(spec.blockType));
  if (specs.length !== template.allowedLayouts.length) {
    const registered = new Set(specs.map((spec) => spec.blockType));
    const missing = template.allowedLayouts.filter((blockType) => !registered.has(blockType));
    throw new Error(
      `Le template « ${template.id} » référence des layouts inconnus : ${missing.join(', ')}`,
    );
  }
  return specs;
}

export function templateDeclaresArtifact(
  template: DocumentTemplateDefinition,
  artifactKey: string,
): boolean {
  return template.artifacts.some((artifact) => artifact.key === artifactKey);
}

export function documentTemplateSchemas(template: DocumentTemplateDefinition) {
  const cached = SCHEMAS_BY_TEMPLATE.get(template);
  if (cached) return cached;
  const schemas = buildDocumentTemplateSchemas(template);
  SCHEMAS_BY_TEMPLATE.set(template, schemas);
  return schemas;
}

function buildDocumentTemplateSchemas(template: DocumentTemplateDefinition) {
  const specs = specsForDocumentTemplate(template);
  const renderPage = z.union(specs.map(renderSchemaOf));

  return {
    aiPage: emitDraftSchema(specs),
    aiPages: emitSlidesArraySchema(specs, template.agent.pageCount),
    outline: emitOutlineSchema(specs, template.agent.pageCount),
    renderPage,
    renderPages:
      template.pageCount.max === null
        ? z.array(renderPage).min(template.pageCount.min)
        : z.array(renderPage).min(template.pageCount.min).max(template.pageCount.max),
  };
}

export function parseDocumentAiPages(
  template: DocumentTemplateDefinition,
  pages: unknown,
): Array<{ blockType?: string }> {
  return z.array(documentTemplateSchemas(template).aiPage).parse(pages) as Array<{
    blockType?: string;
  }>;
}

export function parseDocumentRenderPages(
  template: DocumentTemplateDefinition,
  pages: unknown,
): Array<Record<string, unknown>> {
  assertDocumentPages(template, pages);
  return documentTemplateSchemas(template).renderPages.parse(pages) as Array<
    Record<string, unknown>
  >;
}

export function assertDocumentPages(
  template: DocumentTemplateDefinition,
  pages: unknown,
): asserts pages is Array<Record<string, unknown>> {
  if (!Array.isArray(pages)) throw new Error('Les pages du document doivent être un tableau.');
  if (
    pages.length < template.pageCount.min ||
    (template.pageCount.max !== null && pages.length > template.pageCount.max)
  ) {
    const range =
      template.pageCount.max === null
        ? `au moins ${template.pageCount.min}`
        : `entre ${template.pageCount.min} et ${template.pageCount.max}`;
    throw new Error(`Le template « ${template.id} » exige ${range} pages.`);
  }
  const allowed = new Set(template.allowedLayouts);
  pages.forEach((page, index) => {
    const blockType =
      page && typeof page === 'object' ? (page as Record<string, unknown>).blockType : undefined;
    if (!allowed.has(String(blockType))) {
      throw new DisallowedDocumentLayoutError(template.id, blockType, index);
    }
  });
}

export function applyDocumentCanvasToHeadmatter(
  headmatter: string,
  template: DocumentTemplateDefinition,
): string {
  let output = /^aspectRatio:/m.test(headmatter)
    ? headmatter.replace(/^(aspectRatio:[ \t]*).*$/m, `$1${template.canvas.aspectRatio}`)
    : `${headmatter}\naspectRatio: ${template.canvas.aspectRatio}`;
  if (/^canvasWidth:/m.test(output)) {
    output = output.replace(/^(canvasWidth:[ \t]*).*$/m, `$1${template.canvas.width}`);
  } else {
    output = `${output}\ncanvasWidth: ${template.canvas.width}`;
  }
  return output;
}

export const PRESENTATION_DOCUMENT_TEMPLATE = PRESENTATION_TEMPLATE;
export const LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE = LINKEDIN_CAROUSEL_TEMPLATE;
