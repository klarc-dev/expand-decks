import type { DocumentTemplateDefinition } from './templates';

export type DocumentExportPlan = {
  pdf: boolean;
  web: boolean;
  images: Array<{ key: string; pageIndex: number }>;
};

/** Translate declarative artifact definitions into exporter capabilities. */
export function documentExportPlan(template: DocumentTemplateDefinition): DocumentExportPlan {
  return {
    pdf: template.artifacts.some((artifact) => artifact.kind === 'pdf'),
    web: template.artifacts.some((artifact) => artifact.kind === 'web'),
    images: template.artifacts.flatMap((artifact) =>
      artifact.kind === 'image' && artifact.pageIndex !== undefined
        ? [{ key: artifact.key, pageIndex: artifact.pageIndex }]
        : [],
    ),
  };
}
