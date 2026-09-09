import type { DocumentArtifactDefinition, DocumentTemplateDefinition } from './templates';

export type ArtifactFile = number | string | { id?: number | string; url?: string | null };

export type DocumentArtifact = {
  key: string;
  kind: DocumentArtifactDefinition['kind'];
  label: string;
  actionLabel: string;
  buildId: string;
  file?: ArtifactFile | null;
  url?: string | null;
  pageIndex?: number | null;
};

export type ArtifactOutput = { file: ArtifactFile } | { url: string };

export class MissingPrimaryArtifactError extends Error {
  constructor(templateId: string, artifactKey: string, buildId?: string | null) {
    super(
      `L’artefact principal « ${artifactKey} » du template « ${templateId} » est absent${
        buildId ? ` pour le build « ${buildId} »` : ''
      }.`,
    );
    this.name = 'MissingPrimaryArtifactError';
  }
}

export class MissingExpectedArtifactError extends Error {
  constructor(templateId: string, artifactKey: string) {
    super(
      `L’artefact attendu « ${artifactKey} » du template « ${templateId} » n’a pas été produit.`,
    );
    this.name = 'MissingExpectedArtifactError';
  }
}

export function artifactsForBuild(
  template: DocumentTemplateDefinition,
  buildId: string,
  outputs: Record<string, ArtifactOutput | undefined>,
  options: { pageCount?: number } = {},
): DocumentArtifact[] {
  return template.artifacts.flatMap((definition) => {
    const output = outputs[definition.key];
    if (!output) {
      if (definition.requiredWhen === 'always' || (options.pageCount ?? 1) > 0) {
        throw new MissingExpectedArtifactError(template.id, definition.key);
      }
      return [];
    }
    return [
      {
        key: definition.key,
        kind: definition.kind,
        label: definition.label,
        actionLabel: definition.actionLabel,
        buildId,
        ...output,
        ...(definition.pageIndex === undefined ? {} : { pageIndex: definition.pageIndex }),
      },
    ];
  });
}

export function currentBuildArtifacts(artifacts: unknown, buildId: unknown): DocumentArtifact[] {
  if (!Array.isArray(artifacts) || typeof buildId !== 'string' || !buildId) return [];
  return artifacts.filter((artifact): artifact is DocumentArtifact =>
    Boolean(
      artifact &&
        typeof artifact === 'object' &&
        (artifact as DocumentArtifact).buildId === buildId,
    ),
  );
}

export function resolvePrimaryArtifact(
  template: DocumentTemplateDefinition,
  document: { artifacts?: unknown; lastBuildToken?: unknown },
): DocumentArtifact {
  const buildId = typeof document.lastBuildToken === 'string' ? document.lastBuildToken : null;
  const artifact = currentBuildArtifacts(document.artifacts, buildId).find(
    (candidate) => candidate.key === template.primaryArtifact,
  );
  if (!artifact)
    throw new MissingPrimaryArtifactError(template.id, template.primaryArtifact, buildId);
  return artifact;
}

function fileId(file: ArtifactFile | null | undefined): number | string | null {
  if (typeof file === 'number' || typeof file === 'string') return file;
  if (
    file &&
    typeof file === 'object' &&
    (typeof file.id === 'number' || typeof file.id === 'string')
  ) {
    return file.id;
  }
  return null;
}

export function artifactHref(artifact: DocumentArtifact): string | null {
  if (typeof artifact.url === 'string' && artifact.url) return artifact.url;
  if (artifact.file && typeof artifact.file === 'object' && typeof artifact.file.url === 'string') {
    return artifact.file.url;
  }
  return null;
}

export function availableArtifactLinks(document: {
  artifacts?: unknown;
  lastBuildToken?: unknown;
}): Array<{ key: string; href: string; label: string }> {
  return currentBuildArtifacts(document.artifacts, document.lastBuildToken).flatMap((artifact) => {
    const href = artifactHref(artifact);
    return href ? [{ key: artifact.key, href, label: artifact.actionLabel }] : [];
  });
}

export function resolvePrimaryArtifactHref(
  template: DocumentTemplateDefinition,
  document: { artifacts?: unknown; lastBuildToken?: unknown },
): string {
  const artifact = resolvePrimaryArtifact(template, document);
  const href = artifactHref(artifact);
  if (!href) {
    throw new MissingPrimaryArtifactError(
      template.id,
      template.primaryArtifact,
      typeof document.lastBuildToken === 'string' ? document.lastBuildToken : null,
    );
  }
  return href;
}

export function projectLegacyPresentationArtifacts(
  artifacts: unknown,
  buildId: unknown,
): { pdfFile: number | string | null; spaUrl: string | null; coverImage: number | string | null } {
  const current = currentBuildArtifacts(artifacts, buildId);
  return {
    pdfFile: fileId(current.find((artifact) => artifact.key === 'pdf')?.file),
    spaUrl: current.find((artifact) => artifact.key === 'web-presentation')?.url ?? null,
    coverImage: fileId(current.find((artifact) => artifact.key === 'cover-image')?.file),
  };
}

export function presentationArtifactPatch(
  template: DocumentTemplateDefinition,
  buildId: string,
  outputs: Record<string, ArtifactOutput | undefined>,
  pageCount: number,
) {
  const artifacts = artifactsForBuild(template, buildId, outputs, { pageCount });
  return {
    artifacts,
    ...projectLegacyPresentationArtifacts(artifacts, buildId),
  };
}

export function artifactFileIds(artifacts: unknown): Array<number | string> {
  if (!Array.isArray(artifacts)) return [];
  return artifacts.flatMap((artifact) => {
    if (!artifact || typeof artifact !== 'object') return [];
    const id = fileId((artifact as DocumentArtifact).file);
    return id === null ? [] : [id];
  });
}
