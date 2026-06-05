import type React from 'react';

/**
 * Shared admin-UI style objects used across the custom field components
 * (DraftFromBriefButton, ShareUrlField). Kept as plain React.CSSProperties
 * so the rendered DOM/styles stay byte-identical to the previous inline
 * objects.
 */

/** Red error box shown below a field after a failed request. */
export const errorBoxStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '10px',
  backgroundColor: 'var(--theme-error-50)',
  border: '1px solid var(--theme-error-500)',
  borderRadius: '4px',
  color: 'var(--theme-error-500)',
  fontSize: '13px',
};

/** Dashed hint box shown when a feature needs a saved document first. */
export const dashedHintStyle: React.CSSProperties = {
  padding: '12px 16px',
  marginBottom: '20px',
  border: '1px dashed var(--theme-elevation-150)',
  borderRadius: '4px',
  color: 'var(--theme-elevation-500)',
  fontSize: '13px',
};

/**
 * Card panel chrome. Note: padding intentionally omitted — call sites differ
 * (20px vs 16px) and spread their own padding on top.
 */
export const panelStyle: React.CSSProperties = {
  marginBottom: '20px',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  backgroundColor: 'var(--theme-elevation-50)',
};

/** Recurring muted helper-text style. */
export const mutedTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--theme-elevation-500)',
};

/**
 * Green primary action button. padding/fontSize/cursor are intentionally
 * omitted — call sites differ (10px 20px vs 8px 16px, 14px vs 13px, and
 * distinct disabled-cursor logic) and add those on top.
 */
export function primaryButtonStyle(loading: boolean): React.CSSProperties {
  return {
    backgroundColor: loading ? 'var(--theme-elevation-200)' : 'var(--theme-success-500)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 600,
  };
}
