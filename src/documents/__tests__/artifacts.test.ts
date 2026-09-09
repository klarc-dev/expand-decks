import { describe, expect, it } from 'vitest';

import { LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE, PRESENTATION_DOCUMENT_TEMPLATE } from '../templates';
import {
  artifactsForBuild,
  availableArtifactLinks,
  MissingPrimaryArtifactError,
  MissingExpectedArtifactError,
  projectLegacyPresentationArtifacts,
  presentationArtifactPatch,
  resolvePrimaryArtifact,
  resolvePrimaryArtifactHref,
} from '../artifacts';

describe('document artifacts', () => {
  const outputs = {
    pdf: { file: 11 },
    'web-presentation': { url: '/spa/deck/index.html' },
    'cover-image': { file: 12 },
  };

  it('persists expected artifacts in template order with build identity and page index', () => {
    expect(artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'build-2', outputs)).toEqual([
      {
        key: 'pdf',
        kind: 'pdf',
        label: 'PDF',
        actionLabel: 'Télécharger le PDF',
        buildId: 'build-2',
        file: 11,
      },
      {
        key: 'web-presentation',
        kind: 'web',
        label: 'Présentation web',
        actionLabel: 'Ouvrir la présentation web',
        buildId: 'build-2',
        url: '/spa/deck/index.html',
      },
      {
        key: 'cover-image',
        kind: 'image',
        label: 'Image de couverture',
        actionLabel: 'Ouvrir l’image de couverture',
        buildId: 'build-2',
        file: 12,
        pageIndex: 0,
      },
    ]);
  });

  it('resolves only the declared primary artifact from the active build', () => {
    const artifacts = [
      ...artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'old-build', outputs),
      ...artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'current-build', {
        ...outputs,
        'web-presentation': { url: '/spa/current/index.html' },
      }),
    ];

    expect(
      resolvePrimaryArtifact(PRESENTATION_DOCUMENT_TEMPLATE, {
        lastBuildToken: 'current-build',
        artifacts,
      }),
    ).toMatchObject({ key: 'web-presentation', url: '/spa/current/index.html' });
  });

  it('fails explicitly when the active build has no primary artifact', () => {
    expect(() =>
      resolvePrimaryArtifact(PRESENTATION_DOCUMENT_TEMPLATE, {
        lastBuildToken: 'current-build',
        artifacts: artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'old-build', outputs),
      }),
    ).toThrow(MissingPrimaryArtifactError);
  });

  it('rejects a build that omitted an expected artifact but permits a paged artifact for zero pages', () => {
    expect(() =>
      artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'build-2', {
        'web-presentation': { url: '/spa/deck/index.html' },
      }),
    ).toThrow(MissingExpectedArtifactError);

    expect(
      artifactsForBuild(
        PRESENTATION_DOCUMENT_TEMPLATE,
        'empty-build',
        {
          pdf: { file: 11 },
          'web-presentation': { url: '/spa/empty/index.html' },
        },
        { pageCount: 0 },
      ),
    ).toHaveLength(2);
  });

  it('builds ordered user-facing links without artifact-specific UI logic', () => {
    const artifacts = artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'build-2', {
      pdf: { file: { id: 11, url: '/media/deck.pdf' } },
      'web-presentation': { url: '/spa/deck/index.html' },
      'cover-image': { file: { id: 12, url: '/media/cover.png' } },
    });

    expect(availableArtifactLinks({ artifacts, lastBuildToken: 'build-2' })).toEqual([
      { key: 'pdf', href: '/media/deck.pdf', label: 'Télécharger le PDF' },
      {
        key: 'web-presentation',
        href: '/spa/deck/index.html',
        label: 'Ouvrir la présentation web',
      },
      { key: 'cover-image', href: '/media/cover.png', label: 'Ouvrir l’image de couverture' },
    ]);
    expect(
      resolvePrimaryArtifactHref(PRESENTATION_DOCUMENT_TEMPLATE, {
        artifacts,
        lastBuildToken: 'build-2',
      }),
    ).toBe('/spa/deck/index.html');
  });

  it('derives compatibility fields from generic artifacts and clears missing projections', () => {
    expect(
      projectLegacyPresentationArtifacts(
        artifactsForBuild(PRESENTATION_DOCUMENT_TEMPLATE, 'build-2', outputs),
        'build-2',
      ),
    ).toEqual({
      pdfFile: 11,
      spaUrl: '/spa/deck/index.html',
      coverImage: 12,
    });

    expect(projectLegacyPresentationArtifacts([], 'build-2')).toEqual({
      pdfFile: null,
      spaUrl: null,
      coverImage: null,
    });
  });

  it('builds the persistence patch and compatibility projections from one artifact source', () => {
    const patch = presentationArtifactPatch(PRESENTATION_DOCUMENT_TEMPLATE, 'build-2', outputs, 8);

    expect(patch.artifacts.map((artifact) => artifact.key)).toEqual([
      'pdf',
      'web-presentation',
      'cover-image',
    ]);
    expect(patch).toMatchObject({
      pdfFile: 11,
      spaUrl: '/spa/deck/index.html',
      coverImage: 12,
    });
  });

  it('persists one ordered carousel image artifact per page', () => {
    const artifacts = artifactsForBuild(
      LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE,
      'carousel-build',
      {
        'page-image': [
          { file: { id: 21, url: '/media/page-1.png' } },
          { file: { id: 22, url: '/media/page-2.png' } },
          { file: { id: 23, url: '/media/page-3.png' } },
        ],
      },
      { pageCount: 3 },
    );

    expect(artifacts).toEqual([
      expect.objectContaining({ key: 'page-image', pageIndex: 0 }),
      expect.objectContaining({ key: 'page-image', pageIndex: 1 }),
      expect.objectContaining({ key: 'page-image', pageIndex: 2 }),
    ]);
    expect(availableArtifactLinks({ artifacts, lastBuildToken: 'carousel-build' })).toEqual([
      { key: 'page-image', href: '/media/page-1.png', label: 'Télécharger la page 1' },
      { key: 'page-image', href: '/media/page-2.png', label: 'Télécharger la page 2' },
      { key: 'page-image', href: '/media/page-3.png', label: 'Télécharger la page 3' },
    ]);
  });
});
