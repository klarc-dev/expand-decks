import type { DocumentArtifactDefinition, DocumentTemplateDefinition } from './templates';

export type DocumentExportPlan = {
  native: {
    pdf: true;
    web: true;
    coverImage: true;
    pageImages: boolean;
  };
  pdf: readonly DocumentArtifactDefinition[];
  web: readonly DocumentArtifactDefinition[];
  images: readonly DocumentArtifactDefinition[];
};

/** Translate declarative artifact definitions into exporter capabilities. */
export function documentExportPlan(template: DocumentTemplateDefinition): DocumentExportPlan {
  const images = template.artifacts.filter((artifact) => artifact.kind === 'image');
  return {
    native: {
      pdf: true,
      web: true,
      coverImage: true,
      pageImages: images.some(
        (artifact) => artifact.repeat === 'per-page' || (artifact.pageIndex ?? 0) > 0,
      ),
    },
    pdf: template.artifacts.filter((artifact) => artifact.kind === 'pdf'),
    web: template.artifacts.filter((artifact) => artifact.kind === 'web'),
    images,
  };
}
