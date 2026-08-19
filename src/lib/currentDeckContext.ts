import {
  convertLexicalToMarkdown,
  editorConfigFactory,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical';
import type { Payload } from 'payload';

import type { Presentation } from '@/payload-types';

const MAX_CONTEXT_CHARS = 30_000;
const OMITTED_KEYS = new Set(['id', 'blockName']);

function readableValue(value: unknown, editorConfig: SanitizedServerEditorConfig): unknown {
  if (Array.isArray(value)) return value.map((item) => readableValue(item, editorConfig));
  if (value == null || typeof value !== 'object') return value;

  const object = value as Record<string, unknown>;
  if (object.root && typeof object.root === 'object') {
    return convertLexicalToMarkdown({ data: value as never, editorConfig });
  }

  return Object.fromEntries(
    Object.entries(object)
      .filter(([key, entry]) => !OMITTED_KEYS.has(key) && entry != null && entry !== '')
      .map(([key, entry]) => [key, readableValue(entry, editorConfig)]),
  );
}

/** Compact, human-readable snapshot supplied only to revision runs. */
export async function currentDeckContext(
  slides: Presentation['slides'],
  payload: Payload,
): Promise<string> {
  if (!Array.isArray(slides) || slides.length === 0) return '';

  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  const readable = slides.map((slide, index) => ({
    slide: index + 1,
    ...(readableValue(slide, editorConfig) as Record<string, unknown>),
  }));
  const serialized = JSON.stringify(readable, null, 2);
  return serialized.length <= MAX_CONTEXT_CHARS
    ? serialized
    : `${serialized.slice(0, MAX_CONTEXT_CHARS)}\n[CONTEXTE TRONQUÉ]`;
}
