'use client';

import React, { useMemo } from 'react';
import { useFormFields } from '@payloadcms/ui';

import { renderBlockPreview } from '@/export/preview';
import { formStateToBlockData } from '@/lib/formStateToBlockData';
import { SlideFrame, SLIDE_STAGE_BG } from '@/components/SlideFrame';

import '@/export/style.css';

const SlidePreview: React.FC<{ path: string }> = ({ path }) => {
  // Subscribe to form state so the preview re-renders while the author types.
  // (getSiblingData is a one-shot getter — using it froze the preview until
  // the next save/reload.) The selector returns a JSON string so the context
  // comparison only triggers a re-render when the block's data changes.
  const blockJson = useFormFields(([fields]) =>
    JSON.stringify(formStateToBlockData(fields as never, path)),
  );

  const data = useMemo(() => JSON.parse(blockJson) as Record<string, unknown>, [blockJson]);

  if (!data?.blockType) return null;

  const res = renderBlockPreview(data as never);
  if (!res) return null;
  const { html, layout } = res;

  return (
    <div style={styles.wrapper}>
      <div style={styles.scaler}>
        <SlideFrame html={html} layout={layout} style={styles.slide} />
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    marginTop: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--theme-elevation-150)',
    background: SLIDE_STAGE_BG,
    // Shrink to the scaled slide — without this the wrapper keeps the form
    // column's full width and shows a dead dark band right of the preview.
    width: 'calc(960px * var(--slide-scale, 0.5))',
    maxWidth: '100%',
  },
  scaler: {
    width: '960px',
    height: '540px',
    transform: 'scale(var(--slide-scale, 0.5))',
    transformOrigin: 'top left',
    marginBottom: 'calc(-540px * (1 - var(--slide-scale, 0.5)))',
    marginRight: 'calc(-960px * (1 - var(--slide-scale, 0.5)))',
  },
  slide: {
    width: '960px',
    height: '540px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
} as const;

export default SlidePreview;
