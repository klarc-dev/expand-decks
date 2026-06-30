'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFormFields } from '@payloadcms/ui';

import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '@/export/canvas';
import { formStateToBlockData } from '@/lib/formStateToBlockData';
import { SlideFrame, SLIDE_STAGE_BG, type SlideChrome } from '@/components/SlideFrame';

import '@/export/style.css';

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
  // Subscribe to form state so the preview re-renders while the author types.
  // (getSiblingData is a one-shot getter — using it froze the preview until
  // the next save/reload.) The selector returns a JSON string so the context
  // comparison only triggers a re-render when the block's data changes.
  const blockJson = useFormFields(([fields]) =>
    JSON.stringify(formStateToBlockData(fields as never, path)),
  );

  // Deck section titles (in order) so an empty `agenda` block previews its
  // auto-derived plan — mirrors the ctx.sections buildSlidesMd threads at build.
  const sectionsJson = useFormFields(([fields]) => {
    const out: { i: number; title: string }[] = [];
    for (const key of Object.keys(fields)) {
      const m = /^slides\.(\d+)\.blockType$/.exec(key);
      if (!m || fields[key]?.value !== 'section') continue;
      const i = Number(m[1]);
      const title = fields[`slides.${i}.title`]?.value;
      if (typeof title === 'string' && title.trim()) out.push({ i, title: title.trim() });
    }
    return JSON.stringify(out.sort((a, b) => a.i - b.i).map((s) => s.title));
  });
  const chromeInputJson = useFormFields(([fields]) => {
    const block = formStateToBlockData(fields as never, path);
    const slideBlockTypes: Record<string, unknown> = {};
    for (const key of Object.keys(fields)) {
      if (/^slides\.\d+\.blockType$/.test(key)) slideBlockTypes[key] = fields[key]?.value;
    }
    return JSON.stringify({
      block,
      fields: {
        ...slideBlockTypes,
        'footer.center': fields['footer.center']?.value,
        'footer.enabled': fields['footer.enabled']?.value,
        'footer.left': fields['footer.left']?.value,
        'footer.right': fields['footer.right']?.value,
        language: fields.language?.value,
        organisation: fields.organisation?.value,
        title: fields.title?.value,
      },
    });
  });

  const data = useMemo(() => JSON.parse(blockJson) as Record<string, unknown>, [blockJson]);
  const sections = useMemo(() => JSON.parse(sectionsJson) as string[], [sectionsJson]);
  const chromeInput = useMemo(
    () =>
      JSON.parse(chromeInputJson) as {
        block?: Record<string, unknown>;
        fields: Record<string, unknown>;
      },
    [chromeInputJson],
  );
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!data?.blockType) {
      setResult(null);
      return;
    }

    const controller = new AbortController();
    async function renderPreview() {
      try {
        const res = await fetch('/api/slide-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            block: data,
            fields: chromeInput.fields,
            previewFieldPath: path,
            sections,
          }),
        });
        if (!res.ok) {
          setResult(null);
          return;
        }
        setResult((await res.json()) as PreviewResult);
      } catch {
        if (!controller.signal.aborted) setResult(null);
      }
    }

    void renderPreview();
    return () => controller.abort();
  }, [chromeInput.fields, data, path, sections]);

  if (!result) return null;
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
