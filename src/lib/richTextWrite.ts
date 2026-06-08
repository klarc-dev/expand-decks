import {
  convertMarkdownToLexical,
  editorConfigFactory,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical';
import type { Block, Field } from 'payload';
import type { Payload } from 'payload';

import { emitPayloadBlock } from '../blocks/spec/emit/emitPayloadBlock';
import { ALL_SPECS } from '../blocks/spec';

type RichPath = { name: string; arrayOf?: RichPath[] };

// Walk an emitted Payload field tree and collect the paths of every richText
// field (including those nested inside array fields). Driven by the SSOT emit
// output so it stays correct as blocks change.
function collectRichPaths(fields: Field[]): RichPath[] {
  const paths: RichPath[] = [];
  for (const field of fields) {
    const f = field as Field & { name?: string; type?: string; fields?: Field[] };
    if (!f.name) continue;
    if (f.type === 'richText') {
      paths.push({ name: f.name });
    } else if (f.type === 'array' && f.fields) {
      const nested = collectRichPaths(f.fields);
      if (nested.length) paths.push({ name: f.name, arrayOf: nested });
    }
  }
  return paths;
}

// blockType -> rich field paths, derived once from the emitted blocks.
const RICH_PATHS_BY_BLOCK: Record<string, RichPath[]> = Object.fromEntries(
  ALL_SPECS.map((spec): [string, RichPath[]] => {
    const block = emitPayloadBlock(spec) as Block;
    return [spec.blockType, collectRichPaths(block.fields)];
  }),
);

function toLexical(markdown: string, editorConfig: SanitizedServerEditorConfig): unknown {
  return convertMarkdownToLexical({ editorConfig, markdown });
}

function convertValue(
  value: unknown,
  paths: RichPath[],
  editorConfig: SanitizedServerEditorConfig,
): unknown {
  if (value == null || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  for (const path of paths) {
    const current = obj[path.name];
    if (current == null) continue;
    if (path.arrayOf) {
      if (Array.isArray(current)) {
        obj[path.name] = current.map((item) => convertValue(item, path.arrayOf!, editorConfig));
      }
    } else if (typeof current === 'string') {
      obj[path.name] = toLexical(current, editorConfig);
    }
  }
  return obj;
}

// Convert every richText field of every AI-generated slide from the LLM's
// markdown string to a Lexical editor state, in place. The minimal slide editor
// has no uploads/relationships, so the shared editor config converts faithfully.
export async function convertSlidesMarkdownToLexical<T extends { blockType?: string }>(
  slides: T[],
  payload: Payload,
): Promise<T[]> {
  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  return slides.map((slide) => {
    const paths = slide.blockType ? RICH_PATHS_BY_BLOCK[slide.blockType] : undefined;
    if (!paths || !paths.length) return slide;
    return convertValue(slide, paths, editorConfig) as T;
  });
}
