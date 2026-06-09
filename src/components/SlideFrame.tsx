import React from 'react';

/** Dark stage background behind rendered slides. */
export const SLIDE_STAGE_BG = '#1a1a2e';

/**
 * Presentational inner slide frame used by the admin per-slide SlidePreview.
 * Owns the `slidev-layout`/`k-cover` className, the standard `3rem 4rem` slide
 * padding, and the dangerouslySetInnerHTML wiring. Callers pass their own
 * sizing/decoration via `style` (merged after the padding so a caller could
 * override it).
 */
export function SlideFrame({
  html,
  layout,
  style,
}: {
  html: string;
  layout: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`slidev-layout ${layout === 'cover' ? 'k-cover' : ''}`}
      style={{ padding: '3rem 4rem', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
