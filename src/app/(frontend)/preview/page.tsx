'use client';

import React from 'react';
import { useLivePreview } from '@payloadcms/live-preview-react';

import { renderBlockPreview } from '@/export/preview';
import type { SlideBlock } from '@/export/renderers';

import '@/export/style.css';

type PresentationData = {
  title: string;
  slides?: SlideBlock[];
};

function renderSlides(slides: SlideBlock[]): { html: string; layout: string }[] {
  return slides
    .map(renderBlockPreview)
    .filter((s): s is { html: string; layout: string } => s !== null);
}

const EMPTY_PRESENTATION: PresentationData = { title: '', slides: [] };

export default function PreviewPage() {
  const { data, isLoading } = useLivePreview<PresentationData>({
    initialData: EMPTY_PRESENTATION,
    serverURL: typeof window !== 'undefined' ? window.location.origin : '',
    depth: 2,
  });

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p style={styles.loadingText}>Chargement de l&apos;aper&ccedil;u...</p>
      </div>
    );
  }

  const slides = data?.slides;
  if (!slides || slides.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>
          Ajoutez des diapositives pour voir l&apos;aper&ccedil;u en direct.
        </p>
      </div>
    );
  }

  const rendered = renderSlides(slides);

  return (
    <div style={styles.container}>
      {rendered.map((slide, i) => (
        <div key={i} style={styles.slideWrapper}>
          <div style={styles.slideNumber}>{i + 1}</div>
          <div
            className={`slidev-layout ${slide.layout === 'cover' ? 'k-cover' : ''}`}
            style={styles.slide}
            dangerouslySetInnerHTML={{ __html: slide.html }}
          />
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
    padding: '2rem',
    background: '#1a1a2e',
    minHeight: '100vh',
    alignItems: 'center',
    fontFamily: "'Roboto', system-ui, sans-serif",
  },
  slideWrapper: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '960px',
  },
  slideNumber: {
    position: 'absolute' as const,
    top: '-1.5rem',
    left: '0.5rem',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Roboto Mono', monospace",
  },
  slide: {
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    position: 'relative' as const,
    padding: '3rem 4rem',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1a1a2e',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1a1a2e',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    textAlign: 'center' as const,
  },
} as const;
