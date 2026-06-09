'use client';

import React from 'react';
import { useRowLabel } from '@payloadcms/ui';

/**
 * Collapsed-header label for slide blocks. Derives the label from the block's
 * own `title` field so the Contenu tab reads as a slide outline instead of a
 * column of "Untitled". Falls back to the slide number when a block has no
 * title yet (e.g. a freshly added block before the author types).
 *
 * Wired by emitPayloadBlock as `admin.components.Label` on every block that has
 * a `title` field.
 */
export default function SlideRowLabel() {
  const { data, rowNumber } = useRowLabel<{ title?: string }>();
  const n = String((rowNumber ?? 0) + 1).padStart(2, '0');
  const title = data?.title?.trim();
  return <span>{title ? `${n} — ${title}` : `Diapositive ${n}`}</span>;
}
