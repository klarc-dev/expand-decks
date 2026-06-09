import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

import { applyDefs } from './utils';

export type RichText = SerializedEditorState | null | undefined;

// Isomorphic: convertLexicalToHTML's runtime deps are escape-html + uuid +
// payload/shared (Payload's browser-safe bundle), so this bundles into the
// 'use client' preview AND runs in the server build job. Text nodes are already
// escaped by the converter — never escape() its output. applyDefs preserves the
// {{def:...}} footnote feature that authors type into rich-text fields.
export function richTextToHTML(data: RichText): string {
  if (!data) return '';
  return applyDefs(convertLexicalToHTML({ data }));
}
