import {
  convertMarkdownToLexical,
  editorConfigFactory,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical';
import type { SanitizedConfig } from 'payload';

import { SPEC_BY_TYPE } from '../blocks/spec';

function convertValue(
  value: unknown,
  paths: readonly string[][],
  editorConfig: SanitizedServerEditorConfig,
): unknown {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [...value] : { ...(value as Record<string, unknown>) };

  for (const [head, ...tail] of paths) {
    if (!head) continue;
    const current = (copy as Record<string, unknown>)[head];
    if (current == null) continue;

    if (tail.length === 0) {
      if (typeof current === 'string') {
        (copy as Record<string, unknown>)[head] = convertMarkdownToLexical({
          editorConfig,
          markdown: current,
        });
      }
      continue;
    }

    if (Array.isArray(current)) {
      (copy as Record<string, unknown>)[head] = current.map((item) =>
        convertValue(item, [tail], editorConfig),
      );
    } else {
      (copy as Record<string, unknown>)[head] = convertValue(current, [tail], editorConfig);
    }
  }

  return copy;
}

function richTextPaths(blockType: string): string[][] {
  const spec = SPEC_BY_TYPE.get(blockType);
  if (!spec) return [];

  const paths: string[][] = [];
  const visit = (fields: typeof spec.fields, prefix: string[]) => {
    for (const field of fields) {
      if (field.payload?.type === 'richText') paths.push([...prefix, field.name]);
      if (field.payload?.type === 'array' && field.payload.fields) {
        visit(field.payload.fields, [...prefix, field.name]);
      }
    }
  };
  visit(spec.fields, []);
  return paths;
}

/** Convert AI-facing markdown strings into render-facing Lexical states. */
export async function prepareSlidesForRender<T extends { blockType: string }>(
  slides: T[],
): Promise<T[]> {
  const editorConfig = await editorConfigFactory.default({
    config: { collections: [], globals: [] } as unknown as SanitizedConfig,
  });
  return slides.map(
    (slide) => convertValue(slide, richTextPaths(slide.blockType), editorConfig) as T,
  );
}
