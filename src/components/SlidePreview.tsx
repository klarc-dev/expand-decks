'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDocumentInfo, useFormFields } from '@payloadcms/ui';

import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '@/export/canvas';
import {
  previewRequestKey,
  selectPreviewRequest,
  type PreviewRequest,
} from '@/components/slidePreviewState';
import { SlideFrame, SLIDE_STAGE_BG, type SlideChrome } from '@/components/SlideFrame';

import '@/export/style.css';

const PREVIEW_DEBOUNCE_MS = 200;

type PreviewResult = {
  chrome?: SlideChrome;
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
    <section style={styles.section} aria-label="Aperçu de la diapositive">
      <div style={styles.header}>
        <strong>Aperçu de la diapositive</strong>
        {loading ? <span style={styles.status}>Actualisation…</span> : null}
      </div>
      {error ? <div style={styles.error}>{error}</div> : null}
      {result ? <PreviewFrame result={result} /> : null}
    </section>
  );
};

function PreviewFrame({ result }: { result: PreviewResult }) {
  const { className, html, image, layout, mermaid } = result.preview;

  return (
    <div style={styles.wrapper}>
      <div style={styles.scaler}>
        <SlideFrame
          className={className}
          chrome={result.chrome}
          html={html}
          image={image}
          layout={layout}
          mermaid={mermaid}
          style={styles.slide}
        />
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginTop: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  status: {
    color: 'var(--theme-elevation-500)',
    fontWeight: 400,
  },
  error: {
    marginBottom: '8px',
    padding: '8px 10px',
    border: '1px solid var(--theme-error-200)',
    borderRadius: '4px',
    color: 'var(--theme-error-500)',
    backgroundColor: 'var(--theme-error-50)',
    fontSize: '12px',
  },
  wrapper: {
    marginTop: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--theme-elevation-150)',
    background: SLIDE_STAGE_BG,
    // Shrink to the scaled slide — without this the wrapper keeps the form
    // column's full width and shows a dead dark band right of the preview.
    width: `calc(${SLIDE_CANVAS_WIDTH}px * var(--slide-scale, 0.375))`,
    maxWidth: '100%',
  },
  scaler: {
    width: `${SLIDE_CANVAS_WIDTH}px`,
    height: `${SLIDE_CANVAS_HEIGHT}px`,
    transform: 'scale(var(--slide-scale, 0.375))',
    transformOrigin: 'top left',
    marginBottom: `calc(-${SLIDE_CANVAS_HEIGHT}px * (1 - var(--slide-scale, 0.375)))`,
    marginRight: `calc(-${SLIDE_CANVAS_WIDTH}px * (1 - var(--slide-scale, 0.375)))`,
  },
  slide: {
    width: `${SLIDE_CANVAS_WIDTH}px`,
    height: `${SLIDE_CANVAS_HEIGHT}px`,
    overflow: 'hidden',
    position: 'relative' as const,
  },
} as const;

export default SlidePreview;
