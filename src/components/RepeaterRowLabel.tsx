'use client';

import React from 'react';
import { useRowLabel } from '@payloadcms/ui';

// Field names, in priority order, that make a good row label for a repeater
// item. Covers every array field across the block specs: cards (`title`),
// timeline steps (`label`), table columns (`header`), stats (`value`), quotes
// (`authorName`), table cells (`content`). Plain-text fields only — rich-text
// values are Lexical objects, not strings, so they're skipped.
const LABEL_FIELDS = [
  'title',
  'label',
  'header',
  'value',
  'authorName',
  'name',
  'content',
  'text',
] as const;

/**
 * Generic collapsed-header label for any repeater (array) item. Derives the
 * label from the item's own most meaningful text field so every repeater reads
 * as a named list instead of "Card 01 / Column 01 / Row 01". Falls back to the
 * row number when no text field has a value yet.
 *
 * Wired by emitPayloadBlock as `admin.components.RowLabel` on every array field.
 */
export default function RepeaterRowLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>();
  const n = String((rowNumber ?? 0) + 1).padStart(2, '0');

  for (const key of LABEL_FIELDS) {
    const v = data?.[key];
    if (typeof v === 'string' && v.trim()) return <span>{`${n} — ${v.trim()}`}</span>;
  }
  return <span>{n}</span>;
}
