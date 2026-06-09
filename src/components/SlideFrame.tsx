import React from 'react';

/** Dark stage background behind rendered slides. */
export const SLIDE_STAGE_BG = '#1a1a2e';

/**
 * Presentational inner slide frame shared by the admin SlidePreview and the
 * /preview page. Owns the `slidev-layout`/`k-cover` className, the standard
 * `3rem 4rem` slide padding, and the dangerouslySetInnerHTML wiring. Callers
 * pass their own sizing/decoration via `style` (merged after the padding so a
 * caller could override it, though both current call sites use 3rem 4rem).
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
