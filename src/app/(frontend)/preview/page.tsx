import React from 'react';

// The (frontend) layout owns the html/body shell; rendering another shell here
// nests them — invalid DOM + React hydration mismatches.

/**
 * Bare /preview — reached only for new, unsaved presentations. Live preview is
 * document-aware (`livePreview.url` embeds the doc id → /preview/[id]), and a
 * doc with no id yet has nothing to preview. Saved docs never land here.
 */
export default function NewDocPreviewPage() {
  return (
    <div style={styles.wrapper}>
      <p style={styles.text}>
        Enregistrez d&apos;abord la pr&eacute;sentation pour activer l&apos;aper&ccedil;u en direct.
      </p>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1a1a2e',
    margin: 0,
  },
  text: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center' as const,
    padding: '2rem',
  },
} as const;
