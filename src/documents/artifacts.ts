import type { DocumentTemplateDefinition } from './templates';

export type ArtifactFile = number | string | { id?: number | string; url?: string | null };

export type DocumentArtifact = {
  key: string;
  actionLabel: string;
  buildId: string;
  file?: ArtifactFile | null;
  url?: string | null;
  pageIndex?: number | null;
};

export type ArtifactOutput = { file: ArtifactFile } | { url: string };
export type ArtifactOutputs = Record<
  string,
  ArtifactOutput | readonly ArtifactOutput[] | undefined
>;

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
  outputs: ArtifactOutputs,
  options: { pageCount?: number } = {},
): DocumentArtifact[] {
  return template.artifacts.flatMap((definition) => {
    const output = outputs[definition.key];
    if (definition.repeat === 'per-page') {
      const pageOutputs = Array.isArray(output) ? output : output ? [output] : [];
      const pageCount = options.pageCount ?? pageOutputs.length;
      if (pageOutputs.length !== pageCount) {
        throw new MissingExpectedArtifactError(template.id, definition.key);
      }
      return pageOutputs.map((pageOutput, pageIndex) => ({
        key: definition.key,
        actionLabel: `${definition.actionLabel} ${pageIndex + 1}`,
        buildId,
        ...pageOutput,
        pageIndex,
      }));
    }
    if (!output) {
      if (definition.requiredWhen === 'always' || (options.pageCount ?? 1) > 0) {
        throw new MissingExpectedArtifactError(template.id, definition.key);
      }
      return [];
    }
    return [
      {
        key: definition.key,
        actionLabel: definition.actionLabel,
        buildId,
        ...(output as ArtifactOutput),
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

export function artifactLinkKey(artifact: { key: string; pageIndex?: number }): string {
  return `${artifact.key}:${artifact.pageIndex ?? 'aggregate'}`;
}

export function availableArtifactLinks(document: {
  artifacts?: unknown;
  lastBuildToken?: unknown;
}): Array<{ key: string; href: string; label: string; pageIndex?: number }> {
  return currentBuildArtifacts(document.artifacts, document.lastBuildToken).flatMap((artifact) => {
    const href = artifactHref(artifact);
    return href
      ? [
          {
            key: artifact.key,
            href,
            label: artifact.actionLabel,
            ...(artifact.pageIndex == null ? {} : { pageIndex: artifact.pageIndex }),
          },
        ]
      : [];
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

export function presentationArtifactPatch(
  template: DocumentTemplateDefinition,
  buildId: string,
  outputs: ArtifactOutputs,
  pageCount: number,
) {
  return { artifacts: artifactsForBuild(template, buildId, outputs, { pageCount }) };
}

export function artifactFileIds(artifacts: unknown): Array<number | string> {
  if (!Array.isArray(artifacts)) return [];
  return artifacts.flatMap((artifact) => {
    if (!artifact || typeof artifact !== 'object') return [];
    const id = fileId((artifact as DocumentArtifact).file);
    return id === null ? [] : [id];
  });
}

/** Media files left by artifact rows from builds other than the build being committed. */
export function staleArtifactFileIds(
  artifacts: unknown,
  currentBuildId: string,
): Array<number | string> {
  if (!Array.isArray(artifacts)) return [];
  return artifactFileIds(
    artifacts.filter(
      (artifact) =>
        artifact &&
        typeof artifact === 'object' &&
        (artifact as { buildId?: unknown }).buildId !== currentBuildId,
    ),
  );
}
