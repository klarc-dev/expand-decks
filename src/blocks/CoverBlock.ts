import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { coverSpec } from './spec/cover';

export const CoverBlock = emitPayloadBlock(coverSpec);
