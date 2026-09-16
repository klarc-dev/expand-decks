'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Modal, useDocumentInfo, useFormFields, useModal } from '@payloadcms/ui';

import type { SlideLayoutCompatibility } from '@/blocks/spec/slideLayoutCompatibility';
import { AdminNotice } from '@/components/adminUi/AdminSurface';
import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '@/export/canvas';
import {
  previewRequestKey,
  selectPreviewRequest,
  type PreviewRequest,
} from '@/components/slidePreviewState';
import { SlideFrame, type SlideChrome } from '@/components/SlideFrame';

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
  modalSlug,
  results,
}: {
  currentLayout?: string;
  modalSlug: string;
  results: SlideLayoutCompatibility[];
}) {
  const { closeModal, isModalOpen } = useModal();
  if (!isModalOpen(modalSlug)) return null;

  return (
    <Modal className="slide-layout-compatibility" closeOnBlur slug={modalSlug}>
      <div className="slide-layout-compatibility__surface">
        <header className="slide-layout-compatibility__header">
          <div>
            <p className="slide-layout-compatibility__eyebrow">Analyse sans modification</p>
            <h2>Changer la mise en page</h2>
            <p>
              Comparez les layouts autorisés pour cette slide. Aucun contenu ne sera modifié à cette
              étape.
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
          {results.map((result) => (
            <article
              className={`slide-layout-compatibility__card slide-layout-compatibility__card--${result.classification}`}
              key={result.layout}
            >
              <img alt="" aria-hidden="true" src={result.imageURL} />
              <div className="slide-layout-compatibility__card-heading">
                <strong>{result.label}</strong>
                {result.layout === currentLayout ? <span>Actuel</span> : null}
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
  compatibility: SlideLayoutCompatibility[];
  preview: {
    className: string;
    html: string;
    hideChrome: boolean;
    image?: string;
    layout: string;
    mermaid?: { source: string };
  };
};

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
  const { openModal } = useModal();
  const modalSlug = `slide-layout-compatibility-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;

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
            body: requestKey,
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
  }, [request, requestKey]);

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
            onClick={() => openModal(modalSlug)}
            size="small"
            type="button"
          >
            Changer la mise en page
          </Button>
        </div>
      </div>
      {error ? (
        <AdminNotice className="slide-preview__error" density="compact" variant="error">
          {error}
        </AdminNotice>
      ) : null}
      <LayoutCompatibilityModal
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
