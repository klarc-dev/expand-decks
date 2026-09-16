'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Modal,
  toast,
  useDocumentInfo,
  useForm,
  useFormFields,
  useModal,
} from '@payloadcms/ui';

import type { SlideLayoutCompatibility } from '@/blocks/spec/slideLayoutCompatibility';
import { candidateThemeVariables } from '@/components/candidateThemeVariables';
import { AdminNotice } from '@/components/adminUi/AdminSurface';
import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '@/export/canvas';
import {
  previewRequestKey,
  selectPreviewRequest,
  type PreviewRequest,
} from '@/components/slidePreviewState';
import { SlideFrame, type SlideChrome } from '@/components/SlideFrame';
import { adminPost } from '@/lib/adminFetch';

import '@/export/style.css';
import './SlidePreview.scss';

const PREVIEW_DEBOUNCE_MS = 200;

const COMPATIBILITY_LABELS: Record<SlideLayoutCompatibility['classification'], string> = {
  adjustments: 'Ajustements',
  compatible: 'Compatible',
  lossy: 'Avec pertes',
  unavailable: 'Indisponible',
};

function LayoutCompatibilityModal({
  currentLayout,
  applying,
  applyLayout,
  canvas,
  chrome,
  themeCss,
  modalSlug,
  results,
}: {
  currentLayout?: string;
  applying: boolean;
  applyLayout: (
    result: SlideLayoutCompatibility,
    mapping?: { collectionSide?: 'left' | 'right'; proseSourceField?: string },
  ) => void;
  canvas: PreviewResult['canvas'];
  chrome?: SlideChrome;
  themeCss?: string;
  modalSlug: string;
  results: SlideLayoutCompatibility[];
}) {
  const { closeModal, isModalOpen } = useModal();
  const [proseMapping, setProseMapping] = useState<Record<string, string>>({});
  const [collectionSide, setCollectionSide] = useState<Record<string, 'left' | 'right'>>({});
  if (!isModalOpen(modalSlug)) return null;

  const ranked = [...results].sort(
    (a, b) => b.recommendation.score - a.recommendation.score || a.layout.localeCompare(b.layout),
  );

  return (
    <Modal className="slide-layout-compatibility" closeOnBlur slug={modalSlug}>
      <div className="slide-layout-compatibility__surface">
        <header className="slide-layout-compatibility__header">
          <div>
            <h2>Changer la mise en page</h2>
            <p>
              Comparez les layouts avec le contenu réel. Les informations non affichées restent
              attachées à la slide.
            </p>
          </div>
          <Button
            aria-label="Fermer l’analyse des layouts"
            buttonStyle="secondary"
            margin={false}
            onClick={() => closeModal(modalSlug)}
            size="small"
            type="button"
          >
            Fermer
          </Button>
        </header>
        <div className="slide-layout-compatibility__grid">
          {ranked.map((result, rank) => (
            <article
              className={`slide-layout-compatibility__card slide-layout-compatibility__card--${result.classification}`}
              key={result.layout}
            >
              {result.preview ? (
                <div
                  className="slide-layout-compatibility__candidate"
                  style={{ aspectRatio: canvas.aspectRatio }}
                >
                  <div
                    className="slide-layout-compatibility__candidate-scaler"
                    style={candidateScalerStyle(canvas, themeCss)}
                  >
                    <SlideFrame
                      className={result.preview.className}
                      chrome={(result.preview.chrome as SlideChrome | undefined) ?? chrome}
                      html={result.preview.html}
                      image={result.preview.image}
                      layout={result.preview.layout}
                      mermaid={result.preview.mermaid}
                      style={slideStyle(canvas)}
                    />
                  </div>
                </div>
              ) : (
                <img alt="" aria-hidden="true" src={result.imageURL} />
              )}
              <div className="slide-layout-compatibility__card-heading">
                <strong>{result.label}</strong>
                <span>{result.layout === currentLayout ? 'Actuel' : `Choix ${rank + 1}`}</span>
              </div>
              <p className="slide-layout-compatibility__classification">
                {COMPATIBILITY_LABELS[result.classification]}
              </p>
              {result.issues.length > 0 ? (
                <ul>
                  {result.issues.map((issue, index) => (
                    <li key={`${issue.code}-${issue.field ?? issue.role ?? index}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="slide-layout-compatibility__detail">
                  Tous les contenus affichés par cette slide sont pris en charge.
                </p>
              )}
              {result.hidden.length > 0 ? (
                <div className="slide-layout-compatibility__warning" role="note">
                  <strong>Non affiché dans cet aperçu :</strong>
                  <ul>
                    {result.hidden.map((item) => (
                      <li key={`${item.role}-${item.field}`}>{item.field}</li>
                    ))}
                  </ul>
                  <span>Ce contenu reste attaché à la slide.</span>
                </div>
              ) : null}
              {result.layout === 'twoCols' ? (
                <div className="slide-layout-compatibility__mapping">
                  <label>
                    Côté de la collection
                    <select
                      value={collectionSide[result.layout] ?? 'right'}
                      onChange={(event) =>
                        setCollectionSide((current) => ({
                          ...current,
                          [result.layout]: event.target.value as 'left' | 'right',
                        }))
                      }
                    >
                      <option value="right">Droite</option>
                      <option value="left">Gauche</option>
                    </select>
                  </label>
                  {result.issues.some((issue) => issue.code === 'mapping') ? (
                    <label>
                      Texte de la colonne de prose
                      <select
                        value={proseMapping[result.layout] ?? ''}
                        onChange={(event) =>
                          setProseMapping((current) => ({
                            ...current,
                            [result.layout]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Choix automatique</option>
                        {result.mappedFields
                          .filter((mapping) => mapping.role === 'prose.support')
                          .map((mapping) => (
                            <option key={mapping.from} value={mapping.from}>
                              {mapping.from}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}
              <Button
                buttonStyle={rank === 0 ? 'primary' : 'secondary'}
                disabled={
                  applying ||
                  result.classification === 'unavailable' ||
                  result.layout === currentLayout
                }
                margin={false}
                onClick={() =>
                  applyLayout(
                    result,
                    result.layout === 'twoCols'
                      ? {
                          collectionSide: collectionSide[result.layout] ?? 'right',
                          ...(proseMapping[result.layout]
                            ? { proseSourceField: proseMapping[result.layout] }
                            : {}),
                        }
                      : proseMapping[result.layout]
                        ? { proseSourceField: proseMapping[result.layout] }
                        : undefined,
                  )
                }
                size="small"
                type="button"
              >
                {applying ? 'Application…' : 'Appliquer ce layout'}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
}

type PreviewResult = {
  canvas: { width: number; height: number; aspectRatio: string };
  chrome?: SlideChrome;
  themeCss?: string;
  compatibility: SlideLayoutCompatibility[];
  fingerprint: string;
  preview: {
    className: string;
    html: string;
    hideChrome: boolean;
    image?: string;
    layout: string;
    mermaid?: { source: string };
  };
};

type LayoutMutationResult = {
  fingerprint: string;
  presentation?: Record<string, unknown>;
  slide?: Record<string, unknown>;
  undoToken?: string;
};

// Preview fetching, atomic layout mutation, and undo share one Payload field lifecycle.
const SlidePreview: React.FC<{ path: string }> = ({ path }) => {
  const { id } = useDocumentInfo();
  // Subscribe to form state so the preview re-renders while the author types.
  // (getSiblingData is a one-shot getter — using it froze the preview until
  // the next save/reload.) The selector returns a JSON string so the context
  // comparison only triggers a re-render when the block's data changes.
  // One JSON key over the whole preview request — the effect only refetches
  // when something that affects the rendered preview actually changes (U2).
  const requestKey = useFormFields(([fields]) =>
    previewRequestKey(selectPreviewRequest(fields as never, path, id ?? undefined)),
  );

  const request = useMemo(() => JSON.parse(requestKey) as PreviewRequest, [requestKey]);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyingLayout, setApplyingLayout] = useState(false);
  const [includeLayoutCandidates, setIncludeLayoutCandidates] = useState(false);
  const [undo, setUndo] = useState<{ fingerprint: string; token: string } | null>(null);
  const { reset } = useForm();
  const { closeModal, openModal } = useModal();
  const modalSlug = `slide-layout-compatibility-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

  async function refreshDocument() {
    const docResponse = await fetch(`/api/presentations/${request.presentationId}?depth=0`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!docResponse.ok) throw new Error('Le formulaire n’a pas pu être actualisé.');
    await reset(await docResponse.json());
  }

  async function applyLayout(
    candidate: SlideLayoutCompatibility,
    mapping?: { collectionSide?: 'left' | 'right'; proseSourceField?: string },
  ) {
    if (!request.presentationId || !result?.fingerprint) return;
    if (
      candidate.requiresConfirmation &&
      !window.confirm('Ce layout masque ou transforme une partie du contenu visible. Continuer ?')
    ) {
      return;
    }
    setApplyingLayout(true);
    setError('');
    try {
      const response = await adminPost('/api/slide-layout', {
        action: 'apply',
        deckId: request.presentationId,
        slideIndex: request.slideIndex,
        targetLayout: candidate.layout,
        expectedFingerprint: result.fingerprint,
        confirmLossy: candidate.requiresConfirmation,
        mapping,
        draft: {
          slideId: (request.block as { id?: string | number }).id ?? null,
          slide: request.block as Record<string, unknown>,
        },
      });
      if (!response.ok) throw new Error(response.data.error || 'Changement de layout impossible.');
      const data = response.data as LayoutMutationResult;
      if (data.presentation) await reset(data.presentation);
      else await refreshDocument();
      if (data.undoToken) setUndo({ fingerprint: data.fingerprint, token: data.undoToken });
      toast.success(`Layout « ${candidate.label} » appliqué.`);
      closeModal(modalSlug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Changement de layout impossible.');
    } finally {
      setApplyingLayout(false);
    }
  }

  async function undoLayout() {
    if (!request.presentationId || !undo) return;
    setApplyingLayout(true);
    try {
      const response = await adminPost('/api/slide-layout', {
        action: 'undo-layout',
        deckId: request.presentationId,
        slideIndex: request.slideIndex,
        expectedFingerprint: undo.fingerprint,
        undoToken: undo.token,
      });
      if (!response.ok) throw new Error(response.data.error || 'Annulation impossible.');
      const data = response.data as LayoutMutationResult;
      if (data.presentation) await reset(data.presentation);
      else await refreshDocument();
      setUndo(null);
      toast.success('Le layout précédent a été restauré.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Annulation impossible.');
    } finally {
      setApplyingLayout(false);
    }
  }

  useEffect(() => {
    if (!(request.block as { blockType?: string })?.blockType) {
      setResult(null);
      setLoading(false);
      setError('');
      return;
    }

    if (!request.presentationId) {
      setLoading(false);
      setError('Enregistrez d’abord la présentation pour activer l’aperçu.');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    // Debounce: coalesce rapid keystrokes into a single request after a short
    // idle window. The effect-cleanup AbortController still cancels an in-flight
    // request when a newer debounced request supersedes it (U2/R1).
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch('/api/slide-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ ...request, includeLayoutCandidates }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(body?.error || `Aperçu indisponible (HTTP ${res.status}).`);
            return;
          }
          setResult((await res.json()) as PreviewResult);
          setError('');
        } catch {
          if (!controller.signal.aborted) setError('Impossible de charger l’aperçu.');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [includeLayoutCandidates, request]);

  if (!result && !loading && !error) return null;

  return (
    <section
      aria-label="Aperçu de la diapositive"
      className="slide-preview"
      style={previewCanvasVariables(result?.canvas)}
    >
      <div className="slide-preview__header">
        <strong>Aperçu de la diapositive</strong>
        <div className="slide-preview__header-actions">
          <span
            aria-atomic="true"
            aria-live="polite"
            className="slide-preview__status"
            role="status"
          >
            {loading ? (
              <>
                <span className="sr-only">Aperçu de la diapositive : </span>
                Actualisation…
              </>
            ) : null}
          </span>
          <Button
            buttonStyle="secondary"
            disabled={!result?.compatibility?.length}
            margin={false}
            onClick={() => {
              setIncludeLayoutCandidates(true);
              openModal(modalSlug);
            }}
            size="small"
            type="button"
          >
            Changer la mise en page
          </Button>
          {undo ? (
            <Button
              buttonStyle="secondary"
              disabled={applyingLayout}
              margin={false}
              onClick={() => void undoLayout()}
              size="small"
              type="button"
            >
              Annuler le changement
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <AdminNotice className="slide-preview__error" density="compact" variant="error">
          {error}
        </AdminNotice>
      ) : null}
      <LayoutCompatibilityModal
        applying={applyingLayout}
        applyLayout={(candidate, mapping) => void applyLayout(candidate, mapping)}
        canvas={
          result?.canvas ?? {
            width: SLIDE_CANVAS_WIDTH,
            height: SLIDE_CANVAS_HEIGHT,
            aspectRatio: '16/9',
          }
        }
        chrome={result?.chrome}
        themeCss={result?.themeCss}
        currentLayout={(request.block as { blockType?: string })?.blockType}
        modalSlug={modalSlug}
        results={result?.compatibility ?? []}
      />
      {result ? <PreviewFrame result={result} /> : null}
    </section>
  );
};

function PreviewFrame({ result }: { result: PreviewResult }) {
  const { className, html, image, layout, mermaid } = result.preview;

  return (
    <div aria-label="Rendu de la diapositive" className="slide-preview__frame" role="img">
      <div className="slide-preview__scaler">
        <SlideFrame
          className={className}
          chrome={result.chrome}
          html={html}
          image={image}
          layout={layout}
          mermaid={mermaid}
          style={slideStyle(result.canvas)}
        />
      </div>
    </div>
  );
}

const candidateScalerStyle = (canvas: PreviewResult['canvas'], themeCss?: string) => ({
  ...candidateThemeVariables(themeCss),
  height: canvas.height,
  transform: `scale(${280 / canvas.width})`,
  width: canvas.width,
});

const slideStyle = (canvas: PreviewResult['canvas']) => ({
  width: `${canvas.width}px`,
  height: `${canvas.height}px`,
  overflow: 'hidden',
  position: 'relative' as const,
});

const previewCanvasVariables = (canvas?: PreviewResult['canvas']) =>
  ({
    '--slide-preview-height': `${canvas?.height ?? SLIDE_CANVAS_HEIGHT}px`,
    '--slide-preview-width': `${canvas?.width ?? SLIDE_CANVAS_WIDTH}px`,
  }) as React.CSSProperties;

export default SlidePreview;
