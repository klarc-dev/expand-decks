'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui';

import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '@/export/canvas';
import {
  previewRequestKey,
  selectPreviewRequest,
  type PreviewRequest,
} from '@/components/slidePreviewState';
import { SlideFrame, SLIDE_STAGE_BG, type SlideChrome } from '@/components/SlideFrame';
import { adminPost } from '@/lib/adminFetch';

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

type SlideRevisionControlsProps = {
  instruction: string;
  revising: boolean;
  setInstruction: (value: string) => void;
  submit: () => void;
};

function SlideRevisionControls({
  instruction,
  revising,
  setInstruction,
  submit,
}: SlideRevisionControlsProps) {
  return (
    <div style={styles.aiPanel}>
      <textarea
        aria-label="Consigne de modification de la diapositive"
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Ex. : raccourcis le tableau, clarifie le message et conserve les chiffres."
        rows={3}
        disabled={revising}
        style={styles.aiInput}
      />
      <button
        type="button"
        onClick={submit}
        disabled={revising || !instruction.trim()}
        style={styles.aiSubmit}
      >
        {revising ? 'Révision en cours…' : 'Appliquer à cette diapositive'}
      </button>
    </div>
  );
}

// fallow-ignore-next-line complexity — preview fetching and form revision share one field lifecycle
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
  const [showAi, setShowAi] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [revising, setRevising] = useState(false);
  const { reset, submit } = useForm();

  async function reviseCurrentSlide() {
    if (!request.presentationId || !instruction.trim()) return;
    setRevising(true);
    setError('');
    try {
      // Save the current form first so resetting after the server-side revision
      // cannot discard unrelated unsaved edits elsewhere in the presentation.
      const saveResult = await submit({ disableSuccessStatus: true });
      if (!saveResult?.res.ok) {
        throw new Error('Enregistrez les champs invalides avant de réviser cette diapositive.');
      }
      const response = await adminPost('/api/revise-slide', {
        presentationId: request.presentationId,
        slideIndex: request.slideIndex,
        instruction,
      });
      if (!response.ok) {
        setError(response.data.error || `Révision impossible (HTTP ${response.status}).`);
        return;
      }
      const docResponse = await fetch(`/api/presentations/${request.presentationId}?depth=0`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!docResponse.ok) {
        throw new Error(
          'La diapositive a été modifiée, mais le formulaire n’a pas pu être actualisé.',
        );
      }
      await reset(await docResponse.json());
      setInstruction('');
      setShowAi(false);
      toast.success(`Diapositive ${request.slideIndex + 1} révisée par l’IA.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Révision impossible.');
    } finally {
      setRevising(false);
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
        <div style={styles.headerActions}>
          {loading ? <span style={styles.status}>Actualisation…</span> : null}
          <button
            type="button"
            style={styles.magicButton}
            onClick={() => setShowAi((value) => !value)}
          >
            ✨ Modifier avec l’IA
          </button>
        </div>
      </div>
      {showAi ? (
        <SlideRevisionControls
          instruction={instruction}
          revising={revising}
          setInstruction={setInstruction}
          submit={() => void reviseCurrentSlide()}
        />
      ) : null}
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  magicButton: {
    border: '1px solid var(--theme-elevation-200)',
    borderRadius: '999px',
    background: 'var(--theme-elevation-50)',
    color: 'var(--theme-text)',
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  aiPanel: {
    display: 'grid',
    gap: '8px',
    marginBottom: '10px',
    padding: '10px',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '6px',
    background: 'var(--theme-elevation-50)',
  },
  aiInput: {
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    border: '1px solid var(--theme-elevation-200)',
    borderRadius: '4px',
    padding: '8px',
    background: 'var(--theme-elevation-0)',
    color: 'var(--theme-text)',
    fontFamily: 'inherit',
  },
  aiSubmit: {
    justifySelf: 'start',
    border: 0,
    borderRadius: '4px',
    background: 'var(--theme-success-500)',
    color: '#fff',
    padding: '7px 11px',
    cursor: 'pointer',
    fontWeight: 600,
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
