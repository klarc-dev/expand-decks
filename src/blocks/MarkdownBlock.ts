import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { markdownSpec } from './spec/markdown';

export const MarkdownBlock = emitPayloadBlock(markdownSpec);
