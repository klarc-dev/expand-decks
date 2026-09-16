'use client';

import React from 'react';

import './DownloadIcon.scss';

/**
 * Download glyph in the vocabulary of Payload's own icons (20-unit viewBox,
 * square-capped `.stroke` path): a tray with an arrow pointing into it. Payload
 * ships no download icon, and reusing the document glyph read as "open".
 */
export function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[className, 'icon icon--download'].filter(Boolean).join(' ')}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="stroke"
        d="M4 13.3333V14.6667C4 15.0203 4.14048 15.3594 4.39052 15.6095C4.64057 15.8595 4.97971 16 5.33333 16H14.6667C15.0203 16 15.3594 15.8595 15.6095 15.6095C15.8595 15.3594 16 15.0203 16 14.6667V13.3333M10 4V12.3333M10 12.3333L6.66667 9M10 12.3333L13.3333 9"
        strokeLinecap="square"
      />
    </svg>
  );
}
